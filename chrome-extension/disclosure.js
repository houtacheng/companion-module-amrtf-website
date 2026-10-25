/*
 * 取代原 Quantum Highlighter PRO 的 disclosure.js。
 *
 * 原檔負責 Chrome 線上應用程式商店政策要求的「資料處理方式」告知視窗
 * （說明資料存放在 Chrome 同步／Google 帳號）。在大慈恩 App 中標註資料只存在手機本機，
 * 不適用該說明，因此這裡只保留相同的介面，永遠回報「不需要顯示」。
 */
(function () {
    'use strict';

    globalThis.QHP = globalThis.QHP || {};
    globalThis.QHP.disclosure = {
        PRACTICES_VERSION: 'amrtf-app',
        ACK_KEY: 'qhp-disclosure-ack',
        MODE_KEY: 'qhp-disclosure-mode',
        PRIVACY_POLICY_URL: '',
        getState: (callback) => callback({ needed: false, mode: 'new', ackVersion: 'amrtf-app' }),
        acknowledge: (callback) => { if (callback) callback(); },
        markUpdate: (callback) => { if (callback) callback(); },
        content: () => ({ title: '', intro: '', changes: [], practicesHeading: '', items: [], changesHeading: '', link: '', accept: '', url: '' }),
    };
})();
