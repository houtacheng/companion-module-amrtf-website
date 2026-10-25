/*
 * 大慈恩版 Chrome 外掛：即時同步（Google 雲端硬碟）
 *
 * 原版外掛只在「開啟頁面時」從雲端硬碟讀取一次標註。這個內容腳本讓已連線雲端硬碟的頁面在前景時，
 * 每 15 秒向背景程式問一次這一頁的雲端狀態；別台裝置（例如手機 App）改過，就立刻重畫標註，
 * 不必重新整理頁面。
 *
 * 做法（背景程式 service worker 會被 Chrome 休眠，所以狀態放在頁面這一側）：
 *   - 頁面記住上次檢查到的雲端檔案修改時間（stamp）；背景程式只回答「現在的 stamp 與內容」
 *   - stamp 相同 → 不下載內容（一次輕量請求）
 *   - stamp 不同 → 背景程式回傳目前的標註，頁面比對「內容」是否真的和畫面上的不同，
 *     不同才重畫（自己剛上傳的變更會使 stamp 改變，但內容相同，所以不會多重畫一次）
 *   - 使用者正在選字、挑顏色或寫筆記時不重畫；分頁在背景時不檢查
 *   - 離線或被限流時自動放慢到 5 分鐘一次
 */
(function () {
    'use strict';
    if (window.__qhpLiveSync) return;
    window.__qhpLiveSync = true;

    const SESSION_KEY = 'qhp-drive-session';
    const POLL_FAST_MS = 15000;
    const POLL_SLOW_MS = 300000;

    let delay = POLL_FAST_MS;
    let timer = null;
    let polling = false;
    let known;                 // 上次檢查到的雲端檔案修改時間；undefined = 還不知道（下次一定比對內容）

    async function driveSignedIn() {
        try {
            const items = await chrome.storage.local.get(SESSION_KEY);
            const session = items[SESSION_KEY];
            return !!(session && session.signedIn && !session.needsReauth);
        } catch (e) {
            return false;
        }
    }

    function userIsBusy(h) {
        const selection = window.getSelection();
        return !!(h.isCreatingAnnotation || h.activeAnnotationId || h.activeRange || h.menu.isVisible()
            || (selection && !selection.isCollapsed));
    }

    /**
     * 標註「內容」的指紋。不含錨點（pointers／position）：那些只是定位用，補寫回雲端的時機本來就不同，
     * 納入比對會造成不必要的重畫。
     */
    function signature(annotations) {
        return [...annotations]
            .map((a) => [a.id, a.contentUpdatedAt || 0, a.color, a.type, a.comment || ''].join('\u0001'))
            .sort()
            .join('\u0002');
    }

    async function pollOnce(force) {
        const h = window.highlighterInstance;
        if (polling || !h || h.isGloballyDisabled) return;
        if (!force && (document.visibilityState !== 'visible' || userIsBusy(h))) return;
        if (!(await driveSignedIn())) { known = undefined; return; }

        polling = true;
        try {
            const reply = await chrome.runtime.sendMessage({
                action: 'drive:pollPage',
                pageUrl: h.storage.getPageUrl(),
                known: force ? undefined : known,
            });
            if (!reply || reply.ok === false) {
                delay = Math.min(delay * 2, POLL_SLOW_MS);
                return;
            }
            delay = POLL_FAST_MS;
            if (reply.annotations) {
                if (userIsBusy(h)) return;                       // 先不記錄，下次再比對
                if (signature(Object.values(reply.annotations)) !== signature(h.annotations.values())) {
                    await h._reloadFromBackend();
                }
            }
            known = reply.stamp;
        } catch (e) {
            delay = Math.min(delay * 2, POLL_SLOW_MS);
        } finally {
            polling = false;
        }
    }

    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(async () => { await pollOnce(false); schedule(); }, delay);
    }

    schedule();
    // 切回這個分頁時馬上檢查一次
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pollOnce(false); });
    // 側邊欄的「重新載入標註」按鈕：強制向雲端重新讀取
    chrome.runtime.onMessage.addListener((request) => {
        if (request && request.action === 'requestRefresh') pollOnce(true);
    });
})();
