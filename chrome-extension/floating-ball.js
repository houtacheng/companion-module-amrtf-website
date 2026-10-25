/*
 * 大慈恩版 Chrome 外掛：懸浮球
 *
 * 頁面邊緣的一顆小圓球，不用開側邊欄、不用記快捷鍵就能操作標註：
 *   - 拖曳：可以放在畫面任何高度，放開後吸附到最近的左／右邊緣；位置會記住（各分頁共用）
 *   - 閒置 3 秒後縮進邊緣一半，滑鼠移上去／觸碰時自動滑出
 *   - 點一下展開快捷按鈕：開啟側邊欄、顯示／隱藏標註、檢視全部標註、隱藏懸浮球
 *   - 球上的小徽章顯示這一頁的標註數量（即使標註被隱藏也看得到）
 *
 * 顯示／隱藏懸浮球（四種方式，狀態各分頁共用並會記住）：
 *   1. 球的快捷選單最下面的 ✕
 *   2. 側邊欄設定的「顯示懸浮球」開關
 *   3. 在瀏覽器工具列的外掛圖示上按右鍵 →「顯示／隱藏懸浮球」
 *   4. 鍵盤快捷鍵 Alt+Shift+B
 *
 * 另外在這些情況不會顯示：側邊欄開啟時（避免蓋住側邊欄）、影片全螢幕時，
 * 或這個網站／頁面被「停用標註」（例如外掛預設停用的 notion、google）。
 *
 * 畫面放在 Shadow DOM 裡，不受網站樣式影響，也不會影響網站版面。
 */
(function () {
    'use strict';
    if (window.top !== window || window.__qhpBall) return;
    window.__qhpBall = true;

    const POS_KEY = 'qhp-ball-pos';          // { side: 'left' | 'right', y: 0~1 }
    const HIDE_KEY = 'qhp-ball-hidden';      // true = 使用者關閉了懸浮球
    const SIZE = 44;
    const ITEM = 38;
    const GAP = 8;
    const MARGIN = 8;
    const PEEK_OFFSET = 26;
    const PEEK_DELAY_MS = 3000;
    const DRAG_THRESHOLD = 5;

    const t = (key) => chrome.i18n.getMessage(key);

    const ICONS = {
        pen: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
        sidebar: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
        eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
        eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    };
    const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

    let pos = { side: 'right', y: 0.62 };
    let userHidden = false;
    let siteDisabled = false;
    let sidebarOpen = false;
    let fullscreen = false;
    let menuOpen = false;
    let dragging = false;
    let peekTimer = null;

    /* ---------------- 畫面 ---------------- */
    const host = document.createElement('div');
    host.id = 'qhp-ball-host';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            button { all: unset; box-sizing: border-box; cursor: pointer; -webkit-tap-highlight-color: transparent; }
            .ball, .item { position: absolute; border-radius: 50%; display: grid; place-items: center; pointer-events: auto;
                background: rgba(40, 33, 26, 0.9); border: 1.5px solid rgba(227, 201, 142, 0.55);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35); user-select: none; -webkit-user-select: none; }
            .ball { width: ${SIZE}px; height: ${SIZE}px; cursor: grab; touch-action: none;
                transition: left .22s ease, top .22s ease, transform .22s ease, opacity .2s ease; }
            .ball.dragging { transition: none; cursor: grabbing; }
            .ball.peek { opacity: .6; }
            .ball.peek.right { transform: translateX(${PEEK_OFFSET}px); }
            .ball.peek.left { transform: translateX(-${PEEK_OFFSET}px); }
            .ball:hover, .ball:focus-visible, .ball.open { background: rgba(40, 33, 26, 1); border-color: #e3c98e; }
            .ball:focus-visible { outline: 2px solid #e3c98e; outline-offset: 2px; }
            svg { width: 22px; height: 22px; fill: none; stroke: #e3c98e; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
            .item { width: ${ITEM}px; height: ${ITEM}px; opacity: 0; transform: scale(.4); pointer-events: none;
                transition: opacity .16s ease, transform .16s ease, left .22s ease, top .22s ease; }
            .item svg { width: 19px; height: 19px; }
            .open-menu .item { opacity: 1; transform: scale(1); pointer-events: auto; }
            .item:hover, .item:focus-visible { background: #3a2f22; border-color: #e3c98e; }
            .item.off svg { stroke: #b9ad97; }
            .badge { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
                background: #ee8421; color: #fff; font: 700 11px/18px system-ui, -apple-system, 'Segoe UI', sans-serif;
                text-align: center; pointer-events: none; display: none; }
            .tip { position: absolute; padding: 5px 9px; border-radius: 6px; background: rgba(40, 33, 26, .95); color: #f4efe5; white-space: nowrap;
                font: 12px/1.3 system-ui, -apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
                pointer-events: none; opacity: 0; transition: opacity .12s ease; }
            .tip.show { opacity: 1; }
        </style>
        <div class="layer">
            <button class="ball right" type="button" aria-label="${t('extensionName')}" aria-haspopup="true" aria-expanded="false">
                ${svg('pen')}<span class="badge"></span>
            </button>
            <button class="item" data-id="sidebar" type="button" aria-label="${t('openSidebar')}">${svg('sidebar')}</button>
            <button class="item" data-id="eye" type="button" aria-label="${t('toggleAnnotationsTooltip')}">${svg('eye')}</button>
            <button class="item" data-id="panel" type="button" aria-label="${t('openAnnotationsPanel')}">${svg('grid')}</button>
            <button class="item" data-id="hide" type="button" aria-label="${t('hideBallLabel')}">${svg('close')}</button>
            <div class="tip"></div>
        </div>`;
    const layer = root.querySelector('.layer');
    const ball = root.querySelector('.ball');
    const badge = root.querySelector('.badge');
    const tip = root.querySelector('.tip');
    const items = [...root.querySelectorAll('.item')];       // 由近到遠
    const item = (id) => items.find((el) => el.dataset.id === id);

    /* ---------------- 位置 ---------------- */
    const viewport = () => ({ w: document.documentElement.clientWidth || window.innerWidth, h: window.innerHeight });
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

    function place() {
        const { w, h } = viewport();
        const left = pos.side === 'left' ? MARGIN : w - SIZE - MARGIN;
        const top = Math.round(MARGIN + clamp(pos.y, 0, 1) * Math.max(h - SIZE - 2 * MARGIN, 0));
        ball.style.left = `${left}px`;
        ball.style.top = `${top}px`;
        ball.classList.toggle('left', pos.side === 'left');
        ball.classList.toggle('right', pos.side === 'right');
        placeItems(left, top, h);
    }

    /** 快捷按鈕排在球的上方（空間不夠就排在下方），與球置中對齊。 */
    function placeItems(ballLeft, ballTop, viewportHeight) {
        const total = items.length * ITEM + (items.length - 1) * GAP;
        const above = ballTop - GAP - total >= MARGIN || ballTop + SIZE + GAP + total > viewportHeight - MARGIN;
        items.forEach((el, i) => {
            const offset = GAP + i * (ITEM + GAP);
            el.style.left = `${ballLeft + (SIZE - ITEM) / 2}px`;
            el.style.top = `${above ? ballTop - offset - ITEM : ballTop + SIZE + offset}px`;
            el.style.transitionDelay = menuOpen ? `${i * 30}ms` : '0ms';
        });
    }

    function save() {
        chrome.storage.local.set({ [POS_KEY]: { side: pos.side, y: Number(pos.y.toFixed(4)) } });
    }

    /* ---------------- 閒置時縮進邊緣 ---------------- */
    function wake() {
        clearTimeout(peekTimer);
        ball.classList.remove('peek');
        if (!menuOpen && !dragging) peekTimer = setTimeout(() => ball.classList.add('peek'), PEEK_DELAY_MS);
    }

    /* ---------------- 快捷選單 ---------------- */
    function setMenu(open) {
        menuOpen = open;
        layer.classList.toggle('open-menu', open);
        ball.classList.toggle('open', open);
        ball.setAttribute('aria-expanded', String(open));
        if (open) updateEye();
        place();
        wake();
    }

    function showToast(message) {
        const h = window.highlighterInstance;
        if (h && h.menu && h.menu.showToast) h.menu.showToast(message);
    }

    const actions = {
        sidebar() {
            // 側邊欄由內容腳本自己管理；經背景程式轉給這個分頁，與按工具列圖示同一條路
            chrome.runtime.sendMessage({ action: 'toggleSidebarFromBall' });
        },
        eye() {
            const visibility = window.__qhpVisibility;
            if (!visibility) return;
            const next = !visibility.isHidden();
            visibility.set(next);
            showToast(t(next ? 'annotationsHidden' : 'annotationsShown'));
        },
        panel() {
            const h = window.highlighterInstance;
            chrome.runtime.sendMessage({ action: 'openAnnotationsPanel', pageUrl: h && h.storage ? h.storage.getPageUrl() : undefined });
        },
        hide() {
            chrome.storage.local.set({ [HIDE_KEY]: true });
            showToast(t('ballHiddenToast'));
        },
    };

    /** 鍵盤快捷鍵：Alt+Shift+B。隱藏時用提示告訴使用者怎麼再叫回來。 */
    document.addEventListener('keydown', (event) => {
        if (!(event.altKey && event.shiftKey && event.code === 'KeyB') || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const next = !userHidden;
        chrome.storage.local.set({ [HIDE_KEY]: next });
        showToast(t(next ? 'ballHiddenToast' : 'ballShownToast'));
    });

    items.forEach((el) => {
        el.addEventListener('click', () => {
            actions[el.dataset.id]();
            if (el.dataset.id !== 'eye') setMenu(false);      // 眼睛可以連續點，其他動作做完就收起選單
        });
        el.addEventListener('pointerenter', () => showTip(el));
        el.addEventListener('pointerleave', () => tip.classList.remove('show'));
        el.addEventListener('focus', () => showTip(el));
        el.addEventListener('blur', () => tip.classList.remove('show'));
    });

    function showTip(el) {
        tip.textContent = el.getAttribute('aria-label');
        tip.classList.add('show');
        const rect = el.getBoundingClientRect();
        const tipWidth = tip.offsetWidth || 120;
        const { w } = viewport();
        tip.style.top = `${rect.top + (ITEM - (tip.offsetHeight || 24)) / 2}px`;
        tip.style.left = pos.side === 'right' ? `${Math.max(rect.left - tipWidth - 8, 4)}px` : `${Math.min(rect.right + 8, w - tipWidth - 4)}px`;
    }

    function updateEye() {
        const hidden = !!(window.__qhpVisibility && window.__qhpVisibility.isHidden());
        const eye = item('eye');
        eye.classList.toggle('off', hidden);
        eye.innerHTML = svg(hidden ? 'eyeOff' : 'eye');
    }

    /* ---------------- 拖曳與點擊 ---------------- */
    let press = null;

    ball.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const rect = ball.getBoundingClientRect();
        press = { x: event.clientX, y: event.clientY, left: parseFloat(ball.style.left) || rect.left, top: parseFloat(ball.style.top) || rect.top };
        if (ball.setPointerCapture) ball.setPointerCapture(event.pointerId);
        event.preventDefault();                                // 不要因為按到球而取消網頁上的文字選取
        wake();
    });

    ball.addEventListener('pointermove', (event) => {
        if (!press) return;
        const dx = event.clientX - press.x;
        const dy = event.clientY - press.y;
        if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            dragging = true;
            ball.classList.add('dragging');
            if (menuOpen) setMenu(false);
        }
        if (!dragging) return;
        const { w, h } = viewport();
        ball.style.left = `${clamp(press.left + dx, 0, w - SIZE)}px`;
        ball.style.top = `${clamp(press.top + dy, 0, h - SIZE)}px`;
    });

    function release(event) {
        if (!press) return;
        if (ball.releasePointerCapture && event.pointerId !== undefined) {
            try { ball.releasePointerCapture(event.pointerId); } catch (e) { /* 已經釋放 */ }
        }
        const wasDragging = dragging;
        press = null;
        dragging = false;
        ball.classList.remove('dragging');
        if (wasDragging) {
            const { w, h } = viewport();
            const left = parseFloat(ball.style.left);
            const top = parseFloat(ball.style.top);
            pos = { side: left + SIZE / 2 < w / 2 ? 'left' : 'right', y: clamp((top - MARGIN) / Math.max(h - SIZE - 2 * MARGIN, 1), 0, 1) };
            place();
            save();
            wake();
        } else {
            setMenu(!menuOpen);
        }
    }
    ball.addEventListener('pointerup', release);
    ball.addEventListener('pointercancel', release);
    ball.addEventListener('pointerenter', wake);
    ball.addEventListener('pointerleave', wake);
    ball.addEventListener('focus', wake);
    ball.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMenu(!menuOpen); }
    });

    // 點選球以外的地方、按 Esc：收起選單
    document.addEventListener('pointerdown', (event) => {
        if (menuOpen && !event.composedPath().includes(host)) setMenu(false);
    }, true);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuOpen) setMenu(false); });
    window.addEventListener('resize', place);

    /* ---------------- 顯示條件 ---------------- */
    function refreshVisibility() {
        const hide = userHidden || siteDisabled || sidebarOpen || fullscreen;
        host.style.display = hide ? 'none' : '';
        if (hide && menuOpen) setMenu(false);
    }

    async function checkSiteDisabled() {
        try {
            const data = await chrome.storage.sync.get(['disabledSites', 'disabledPages']);
            siteDisabled = (data.disabledSites || []).includes(location.hostname) || (data.disabledPages || []).includes(location.href);
        } catch (e) {
            siteDisabled = false;
        }
        refreshVisibility();
    }

    function watchSidebar() {
        const update = () => { sidebarOpen = document.body.classList.contains('highlighter-sidebar-open'); refreshVisibility(); };
        new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        update();
    }

    document.addEventListener('fullscreenchange', () => { fullscreen = !!document.fullscreenElement; refreshVisibility(); });
    window.addEventListener('qhp:visibility', updateEye);

    /* ---------------- 標註數量徽章 ---------------- */
    function updateBadge() {
        const h = window.highlighterInstance;
        const count = h && h.annotations ? h.annotations.size : 0;
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = count > 0 ? 'block' : 'none';
    }

    /* ---------------- 啟動與設定同步 ---------------- */
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes[POS_KEY] && changes[POS_KEY].newValue && !dragging) { pos = { ...pos, ...changes[POS_KEY].newValue }; place(); }
            if (changes[HIDE_KEY]) { userHidden = !!changes[HIDE_KEY].newValue; refreshVisibility(); }
        } else if (area === 'sync' && (changes.disabledSites || changes.disabledPages)) {
            checkSiteDisabled();
        }
    });

    function start() {
        document.documentElement.appendChild(host);
        place();
        watchSidebar();
        updateEye();
        updateBadge();
        setInterval(updateBadge, 1500);
        wake();
        checkSiteDisabled();
    }

    chrome.storage.local.get([POS_KEY, HIDE_KEY]).then((items) => {
        if (items[POS_KEY]) pos = { ...pos, ...items[POS_KEY] };
        userHidden = !!items[HIDE_KEY];
        if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
    });
})();
