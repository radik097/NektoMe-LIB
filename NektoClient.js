/**
 * NektoClient - DOM Driver for UserScripts
 * Version: 4.0 (DOM Manipulation & Event Emitter)
 * Author: Gemini Partner
 */
class NektoClient {
    constructor() {
        this.isRunning = false;
        this.observer = null;
        this.searchTimer = null;
        
        // State tracking
        this.isInChat = false;
        this.lastMsgCount = 0;

        this.callbacks = {
            onConnect: [],
            onDisconnect: [],
            onMessage: [],
            onStatusChange: []
        };

        // DOM Selectors Configuration
        this.DOM = {
            input: '.emojionearea-editor',
            sendBtn: '#sendMessageBtn',
            startBtn: '#searchCompanyBtn',
            nextBtns: 'button, .talk_over_button', // Кнопки "Начать новый", "Искать"
            msgBlock: '.mess_block',
            chatStatus: '.window_chat_statuss',
            endScreen: '.status-end',
            selfMsgClass: 'self'
        };
    }

    // --- Event System ---
    on(event, callback) {
        if (this.callbacks[event]) this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        if (this.callbacks[event]) this.callbacks[event].forEach(cb => cb(data));
    }

    // --- Control Methods ---

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._startObserver();
        this.trigger('onStatusChange', 'SEARCHING');
        
        // Если мы не в чате, нажимаем старт/далее
        if (!this._isVisible(document.querySelector(this.DOM.chatStatus))) {
            this.skip(); 
        }
    }

    stop() {
        this.isRunning = false;
        if (this.observer) this.observer.disconnect();
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.trigger('onStatusChange', 'IDLE');
    }

    /**
     * Ищет следующего собеседника (нажимает кнопки пропуска/поиска)
     */
    skip() {
        const buttons = Array.from(document.querySelectorAll(this.DOM.nextBtns));
        
        // 1. ПРИОРИТЕТ: Ищем кнопку "Начать новый чат" или "Искать собеседника"
        // Это предотвращает клик по кнопке "Изменить параметры", которая идет первой в DOM
        let target = buttons.find(b => {
            const txt = b.innerText.toLowerCase();
            return this._isVisible(b) && (txt.includes('новый') || txt.includes('искать'));
        });

        // 2. ЗАПАСНОЙ ВАРИАНТ: Если кнопки "Новый" нет, пробуем другие (например, "Изменить")
        // Используем это только если основной кнопки нет
        if (!target) {
            target = buttons.find(b => {
                const txt = b.innerText.toLowerCase();
                return this._isVisible(b) && txt.includes('изменить');
            });
        }

        if (target) {
            console.log('[NektoClient] Clicking button:', target.innerText);
            target.click();
            return true;
        }

        // 3. Кнопка на главной странице (если мы вылетели в меню)
        const mainStart = document.querySelector(this.DOM.startBtn);
        if (this._isVisible(mainStart)) {
            mainStart.click();
            return true;
        }
        
        return false;
    }

    /**
     * Сложная имитация ввода текста с событиями клавиатуры
     */
    async sendMessage(text) {
        const editor = document.querySelector(this.DOM.input);
        const btn = document.querySelector(this.DOM.sendBtn);
        
        if (!editor || !btn) return false;

        editor.focus();
        editor.innerHTML = text.replace(/\n/g, '<br>'); // Вставляем HTML
        
        // Эмуляция событий, чтобы React/Vue/JQuery на сайте поняли, что текст изменился
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Небольшая задержка перед кликом
        await new Promise(r => setTimeout(r, 200));
        
        if (!btn.classList.contains('disabled')) {
            btn.click();
            return true;
        }
        return false;
    }

    // --- Internals ---

    _isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    _startObserver() {
        this.observer = new MutationObserver(() => this._scanDOM());
        this.observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }

    _scanDOM() {
        if (!this.isRunning) return;

        // 1. Проверка: ЧАТ ЗАВЕРШЕН?
        const endScreen = document.querySelector(this.DOM.endScreen);
        if (endScreen && this._isVisible(endScreen)) {
            if (this.isInChat) {
                this.isInChat = false;
                this.trigger('onDisconnect');
                this.trigger('onStatusChange', 'DISCONNECTED');
            }
            return; // Дальше не проверяем сообщения, если чат мертв
        }

        // 2. Проверка: МЫ В ЧАТЕ?
        const statusLine = document.querySelector(this.DOM.chatStatus);
        const inChatNow = statusLine && this._isVisible(statusLine);

        if (inChatNow && !this.isInChat) {
            // Только что соединились
            this.isInChat = true;
            this.lastMsgCount = 0; // Сброс счетчика
            
            // Получаем ID чата из DOM (иногда он есть в атрибутах) или просто генерируем timestamp
            const chatId = Date.now().toString().slice(-6); 
            this.trigger('onConnect', chatId);
            this.trigger('onStatusChange', 'CHATTING');
        }

        // 3. Обработка сообщений
        if (this.isInChat) {
            const msgs = document.querySelectorAll(this.DOM.msgBlock);
            if (msgs.length > this.lastMsgCount) {
                // Нашли новые сообщения
                for (let i = this.lastMsgCount; i < msgs.length; i++) {
                    const msgEl = msgs[i];
                    const isMe = msgEl.classList.contains(this.DOM.selfMsgClass);
                    const text = msgEl.innerText;

                    this.trigger('onMessage', {
                        text: text,
                        isSelf: isMe,
                        id: i
                    });
                }
                this.lastMsgCount = msgs.length;
            }
        }
    }
}
