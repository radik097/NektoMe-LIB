// ==UserScript==
// @name         NektoMe Bot v10.0: UI Only (Lib Powered)
// @version      10.0
// @description  Чистый интерфейс, вся логика в библиотеке NektoClient.js
// @author       Gemini Partner
// @match        https://nekto.me/chat/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      https://raw.githubusercontent.com/radik097/NektoMe-LIB/refs/heads/main/NektoClient.js
// ==/UserScript==

(function() {
    'use strict';

    if (typeof NektoClient === 'undefined') {
        alert('Library failed to load!');
        return;
    }

    // --- CONFIG ---
    const CONFIG = {
        replyText: GM_getValue('replyText', "Привет! 👋\nМ или Ж?"),
        autoNext: GM_getValue('autoNext', true),
        delay: 1500 // Задержка ответа
    };

    const client = new NektoClient();
    let hasReplied = false; // Флаг для текущего диалога

    // --- UI STYLES ---
    GM_addStyle(`
        #nm-panel {
            position: fixed; top: 80px; right: 20px; width: 280px; z-index: 999999;
            background: #1e1e2e; color: #cdd6f4; padding: 15px;
            border-radius: 12px; border: 1px solid #45475a; font-family: monospace;
            box-shadow: 0 10px 20px rgba(0,0,0,0.5);
        }
        .nm-head { display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; color:#89b4fa; }
        .nm-status { font-size:10px; padding:2px 5px; background:#313244; border-radius:4px; color:#a6adc8; }
        textarea { width:100%; background:#11111b; color:#fff; border:1px solid #313244; border-radius:5px; padding:5px; min-height:60px; margin-bottom:10px; }
        button { width:100%; padding:8px; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:5px; }
        .btn-start { background:#a6e3a1; color:#1e1e2e; }
        .btn-stop { background:#f38ba8; color:#1e1e2e; display:none; }
        label { font-size:11px; display:flex; align-items:center; gap:5px; cursor:pointer; }
    `);

    // --- UI BUILDER ---
    const div = document.createElement('div');
    div.id = 'nm-panel';
    div.innerHTML = `
        <div class="nm-head">Bot v10.0 <span id="nm-st" class="nm-status">IDLE</span></div>
        <textarea id="nm-txt">${CONFIG.replyText}</textarea>
        <label><input type="checkbox" id="nm-auto" ${CONFIG.autoNext?'checked':''}> Auto Next</label>
        <button id="btn-start" class="btn-start">▶ START</button>
        <button id="btn-stop" class="btn-stop">⏹ STOP</button>
    `;
    document.body.appendChild(div);

    // --- ELEMENTS ---
    const ui = {
        st: document.getElementById('nm-st'),
        txt: document.getElementById('nm-txt'),
        auto: document.getElementById('nm-auto'),
        start: document.getElementById('btn-start'),
        stop: document.getElementById('btn-stop')
    };

    // --- UI EVENTS ---
    ui.txt.oninput = () => { CONFIG.replyText = ui.txt.value; GM_setValue('replyText', CONFIG.replyText); };
    ui.auto.onchange = () => { CONFIG.autoNext = ui.auto.checked; GM_setValue('autoNext', CONFIG.autoNext); };

    ui.start.onclick = () => {
        client.start();
        ui.start.style.display = 'none';
        ui.stop.style.display = 'block';
    };

    ui.stop.onclick = () => {
        client.stop();
        ui.start.style.display = 'block';
        ui.stop.style.display = 'none';
    };

    // --- LIBRARY EVENTS CONNECTION ---

    // 1. Изменение статуса (Idle, Searching, Chatting)
    client.on('onStatusChange', (status) => {
        ui.st.innerText = status;
        ui.st.style.color = status === 'CHATTING' ? '#a6e3a1' : '#cdd6f4';
    });

    // 2. Найден собеседник
    client.on('onConnect', (chatId) => {
        console.log('[UI] Chat started:', chatId);
        hasReplied = false; // Сбрасываем флаг ответа для нового чата
    });

    // 3. Собеседник отключился
    client.on('onDisconnect', () => {
        console.log('[UI] Chat ended.');

        if (CONFIG.autoNext) {
            ui.st.innerText = 'NEXT >>';
            // Небольшая задержка перед нажатием "Далее", чтобы не спамить
            setTimeout(() => {
                if (client.isRunning) client.skip();
            }, 2000);
        } else {
            // Если авто-некст выключен, останавливаем бота
            ui.stop.click();
        }
    });

    // 4. Входящее сообщение
    client.on('onMessage', (msg) => {
        // Логика: Если сообщение не мое И я еще не отвечал в этом чате
        if (!msg.isSelf && !hasReplied) {
            console.log('[UI] Partner wrote:', msg.text);
            hasReplied = true;

            // Эффект задержки перед ответом
            setTimeout(() => {
                if (client.isRunning) {
                    client.sendMessage(CONFIG.replyText);
                }
            }, CONFIG.delay);
        }
    });

})();
