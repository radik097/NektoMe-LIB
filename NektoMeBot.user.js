// ==UserScript==
// @name         NektoMe Bot v11.0: Ultimate UI
// @version      11.0
// @description  Красивый интерфейс, анимации, детальные настройки. Работает на NektoClient v4.0.
// @author       Gemini Partner
// @match        https://nekto.me/chat/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js
// @require      https://raw.githubusercontent.com/radik097/nektome-lib/refs/heads/main/NektoClient.js?v=4.1
// ==/UserScript==

(function() {
    'use strict';

    // --- ПРОВЕРКА БИБЛИОТЕКИ ---
    if (typeof NektoClient === 'undefined') {
        alert('Ошибка: NektoClient не загружен! Проверьте интернет или GitHub.');
        return;
    }

    // --- КОНФИГУРАЦИЯ (Сохранение настроек) ---
    const SETTINGS = {
        replyText: GM_getValue('replyText', "Привет! 👋\nМ или Ж?"),
        autoNext: GM_getValue('autoNext', true),
        replyDelay: GM_getValue('replyDelay', 1500),
        searchDelay: GM_getValue('searchDelay', 2000),
    };

    // Статистика сессии
    const STATS = {
        chats: 0,
        messagesSent: 0
    };

    const client = new NektoClient();
    let hasReplied = false;

    // --- CSS СТИЛИ (Glassmorphism + Animations) ---
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

        /* Кнопка открытия */
        #nm-toggle-btn {
            position: fixed; top: 100px; right: 20px; width: 50px; height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%; box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4);
            cursor: pointer; z-index: 99999; display: flex; align-items: center; justify-content: center;
            font-size: 24px; color: white; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 2px solid rgba(255,255,255,0.2);
        }
        #nm-toggle-btn:hover { transform: scale(1.1) rotate(15deg); }

        /* Основная панель */
        #nm-panel {
            position: fixed; top: 100px; right: -350px; width: 320px;
            background: rgba(30, 30, 46, 0.85); backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px; padding: 20px; z-index: 99998;
            font-family: 'Poppins', sans-serif; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            display: flex; flex-direction: column; gap: 15px;
        }

        /* Элементы UI */
        .nm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .nm-title { font-weight: 600; font-size: 18px; background: linear-gradient(to right, #a18cd1, #fbc2eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .nm-status-badge {
            font-size: 10px; padding: 4px 8px; border-radius: 12px;
            background: rgba(255,255,255,0.1); text-transform: uppercase; font-weight: 600; letter-spacing: 1px;
            transition: all 0.3s;
        }
        .st-idle { color: #a6adc8; border: 1px solid #a6adc8; }
        .st-active { color: #a6e3a1; border: 1px solid #a6e3a1; box-shadow: 0 0 10px rgba(166, 227, 161, 0.3); }
        .st-stop { color: #f38ba8; border: 1px solid #f38ba8; }

        .nm-input-group { display: flex; flex-direction: column; gap: 5px; }
        .nm-label { font-size: 12px; color: #cdd6f4; opacity: 0.8; display: flex; justify-content: space-between; }
        
        textarea {
            width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
            color: #fff; border-radius: 10px; padding: 10px; min-height: 70px;
            font-family: 'Poppins', sans-serif; font-size: 12px; resize: vertical;
            outline: none; transition: border 0.2s;
        }
        textarea:focus { border-color: #89b4fa; }

        input[type=range] { width: 100%; cursor: pointer; accent-color: #89b4fa; margin-top: 5px; }

        .nm-checkbox {
            display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer;
            padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; transition: background 0.2s;
        }
        .nm-checkbox:hover { background: rgba(255,255,255,0.1); }

        .nm-stats-row { display: flex; justify-content: space-around; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 10px; margin-top: 5px; }
        .nm-stat-item { text-align: center; font-size: 11px; color: #a6adc8; }
        .nm-stat-val { display: block; font-size: 14px; font-weight: 600; color: #fff; }

        .nm-controls { display: flex; gap: 10px; margin-top: 10px; }
        .nm-btn {
            flex: 1; padding: 12px; border: none; border-radius: 12px;
            font-weight: 600; cursor: pointer; font-size: 14px;
            transition: transform 0.1s, opacity 0.2s;
            color: #1e1e2e;
        }
        .nm-btn:active { transform: scale(0.95); }
        .btn-start { background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%); }
        .btn-stop { background: linear-gradient(135deg, #f38ba8 0%, #eba0ac 100%); display: none; }
        .btn-next { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); }
        .btn-next:hover { background: rgba(255,255,255,0.2); }

    `);

    // --- HTML СТРУКТУРА ---
    const root = document.createElement('div');
    root.innerHTML = `
        <div id="nm-toggle-btn">🤖</div>
        <div id="nm-panel">
            <div class="nm-header">
                <span class="nm-title">Bot Ultimate</span>
                <span id="nm-status" class="nm-status-badge st-idle">IDLE</span>
            </div>

            <div class="nm-stats-row">
                <div class="nm-stat-item"><span class="nm-stat-val" id="st-chats">0</span>Chats</div>
                <div class="nm-stat-item"><span class="nm-stat-val" id="st-msgs">0</span>Sent</div>
            </div>

            <div class="nm-input-group">
                <div class="nm-label">Первое сообщение</div>
                <textarea id="nm-text" placeholder="Введите текст...">${SETTINGS.replyText}</textarea>
            </div>

            <div class="nm-input-group">
                <div class="nm-label">Задержка ответа: <span id="val-reply">${SETTINGS.replyDelay}</span>ms</div>
                <input type="range" id="rng-reply" min="100" max="5000" step="100" value="${SETTINGS.replyDelay}">
            </div>

            <div class="nm-input-group">
                <div class="nm-label">Задержка поиска: <span id="val-search">${SETTINGS.searchDelay}</span>ms</div>
                <input type="range" id="rng-search" min="500" max="5000" step="100" value="${SETTINGS.searchDelay}">
            </div>

            <label class="nm-checkbox">
                <input type="checkbox" id="chk-auto" ${SETTINGS.autoNext ? 'checked' : ''}>
                <span>Авто-поиск следующего (Auto Next)</span>
            </label>

            <div class="nm-controls">
                <button id="btn-start" class="nm-btn btn-start">ЗАПУСК</button>
                <button id="btn-stop" class="nm-btn btn-stop">СТОП</button>
                <button id="btn-skip" class="nm-btn btn-next">SKIP ⏩</button>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // --- DOM ЭЛЕМЕНТЫ ---
    const UI = {
        toggle: document.getElementById('nm-toggle-btn'),
        panel: document.getElementById('nm-panel'),
        status: document.getElementById('nm-status'),
        text: document.getElementById('nm-text'),
        chkAuto: document.getElementById('chk-auto'),
        rngReply: document.getElementById('rng-reply'),
        rngSearch: document.getElementById('rng-search'),
        valReply: document.getElementById('val-reply'),
        valSearch: document.getElementById('val-search'),
        btnStart: document.getElementById('btn-start'),
        btnStop: document.getElementById('btn-stop'),
        btnSkip: document.getElementById('btn-skip'),
        stChats: document.getElementById('st-chats'),
        stMsgs: document.getElementById('st-msgs')
    };

    // --- АНИМАЦИЯ И ЛОГИКА UI ---
    let isPanelOpen = false;

    UI.toggle.onclick = () => {
        isPanelOpen = !isPanelOpen;
        anime({
            targets: UI.panel,
            right: isPanelOpen ? 20 : -350,
            duration: 600,
            easing: 'easeOutElastic(1, .6)'
        });
        anime({
            targets: UI.toggle,
            rotate: isPanelOpen ? 180 : 0,
            duration: 600
        });
    };

    // Обновление значений слайдеров
    UI.rngReply.oninput = (e) => {
        SETTINGS.replyDelay = parseInt(e.target.value);
        UI.valReply.innerText = SETTINGS.replyDelay;
        GM_setValue('replyDelay', SETTINGS.replyDelay);
    };
    UI.rngSearch.oninput = (e) => {
        SETTINGS.searchDelay = parseInt(e.target.value);
        UI.valSearch.innerText = SETTINGS.searchDelay;
        GM_setValue('searchDelay', SETTINGS.searchDelay);
    };
    UI.text.oninput = (e) => {
        SETTINGS.replyText = e.target.value;
        GM_setValue('replyText', SETTINGS.replyText);
    };
    UI.chkAuto.onchange = (e) => {
        SETTINGS.autoNext = e.target.checked;
        GM_setValue('autoNext', SETTINGS.autoNext);
    };

    // Обновление статуса
    const setStatus = (state, text) => {
        UI.status.innerText = text;
        UI.status.className = `nm-status-badge st-${state}`;
        if (state === 'active') {
            UI.btnStart.style.display = 'none';
            UI.btnStop.style.display = 'block';
        } else {
            UI.btnStart.style.display = 'block';
            UI.btnStop.style.display = 'none';
        }
    };

    // --- ЛОГИКА БОТА ---

    UI.btnStart.onclick = () => {
        client.start(); //
        setStatus('active', 'SEARCHING...');
    };

    UI.btnStop.onclick = () => {
        client.stop(); //
        setStatus('stop', 'STOPPED');
    };

    UI.btnSkip.onclick = () => {
        client.skip(); //
        STATS.chats++;
        UI.stChats.innerText = STATS.chats;
    };

    // --- СОБЫТИЯ БИБЛИОТЕКИ ---

    client.on('onConnect', (chatId) => {
        console.log('[Bot] Connected:', chatId);
        setStatus('active', 'CHATTING');
        hasReplied = false;
        STATS.chats++;
        UI.stChats.innerText = STATS.chats;
        
        // Анимация бейджика
        anime({
            targets: UI.status,
            scale: [1, 1.2, 1],
            duration: 400
        });
    });

    client.on('onDisconnect', () => {
        console.log('[Bot] Disconnected');
        
        if (SETTINGS.autoNext) {
            setStatus('active', `NEXT IN ${SETTINGS.searchDelay/1000}s`);
            setTimeout(() => {
                if (client.isRunning) {
                    client.skip();
                    setStatus('active', 'SEARCHING...');
                }
            }, SETTINGS.searchDelay);
        } else {
            client.stop();
            setStatus('idle', 'FINISHED');
        }
    });

    client.on('onMessage', (msg) => {
        if (!msg.isSelf && !hasReplied) {
            console.log('[Bot] Incoming msg. Preparing reply...');
            hasReplied = true;
            
            setStatus('active', 'TYPING...');
            
            setTimeout(() => {
                if (client.isRunning) {
                    client.sendMessage(SETTINGS.replyText); //
                    STATS.messagesSent++;
                    UI.stMsgs.innerText = STATS.messagesSent;
                    setStatus('active', 'SENT');
                }
            }, SETTINGS.replyDelay);
        }
    });

    client.on('onStatusChange', (status) => {
        // Синхронизация статусов библиотеки с UI (опционально)
        if (status === 'SEARCHING') setStatus('active', 'SEARCHING');
    });

})();
