/*
 * 側邊欄設定裡的開關（sidebar.html 在 sidebar.js 之後載入本檔）：
 *   - 「顯示標註」show-annotations-switch    ←→ chrome.storage.local 的 qhp-hide-annotations（勾選 = 顯示）
 *   - 「顯示懸浮球」show-ball-switch（只有 Chrome 外掛有）←→ qhp-ball-hidden（勾選 = 顯示）
 * 兩者都與頁面上的程式（visibility.js、懸浮球）共用同一個儲存區，改任何一邊另一邊都會跟著變。
 */
(function () {
    'use strict';

    function bindSwitch(id, key) {
        const toggle = document.getElementById(id);
        if (!toggle) return;
        chrome.storage.local.get(key).then((items) => { toggle.checked = !(items && items[key]); });
        toggle.addEventListener('change', () => { chrome.storage.local.set({ [key]: !toggle.checked }); });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[key]) toggle.checked = !changes[key].newValue;
        });
    }

    bindSwitch('show-annotations-switch', 'qhp-hide-annotations');
    bindSwitch('show-ball-switch', 'qhp-ball-hidden');
})();
