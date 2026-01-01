/**
 * NektoClient - API Wrapper for UserScripts
 * Version: 3.1 (Fix: Correct API Endpoint 405 Error)
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
        data.action = action; // Action is passed in BODY, not URL
        const formData = new URLSearchParams();
        for (const key in data) formData.append(key, data[key]);

        try {
            // FIX: Request goes to constant baseUrl, not baseUrl/action
            const res = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            // Handle non-JSON responses (like 405/500 HTML errors)
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error(`[NektoClient] Invalid JSON response for ${action}:`, text.substring(0, 100));
                throw new Error('Server returned invalid JSON (possibly 405/500 error)');
            }
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

    async startSearch(params = {}) {
        this.stop(); 
        this.isSearching = true;

        const defaultParams = {
            mySex: 'M',
            myAge: 22,
            wishSex: 'F',
            wishAges: ['1'],
            topic: 'adult'
        };

        const effectiveParams = Object.keys(params).length > 0 
            ? { ...defaultParams, ...params }
            : (this.lastParams || defaultParams);

        this.lastParams = effectiveParams;

        const myAgeId = this._getAgeId(effectiveParams.myAge);
        let selage = '1';
        if (Array.isArray(effectiveParams.wishAges)) {
            selage = effectiveParams.wishAges.join(',');
        } else {
            selage = String(effectiveParams.wishAges);
        }

        const payload = {
            mysex: effectiveParams.mySex,
            myselage: myAgeId, 
            sex: effectiveParams.wishSex,
            selage: selage,
            topic: effectiveParams.topic,
            wish: [] 
        };

        console.log('[NektoClient] Searching:', payload);

        // 1. Send Search Request
        await this._request('search_company', payload);
        
        // 2. Start Polling Loop
        this._startPolling();
    }

    async next() {
        if (!this.lastParams) {
            console.warn('[NektoClient] No previous settings found. Using defaults.');
        }
        await this.startSearch(this.lastParams || {});
    }

    async sendMessage(text) {
        if (!this.chatId) return false;
        await this._request('send_message', {
            dialogId: this.chatId,
            content: text,
            msgType: 1
        });
        return true;
    }

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
                this.chatId = null;
                this.trigger('onDisconnect');
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
