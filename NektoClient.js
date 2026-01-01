/**
 * NektoClient - API Wrapper for UserScripts
 * Author: Gemini Partner
 */
class NektoClient {
    constructor() {
        this.baseUrl = 'https://nekto.me/api/action';
        this.chatId = null;
        this.myId = null; // ID текущей сессии
        this.lastMsgId = 0;
        this.pollingInterval = null;
        this.callbacks = {
            onMessage: [],
            onConnect: [],
            onDisconnect: [],
            onTyping: []
        };
        this.isSearching = false;
    }

    // --- Events ---
    on(event, callback) {
        if (this.callbacks[event]) this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        if (this.callbacks[event]) this.callbacks[event].forEach(cb => cb(data));
    }

    // --- API Methods ---
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
            return null;
        }
    }

    // --- Actions ---
    async startSearch(params = {}) {
        if (this.isSearching) return;
        this.isSearching = true;
        this.stopChat(); // Close current if exists

        const defaultParams = {
            mysex: 'M', myselage: '22',
            sex: 'F', age_from: '18', age_to: '25',
            wish: []
        };
        const payload = { ...defaultParams, ...params };

        // 1. Init Search
        await this._request('search_company', payload);

        // 2. Start Polling for connection
        this._startPolling();
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

    stopChat() {
        if (this.chatId) {
            this._request('close_dialog', { dialogId: this.chatId });
        }
        this._resetState();
    }

    // --- Internals ---
    _resetState() {
        this.chatId = null;
        this.lastMsgId = 0;
        this.isSearching = false;
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = null;
    }

    _startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(async () => {
            const res = await this._request('read_messages', {
                lastMsgId: this.lastMsgId
            });

            if (!res) return;

            // 1. Check Connection
            if (res.dialogId) {
                if (this.chatId !== res.dialogId) {
                    this.chatId = res.dialogId;
                    this.myId = res.id; // Usually returns internal user ID
                    this.isSearching = false;
                    this.trigger('onConnect', this.chatId);
                }
            }

            // 2. Check Disconnect
            if (res.notice === 'leaved' || res.status === 'closed') {
                this.stopChat(); // Reset local state
                this.trigger('onDisconnect');
                return;
            }

            // 3. Process Messages
            if (res.messages && Array.isArray(res.messages)) {
                res.messages.forEach(msg => {
                    const mId = parseInt(msg.id);
                    if (mId > this.lastMsgId) {
                        this.lastMsgId = mId;

                        // Detect sender: msg.senderId (API usually gives this)
                        // If logic requires filtering self messages, do it here.
                        // Assuming msg.senderId !== this.myId (needs verification on live site)

                        // Simple heuristic: if we just sent it, we might ignore it in UI handlers
                        // But strictly for the library, we just emit everything.

                        this.trigger('onMessage', {
                            id: mId,
                            text: msg.message || msg.content,
                            senderId: msg.senderId,
                            raw: msg
                        });
                    }
                });
            }
        }, 1500); // Poll every 1.5s
    }
}
