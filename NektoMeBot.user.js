// ==UserScript==
// @name         NektoMe Bot v12.0: Draggable & Filters
// @version      12.0
// @description  Плавающее меню, настройка фильтров поиска, авто-ответ.
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

    if (typeof NektoClient === 'undefined') {
        alert('NektoClient lib not loaded!');
        return;
    }

    // --- НАСТРОЙКИ (Default) ---
    const SETTINGS = {
        replyText: GM_getValue('replyText', "Привет! 👋"),
        autoNext: GM_getValue('autoNext', true),
        mySex: GM_getValue('mySex', 'M'),
        wishSex: GM_getValue('wishSex', 'F'),
        topic: GM_getValue('topic', 'adult'), // adult, normal
        posX: GM_getValue('posX', '20px'),
        posY: GM_getValue('posY', '80px')
    };

    const client = new NektoClient();
    let hasReplied = false;

    // --- CSS: СТИЛЬНО И НЕЗАВИСИМО ---
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap');

        #nm-root {
            position: fixed; z-index: 2147483647; font-family: 'Montserrat', sans-serif;
            top: ${SETTINGS.posY}; left: ${SETTINGS.posX};
        }

        /* Кнопка-открывашка (скрыта когда панель открыта) */
        #nm-toggle {
            width: 45px; height: 45px; background: #1e1e2e; border: 2px solid #89b4fa;
            border-radius: 50%; color: #89b4fa; font-size: 20px;
            display: flex; align-items: center; justify-content: center; cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5); transition: transform 0.2s;
        }
        #nm-toggle:hover { transform: scale(1.1); color: #fff; border-color: #fff; }

        /* Основная панель */
        #nm-panel {
            width: 300px; background: rgba(24, 24, 37, 0.95);
            backdrop-filter: blur(10px); border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            display: none; flex-direction: column; overflow: hidden;
        }

        /* Шапка (Drag Handle) */
        .nm-header {
            padding: 12px 15px; background: linear-gradient(90deg, #313244, #1e1e2e);
            display: flex; justify-content: space-between; align-items: center;
            cursor: grab; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .nm-header:active { cursor: grabbing; }
        .nm-title { font-weight: 700; font-size: 14px; color: #cdd6f4; }
        .nm-close { cursor: pointer; color: #f38ba8; font-weight: bold; }

        /* Контент */
        .nm-content { padding: 15px; display: flex; flex-direction: column; gap: 10px; }

        /* Группы настроек */
        .nm-group { display: flex; gap: 5px; }
        .nm-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .nm-label { font-size: 10px; color: #a6adc8; text-transform: uppercase; font-weight: bold; }

        select, textarea, input[type=text] {
            background: #11111b; border: 1px solid #45475a; color: #cdd6f4;
            padding: 6px; border-radius: 6px; font-size: 11px; font-family: inherit;
            outline: none; width: 100%; box-sizing: border-box;
        }
        select:focus, textarea:focus { border-color: #89b4fa; }

        textarea { min-height: 60px; resize: vertical; }

        /* Чекбокс */
        .nm-chk-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cdd6f4; cursor: pointer; }
        .nm-chk-row input { accent-color: #89b4fa; }

        /* Кнопки */
        .nm-btns { display: flex; gap: 8px; margin-top: 5px; }
        .nm-btn {
            flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 700;
            cursor: pointer; font-size: 12px; transition: opacity 0.2s; color: #11111b;
        }
        .nm-btn:hover { opacity: 0.9; }
        .btn-start { background: #a6e3a1; }
        .btn-stop { background: #f38ba8; display: none; }
        .btn-skip { background: #fab387; }

        /* Статус */
        .nm-status-bar {
            font-size: 10px; text-align: center; padding: 4px; margin-top: 5px;
            border-radius: 4px; background: #313244; color: #a6adc8;
        }
        .st-active { color: #a6e3a1; border: 1px solid #a6e3a1; }
    `);

    // --- HTML ---
    const root = document.createElement('div');
    root.id = 'nm-root';
    root.innerHTML = `
        <div id="nm-toggle">⚙️</div>
        <div id="nm-panel">
            <div class="nm-header" id="nm-drag">
                <span class="nm-title">NektoMe Bot v12</span>
                <span class="nm-close" id="nm-hide">✖</span>
            </div>
            <div class="nm-content">
                
                <div class="nm-group">
                    <div class="nm-col">
                        <label class="nm-label">Я</label>
                        <select id="nm-my-sex">
                            <option value="M">Парень</option>
                            <option value="F">Девушка</option>
                        </select>
                    </div>
                    <div class="nm-col">
                        <label class="nm-label">Ищу</label>
                        <select id="nm-wish-sex">
                            <option value="F">Девушку</option>
                            <option value="M">Парня</option>
                        </select>
                    </div>
                </div>

                <div class="nm-col">
                    <label class="nm-label">Тема</label>
                    <select id="nm-topic">
                        <option value="adult">Пошлое (18+)</option>
                        <option value="normal">Обычное</option>
                    </select>
                </div>

                <hr style="border: 0; border-top: 1px solid #45475a; width: 100%;">

                <div class="nm-col">
                    <label class="nm-label">Авто-ответ</label>
                    <textarea id="nm-text">${SETTINGS.replyText}</textarea>
                </div>

                <label class="nm-chk-row">
                    <input type="checkbox" id="nm-auto" ${SETTINGS.autoNext ? 'checked' : ''}>
                    Авто-поиск (Auto Next)
                </label>

                <div class="nm-status-bar" id="nm-status">IDLE</div>

                <div class="nm-btns">
                    <button id="btn-start" class="nm-btn btn-start">START</button>
                    <button id="btn-stop" class="nm-btn btn-stop">STOP</button>
                    <button id="btn-skip" class="nm-btn btn-skip">SKIP</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // --- DOM Elements ---
    const UI = {
        root: document.getElementById('nm-root'),
        toggle: document.getElementById('nm-toggle'),
        panel: document.getElementById('nm-panel'),
        drag: document.getElementById('nm-drag'),
        hide: document.getElementById('nm-hide'),
        mySex: document.getElementById('nm-my-sex'),
        wishSex: document.getElementById('nm-wish-sex'),
        topic: document.getElementById('nm-topic'),
        text: document.getElementById('nm-text'),
        auto: document.getElementById('nm-auto'),
        start: document.getElementById('btn-start'),
        stop: document.getElementById('btn-stop'),
        skip: document.getElementById('btn-skip'),
        status: document.getElementById('nm-status')
    };

    // Restore Selects
    UI.mySex.value = SETTINGS.mySex;
    UI.wishSex.value = SETTINGS.wishSex;
    UI.topic.value = SETTINGS.topic;

    // --- DRAG & DROP LOGIC ---
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    UI.drag.onmousedown = (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - UI.root.offsetLeft;
        dragOffset.y = e.clientY - UI.root.offsetTop;
        UI.drag.style.cursor = 'grabbing';
    };

    document.onmousemove = (e) => {
        if (!isDragging) return;
        const newLeft = e.clientX - dragOffset.x;
        const newTop = e.clientY - dragOffset.y;
        
        UI.root.style.left = newLeft + 'px';
        UI.root.style.top = newTop + 'px';
    };

    document.onmouseup = () => {
        if (isDragging) {
            isDragging = false;
            UI.drag.style.cursor = 'grab';
            // Save position
            GM_setValue('posX', UI.root.style.left);
            GM_setValue('posY', UI.root.style.top);
        }
    };

    // --- UI TOGGLE ---
    UI.toggle.onclick = () => {
        UI.toggle.style.display = 'none';
        UI.panel.style.display = 'flex';
        anime({ targets: UI.panel, scale: [0.9, 1], opacity: [0, 1], duration: 300, easing: 'easeOutQuad' });
    };
    UI.hide.onclick = () => {
        UI.panel.style.display = 'none';
        UI.toggle.style.display = 'flex';
    };

    // --- SETTINGS EVENTS ---
    const save = () => {
        SETTINGS.mySex = UI.mySex.value;
        SETTINGS.wishSex = UI.wishSex.value;
        SETTINGS.topic = UI.topic.value;
        SETTINGS.replyText = UI.text.value;
        SETTINGS.autoNext = UI.auto.checked;
        
        GM_setValue('mySex', SETTINGS.mySex);
        GM_setValue('wishSex', SETTINGS.wishSex);
        GM_setValue('topic', SETTINGS.topic);
        GM_setValue('replyText', SETTINGS.replyText);
        GM_setValue('autoNext', SETTINGS.autoNext);
    };
    [UI.mySex, UI.wishSex, UI.topic, UI.text, UI.auto].forEach(el => el.onchange = save);

    // --- DOM HELPERS (APPLY FILTERS) ---
    // Функция нажимает кнопки на сайте согласно настройкам
    const applyFilters = async () => {
        // 1. Тема
        const topicBtns = document.querySelectorAll('.topicRow button');
        topicBtns.forEach(btn => {
            const txt = btn.innerText.toLowerCase();
            if (SETTINGS.topic === 'adult' && txt.includes('18+')) btn.click();
            if (SETTINGS.topic === 'normal' && txt.includes('общение')) btn.click();
        });

        await new Promise(r => setTimeout(r, 100));

        // 2. Мой пол
        const mySexBtns = document.querySelectorAll('.sexRow .btn-group:first-child button');
        mySexBtns.forEach(btn => {
            if (btn.innerText.trim() === SETTINGS.mySex) btn.click();
        });

        // 3. Кого ищем
        const wishSexBtns = document.querySelectorAll('.sexRow .wishSex button');
        wishSexBtns.forEach(btn => {
            if (btn.innerText.trim() === SETTINGS.wishSex) btn.click();
        });
        
        UI.status.innerText = "FILTERS APPLIED";
    };

    // --- BOT LOGIC ---

    const setView = (state) => {
        if (state === 'running') {
            UI.start.style.display = 'none';
            UI.stop.style.display = 'block';
            UI.status.classList.add('st-active');
        } else {
            UI.start.style.display = 'block';
            UI.stop.style.display = 'none';
            UI.status.classList.remove('st-active');
            UI.status.innerText = "IDLE";
        }
    };

    UI.start.onclick = async () => {
        // Сначала применяем фильтры (если мы на главной)
        if (document.querySelector('.topicRow')) {
            await applyFilters();
        }
        client.start();
        setView('running');
        UI.status.innerText = "SEARCHING...";
    };

    UI.stop.onclick = () => {
        client.stop();
        setView('stopped');
    };

    UI.skip.onclick = () => {
        client.skip();
    };

    // --- CLIENT EVENTS ---

    client.on('onConnect', (id) => {
        UI.status.innerText = `CHAT: ${id}`;
        hasReplied = false;
    });

    client.on('onMessage', (msg) => {
        if (!msg.isSelf && !hasReplied) {
            UI.status.innerText = "REPLYING...";
            hasReplied = true;
            setTimeout(() => {
                if (client.isRunning) {
                    client.sendMessage(SETTINGS.replyText);
                    UI.status.innerText = "SENT";
                }
            }, 1500);
        }
    });

    client.on('onDisconnect', () => {
        UI.status.innerText = "DISCONNECTED";
        if (SETTINGS.autoNext) {
            setTimeout(() => {
                if (client.isRunning) {
                    client.skip();
                    UI.status.innerText = "NEXT...";
                }
            }, 1500);
        } else {
            client.stop();
            setView('stopped');
        }
    });

})();
