// ==UserScript==
// @name         NektoMe Bot v13.0: Ultimate Control
// @version      13.0
// @description  Плавающее окно, полные настройки фильтров (пол/возраст), тайминги.
// @author       Gemini Partner
// @match        https://nekto.me/chat/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js
// @require      https://raw.githubusercontent.com/radik097/nektome-lib/refs/heads/main/NektoClient.js?v=4.2
// ==/UserScript==

(function () {
    'use strict';

    if (typeof NektoClient === 'undefined') {
        alert('NektoClient lib not loaded!');
        return;
    }

    // --- НАСТРОЙКИ (Default) ---
    const SETTINGS = {
        // Параметры бота
        replyText: GM_getValue('replyText', "Привет! 👋"),
        autoNext: GM_getValue('autoNext', true),
        replyDelay: GM_getValue('replyDelay', 1500),
        searchDelay: GM_getValue('searchDelay', 2000),

        // Параметры поиска
        mySex: GM_getValue('mySex', 'M'),
        myAge: GM_getValue('myAge', '18-25'), // 18-25, 26-35, 36+
        wishSex: GM_getValue('wishSex', 'F'),
        wishAge: GM_getValue('wishAge', '18-25'),
        topic: GM_getValue('topic', 'adult'),

        // UI
        posX: GM_getValue('posX', '20px'),
        posY: GM_getValue('posY', '80px')
    };

    const client = new NektoClient();
    let hasReplied = false;

    // --- CSS СТИЛИ ---
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap');

        #nm-root {
            position: fixed; z-index: 2147483647; font-family: 'Montserrat', sans-serif;
            top: ${SETTINGS.posY}; left: ${SETTINGS.posX};
        }

        /* Кнопка открытия (toggle) */
        #nm-toggle {
            width: 50px; height: 50px; background: #1e1e2e; border: 2px solid #89b4fa;
            border-radius: 50%; color: #89b4fa; font-size: 24px;
            display: flex; align-items: center; justify-content: center; cursor: pointer;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5); transition: transform 0.2s;
        }
        #nm-toggle:hover { transform: scale(1.1) rotate(15deg); color: #fff; border-color: #fff; }

        /* Панель */
        #nm-panel {
            width: 340px; background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 50px rgba(0,0,0,0.7);
            display: none; flex-direction: column; overflow: hidden;
        }

        /* Заголовок (Drag Handle) */
        .nm-header {
            padding: 12px 15px; background: linear-gradient(90deg, #2a2a3e, #1e1e2e);
            display: flex; justify-content: space-between; align-items: center;
            cursor: grab; border-bottom: 1px solid rgba(255,255,255,0.05); user-select: none;
        }
        .nm-header:active { cursor: grabbing; }
        .nm-title { font-weight: 700; font-size: 14px; color: #89b4fa; letter-spacing: 0.5px; }
        .nm-close { cursor: pointer; color: #f38ba8; font-weight: bold; transition: color 0.2s; }
        .nm-close:hover { color: #fff; }

        /* Скролл контента */
        .nm-content { padding: 15px; display: flex; flex-direction: column; gap: 12px; max-height: 80vh; overflow-y: auto; }
        .nm-content::-webkit-scrollbar { width: 4px; }
        .nm-content::-webkit-scrollbar-thumb { background: #45475a; border-radius: 2px; }

        /* Секции */
        .nm-section-title { font-size: 10px; color: #6c7086; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; letter-spacing: 1px; }
        .nm-row { display: flex; gap: 10px; }
        .nm-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }

        /* Элементы управления */
        select, textarea, input[type=text] {
            background: #11111b; border: 1px solid #313244; color: #cdd6f4;
            padding: 8px; border-radius: 8px; font-size: 11px; font-family: inherit;
            outline: none; width: 100%; box-sizing: border-box; transition: border 0.2s;
        }
        select:focus, textarea:focus { border-color: #89b4fa; }
        textarea { min-height: 60px; resize: vertical; }

        /* Слайдеры */
        .nm-slider-box { background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; }
        .nm-slider-label { display: flex; justify-content: space-between; font-size: 11px; color: #bac2de; margin-bottom: 5px; }
        input[type=range] { width: 100%; cursor: pointer; accent-color: #89b4fa; height: 4px; }

        /* Чекбокс */
        .nm-chk-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cdd6f4; cursor: pointer; padding: 5px 0; }
        .nm-chk-row input { accent-color: #a6e3a1; width: 16px; height: 16px; }

        /* Кнопки */
        .nm-btns { display: flex; gap: 10px; margin-top: 10px; }
        .nm-btn {
            flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: 700;
            cursor: pointer; font-size: 13px; transition: all 0.2s; color: #1e1e2e;
            text-transform: uppercase;
        }
        .nm-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .nm-btn:active { transform: translateY(1px); }
        
        .btn-start { background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%); }
        .btn-stop { background: linear-gradient(135deg, #f38ba8 0%, #eba0ac 100%); display: none; }
        .btn-skip { background: #45475a; color: #cdd6f4; }

        /* Статус */
        .nm-status-bar {
            font-size: 10px; text-align: center; padding: 6px; margin-top: 5px;
            border-radius: 6px; background: #11111b; color: #a6adc8; border: 1px solid #313244;
            font-family: monospace;
        }
        .st-active { color: #a6e3a1; border-color: #a6e3a1; }
    `);

    // --- HTML СТРУКТУРА ---
    const root = document.createElement('div');
    root.id = 'nm-root';
    root.innerHTML = `
        <div id="nm-toggle">⚙️</div>
        <div id="nm-panel">
            <div class="nm-header" id="nm-drag">
                <span class="nm-title">Bot v13.0 Control</span>
                <span class="nm-close" id="nm-hide">✕</span>
            </div>
            <div class="nm-content">
                
                <div class="nm-section-title">Фильтры Поиска</div>
                <div class="nm-row">
                    <div class="nm-col">
                        <select id="nm-my-sex" title="Мой пол">
                            <option value="M">Я: Парень</option>
                            <option value="F">Я: Девушка</option>
                        </select>
                        <select id="nm-my-age" title="Мой возраст">
                            <option value="18-25">Мне: 18-25</option>
                            <option value="26-35">Мне: 26-35</option>
                            <option value="36+">Мне: 36+</option>
                        </select>
                    </div>
                    <div class="nm-col">
                        <select id="nm-wish-sex" title="Пол собеседника">
                            <option value="F">Ищу: Девушку</option>
                            <option value="M">Ищу: Парня</option>
                        </select>
                        <select id="nm-wish-age" title="Возраст собеседника">
                            <option value="18-25">Им: 18-25</option>
                            <option value="26-35">Им: 26-35</option>
                            <option value="36+">Им: 36+</option>
                        </select>
                    </div>
                </div>
                <div class="nm-col" style="margin-top:5px;">
                    <select id="nm-topic">
                        <option value="adult">🔥 Тема: Пошлое (18+)</option>
                        <option value="normal">💬 Тема: Общение</option>
                    </select>
                </div>

                <hr style="border: 0; border-top: 1px solid #313244; width: 100%; margin: 5px 0;">

                <div class="nm-section-title">Настройки Бота</div>
                <textarea id="nm-text" placeholder="Текст первого сообщения...">${SETTINGS.replyText}</textarea>

                <div class="nm-slider-box">
                    <div class="nm-slider-label"><span>Задержка ответа</span><span id="val-reply">${SETTINGS.replyDelay} ms</span></div>
                    <input type="range" id="rng-reply" min="100" max="5000" step="100" value="${SETTINGS.replyDelay}">
                </div>

                <div class="nm-slider-box">
                    <div class="nm-slider-label"><span>Задержка поиска</span><span id="val-search">${SETTINGS.searchDelay} ms</span></div>
                    <input type="range" id="rng-search" min="500" max="5000" step="100" value="${SETTINGS.searchDelay}">
                </div>

                <label class="nm-chk-row">
                    <input type="checkbox" id="nm-auto" ${SETTINGS.autoNext ? 'checked' : ''}>
                    <span>Авто-поиск следующего (Auto Next)</span>
                </label>

                <div class="nm-status-bar" id="nm-status">READY</div>

                <div class="nm-btns">
                    <button id="btn-start" class="nm-btn btn-start">START</button>
                    <button id="btn-stop" class="nm-btn btn-stop">STOP</button>
                    <button id="btn-skip" class="nm-btn btn-skip">SKIP ⏩</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // --- DOM REFERENCES ---
    const UI = {
        root: document.getElementById('nm-root'),
        toggle: document.getElementById('nm-toggle'),
        panel: document.getElementById('nm-panel'),
        drag: document.getElementById('nm-drag'),
        hide: document.getElementById('nm-hide'),
        // Inputs
        mySex: document.getElementById('nm-my-sex'),
        myAge: document.getElementById('nm-my-age'),
        wishSex: document.getElementById('nm-wish-sex'),
        wishAge: document.getElementById('nm-wish-age'),
        topic: document.getElementById('nm-topic'),
        text: document.getElementById('nm-text'),
        rngReply: document.getElementById('rng-reply'),
        rngSearch: document.getElementById('rng-search'),
        valReply: document.getElementById('val-reply'),
        valSearch: document.getElementById('val-search'),
        auto: document.getElementById('nm-auto'),
        // Btns
        start: document.getElementById('btn-start'),
        stop: document.getElementById('btn-stop'),
        skip: document.getElementById('btn-skip'),
        status: document.getElementById('nm-status')
    };

    // --- INITIALIZE UI VALUES ---
    UI.mySex.value = SETTINGS.mySex;
    UI.myAge.value = SETTINGS.myAge;
    UI.wishSex.value = SETTINGS.wishSex;
    UI.wishAge.value = SETTINGS.wishAge;
    UI.topic.value = SETTINGS.topic;

    // --- DRAG & DROP ---
    let isDragging = false, dragOffset = { x: 0, y: 0 };
    UI.drag.onmousedown = (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - UI.root.offsetLeft;
        dragOffset.y = e.clientY - UI.root.offsetTop;
        UI.drag.style.cursor = 'grabbing';
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        UI.root.style.left = (e.clientX - dragOffset.x) + 'px';
        UI.root.style.top = (e.clientY - dragOffset.y) + 'px';
    };
    document.onmouseup = () => {
        if (isDragging) {
            isDragging = false;
            UI.drag.style.cursor = 'grab';
            GM_setValue('posX', UI.root.style.left);
            GM_setValue('posY', UI.root.style.top);
        }
    };

    // --- PANEL TOGGLE ---
    UI.toggle.onclick = () => {
        UI.toggle.style.display = 'none';
        UI.panel.style.display = 'flex';
        anime({ targets: UI.panel, scale: [0.9, 1], opacity: [0, 1], duration: 300, easing: 'easeOutQuad' });
    };
    UI.hide.onclick = () => {
        UI.panel.style.display = 'none';
        UI.toggle.style.display = 'flex';
    };

    // --- SAVE SETTINGS ---
    const save = () => {
        SETTINGS.mySex = UI.mySex.value;
        SETTINGS.myAge = UI.myAge.value;
        SETTINGS.wishSex = UI.wishSex.value;
        SETTINGS.wishAge = UI.wishAge.value;
        SETTINGS.topic = UI.topic.value;
        SETTINGS.replyText = UI.text.value;
        SETTINGS.autoNext = UI.auto.checked;
        SETTINGS.replyDelay = parseInt(UI.rngReply.value);
        SETTINGS.searchDelay = parseInt(UI.rngSearch.value);

        UI.valReply.innerText = SETTINGS.replyDelay + ' ms';
        UI.valSearch.innerText = SETTINGS.searchDelay + ' ms';

        // Persist
        for (const key in SETTINGS) GM_setValue(key, SETTINGS[key]);
    };

    // Bind change events
    [UI.mySex, UI.myAge, UI.wishSex, UI.wishAge, UI.topic, UI.text, UI.auto, UI.rngReply, UI.rngSearch]
        .forEach(el => el.onchange = save);
    UI.rngReply.oninput = save;
    UI.rngSearch.oninput = save;


    // --- HELPERS: APPLY FILTERS TO SITE ---
    const clickByText = (containerSelector, textOrValue) => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const buttons = container.querySelectorAll('button');

        // Поиск по тексту (например "18-25") или по атрибутам
        for (let btn of buttons) {
            const txt = btn.innerText.trim();
            // Простая проверка вхождения
            if (txt.includes(textOrValue) || (textOrValue === 'adult' && txt.includes('18+')) || (textOrValue === 'normal' && txt.includes('общение'))) {
                btn.click();
                return;
            }
        }
    };

    const applyFilters = async () => {
        // Проверяем, есть ли настройки на экране (мы на главной?)
        if (!document.querySelector('.topicRow')) return;

        UI.status.innerText = "APPLYING FILTERS...";

        // 1. Тема (.topicRow)
        clickByText('.topicRow', SETTINGS.topic);

        // 2. Пол и возраст
        clickByText('.sexRow', SETTINGS.mySex);
        clickByText('.ageRow', SETTINGS.myAge);

        // 3. Желаемый пол и возраст
        clickByText('.wishSexRow', SETTINGS.wishSex);
        clickByText('.wishAgeRow', SETTINGS.wishAge);

        // 4. Авто-следующий
        UI.auto.checked = SETTINGS.autoNext;

        // 5. Задержка ответа
        UI.rngReply.value = SETTINGS.replyDelay;
        UI.valReply.innerText = SETTINGS.replyDelay + ' ms';

        // 6. Задержка поиска
        UI.rngSearch.value = SETTINGS.searchDelay;
        UI.valSearch.innerText = SETTINGS.searchDelay + ' ms';

        // 7. Текст ответа
        UI.text.value = SETTINGS.replyText;

        // 8. Сохранение
        save();

        UI.status.innerText = "FILTERS APPLIED!";
    };

})();
