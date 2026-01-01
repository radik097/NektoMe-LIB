/**
 * NektoClient - API Wrapper for UserScripts
 * Version: 3.0 (Added caching and next() method)
 * Author: Gemini Partner & Radik
 * Repository: https://github.com/radik097/NektoMe-LIB
 */
class NektoClient {
    constructor() {
        this.baseUrl = 'https://nekto.me/api/action';
        this.chatId = null;
        this.myId = null;
        this.lastMsgId = 0;
        this.pollingInterval = null;
        
        // Cache for search settings
        this.lastParams = null; 
        
        this.isSearching = false;
        
        this.callbacks = {
            onMessage: [],
            onConnect: [],
            onDisconnect: [],
            onTyping: [],
            onError: []
        };
    }

    // --- Events System ---
    on(event, callback) {
        if (this.callbacks[event]) this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        if (this.callbacks[event]) this.callbacks[event].forEach(cb => cb(data));
    }

    // --- Low Level API ---
    async _request(action, data = {}) {
        data.action = action;
        const formData = new URLSearchParams();
        for (const key in data) formData.append(key, data[key]);

        try {
            const res = await fetch(`${this.baseUrl}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });
            return await res.json();
        } catch (e) {
            console.error(`NektoClient Error [${action}]:`, e);
            this.trigger('onError', e);
            return null;
        }
    }

    _getAgeId(age) {
        age = parseInt(age);
        if (age >= 18 && age <= 25) return '1';
        if (age >= 26 && age <= 35) return '2';
        if (age >= 36) return '3';
        return '1';
    }

    // --- Main Actions ---

    /**
     * Start a NEW search with specific parameters.
     * Saves these parameters for future .next() calls.
     */
    async startSearch(params = {}) {
        // Stop any active processes
        this.stop(); 
        this.isSearching = true;

        // Prepare defaults or use cached params if partial
        const defaultParams = {
            mySex: 'M',
            myAge: 22,
            wishSex: 'F',
            wishAges: ['1'],
            topic: 'adult'
        };

        // If params provided, merge with defaults. If empty, use lastParams or defaults.
        const effectiveParams = Object.keys(params).length > 0 
            ? { ...defaultParams, ...params }
            : (this.lastParams || defaultParams);

        // Cache for next() calls
        this.lastParams = effectiveParams;

        // Convert params to API format
        const myAgeId = this._getAgeId(effectiveParams.myAge);
        let selage = '1';
        if (Array.isArray(effectiveParams.wishAges)) {
            selage = effectiveParams.wishAges.join(',');
        } else {
            selage = String(effectiveParams.wishAges);
        }

        const payload = {
            action: 'search_company',
            mysex: effectiveParams.mySex,
            myselage: myAgeId, 
            sex: effectiveParams.wishSex,
            selage: selage,
            topic: effectiveParams.topic,
            wish: [] 
        };

        console.log('[NektoClient] Searching:', payload);

        // 1. Send Search Request
        const res = await this._request('search_company', payload);
        
        // 2. Start Polling Loop
        this._startPolling();
    }

    /**
     * Stop current chat/search and find NEXT partner using cached settings.
     */
    async next() {
        if (!this.lastParams) {
            console.warn('[NektoClient] No previous settings found. Using defaults.');
        }
        await this.startSearch(this.lastParams || {});
    }

    /**
     * Send a text message
     */
    async sendMessage(text) {
        if (!this.chatId) return false;
        await this._request('send_message', {
            dialogId: this.chatId,
            content: text,
            msgType: 1
        });
        return true;
    }

    /**
     * Stop everything: disconnect chat and stop searching.
     */
    stop() {
        this.isSearching = false;
        if (this.chatId) {
            this._request('close_dialog', { dialogId: this.chatId });
        }
        this._resetState();
    }

    // --- Internals ---
    _resetState() {
        this.chatId = null;
        this.lastMsgId = 0;
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = null;
    }

    _startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        
        this.pollingInterval = setInterval(async () => {
            if (!this.isSearching && !this.chatId) return;

            const res = await this._request('read_messages', {
                lastMsgId: this.lastMsgId
            });

            if (!res) return;

            // 1. Connection Found
            if (res.dialogId) {
                if (this.chatId !== res.dialogId) {
                    this.chatId = res.dialogId;
                    this.myId = res.id;
                    this.isSearching = false;
                    this.trigger('onConnect', this.chatId);
                }
            }

            // 2. Partner Left / Chat Closed
            if (res.notice === 'leaved' || res.status === 'closed') {
                this.chatId = null; // Don't call stop() here fully, just reset chat ID
                this.trigger('onDisconnect');
                // Don't auto-search here inside lib, let the main script decide via .next()
                return;
            }

            // 3. New Messages
            if (res.messages && Array.isArray(res.messages)) {
                res.messages.forEach(msg => {
                    const mId = parseInt(msg.id);
                    if (mId > this.lastMsgId) {
                        this.lastMsgId = mId;
                        this.trigger('onMessage', {
                            id: mId,
                            text: msg.message || msg.content,
                            senderId: msg.senderId || msg.authId,
                            raw: msg
                        });
                    }
                });
            }
        }, 1500); 
    }
}
