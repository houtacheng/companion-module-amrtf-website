/*
 * 顯示／隱藏標註（App 與大慈恩版 Chrome 外掛共用，在 script.js 之後載入）
 *
 * 狀態存在 chrome.storage.local 的 qhp-hide-annotations（這台裝置的閱讀偏好，不跟著 Google 帳號同步），
 * 所有頁面共用、關掉 App／瀏覽器再開仍然保持。
 *
 * 隱藏時是「真的把標註從畫面上拿掉」（沿用外掛既有的 disableGlobally：移除標註標記、關閉選單），
 * 而不是用 CSS 蓋掉：外掛會替標註內的文字直接指定顏色，單用 CSS 蓋不掉，深色背景的頁面會變得看不清楚。
 * 標註資料不受影響，顯示時立刻重新套回頁面。
 *
 * 其他程式透過 window.__qhpVisibility 使用：{ isHidden(), set(hidden), toggle() }；
 * 狀態改變時，window 會收到 'qhp:visibility' 事件（detail.hidden）。
 */
(function () {
    'use strict';
    if (window.__qhpVisibility) return;

    const KEY = 'qhp-hide-annotations';
    let hidden = false;
    let instance = null;
    let enableReal = null;

    /** 使用者在側邊欄設定了「在此頁面／整個網站停用標註」時，顯示開關不應該把它重新打開。 */
    async function disabledByLists() {
        try {
            const data = await chrome.storage.sync.get(['disabledSites', 'disabledPages']);
            return (data.disabledSites || []).includes(location.hostname)
                || (data.disabledPages || []).includes(location.href);
        } catch (e) {
            return false;
        }
    }

    function render() {
        document.documentElement.classList.toggle('qhp-annotations-hidden', hidden);
        window.dispatchEvent(new CustomEvent('qhp:visibility', { detail: { hidden } }));
    }

    async function apply() {
        if (!instance) return;
        render();
        if (hidden) {
            instance.disableGlobally();
        } else if (!(await disabledByLists()) && !hidden) {
            enableReal();
        }
    }

    function attach(h) {
        instance = h;
        enableReal = h.enableGlobally.bind(h);
        // 隱藏期間，外掛其他流程（載入完成、切換停用設定）呼叫 enableGlobally 也不能把標註放回來。
        h.enableGlobally = function () { if (!hidden) enableReal(); };
        if (hidden) apply(); else render();
    }

    function waitForInstance() {
        if (window.highlighterInstance) { attach(window.highlighterInstance); return; }
        let tries = 0;
        const timer = setInterval(() => {
            if (window.highlighterInstance) { clearInterval(timer); attach(window.highlighterInstance); }
            else if (++tries > 100) clearInterval(timer);
        }, 100);
    }

    window.__qhpVisibility = {
        isHidden: () => hidden,
        set: (value) => chrome.storage.local.set({ [KEY]: !!value }),
        toggle: () => chrome.storage.local.set({ [KEY]: !hidden }),
    };

    // 側邊欄開關、把手上的眼睛、其他頁面的變更，都經由儲存區通知過來
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[KEY]) return;
        const next = !!changes[KEY].newValue;
        if (next === hidden) return;
        hidden = next;
        apply();
    });

    chrome.storage.local.get(KEY).then((items) => {
        hidden = !!(items && items[KEY]);
        waitForInstance();
    });
})();
