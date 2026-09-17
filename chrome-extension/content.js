// AMRTF 大慈恩官網 - Companion Bridge Content Script
// 專責操作網頁 DOM 與 Audio，透過 Extension runtime 與 Background 溝通
(function () {
  if (window.__AMRTF_CONTENT_SCRIPT_INJECTED__) {
    console.log('[AMRTF-Companion] Content Script 已載入過，跳過重複載入');
    return;
  }
  window.__AMRTF_CONTENT_SCRIPT_INJECTED__ = true;

  console.log('[AMRTF-Companion] Content Script 已載入 (v1.1.0)');

  let statusThrottleTimer = null;
  let loopConfig = { enabled: false, start: 0, end: 0 };
  let customSegment = { enabled: false, start: 0, end: 0, loop: false };

  const COURSE_HOME_MAP = {
    'clear-moonlight-great-ocean': '/zh-hant/clear-moonlight-great-ocean/',
    'vipasyana-supramundane-insight': '/zh-hant/vipasyana-supramundane-insight/',
    'serenity-insight-introduction': '/zh-hant/serenity-insight-introduction/',
    'lamrim-death-impermanence': '/zh-hant/lamrim-death-impermanence/',
    'sutra-stories': '/zh-hant/sutra-stories/',
    'lamrim-condensed-points': '/zh-hant/lamrim-condensed-points/',
    'eight-verses-mind-training': '/zh-hant/eight-verses-mind-training/',
    'blossoming-merit': '/zh-hant/blossoming-merit/',
    'lamrim-transcripts-nanputuo': '/zh-hant/lamrim-transcripts-nanputuo/',
    'lamrim-transcripts-fengshan': '/zh-hant/lamrim-transcripts-fengshan/',
    'nanshan-vinaya-transcripts1991': '/zh-hant/nanshan-vinaya-transcripts1991/',
    'nanshan-vinaya-transcripts2000': '/zh-hant/nanshan-vinaya-transcripts2000/',
  };

  function isPageActive() {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  function notifyFocus() {
    try {
      chrome.runtime.sendMessage({ type: 'TAB_FOCUSED' });
      sendCurrentState();
    } catch (e) {}
  }

  window.addEventListener('focus', notifyFocus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      notifyFocus();
    }
  });

  // 1. 取得音訊與頁面元素
  function getAudio() {
    return document.querySelector('audio');
  }

  function getLessonNumber() {
    const metaVol = document.querySelector('meta[name="volume"]');
    if (metaVol && metaVol.content) return metaVol.content;
    const bodyVol = document.body?.getAttribute('data-volume');
    if (bodyVol) return bodyVol;
    const match = window.location.pathname.match(/-(\d+)\/?$/);
    return match ? match[1] : '';
  }

  function getCurrentCoursePrefix() {
    const match = window.location.pathname.match(/\/zh-hant\/([a-zA-Z0-9-]+?)(?:-\d+)?\/?$/);
    return match ? match[1] : 'clear-moonlight-great-ocean';
  }

  function getLessonTitle() {
    const entryTitle = document.querySelector('h1.entry-title, h2.entry-title, h1.page-title');
    if (entryTitle && entryTitle.textContent.trim()) {
      return entryTitle.textContent.trim();
    }
    return document.title.split('-')[0].trim();
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function parseTimeToSeconds(str) {
    if (str === null || str === undefined || str === '') return 0;
    if (typeof str === 'number') return str;
    const clean = String(str).trim().replace(/^#/, '');
    // 若含有冒號（半形 : 或全形 ：）
    if (clean.includes(':') || clean.includes('：')) {
      const parts = clean.split(/[:：]/).map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  function parseMasterAudioRange() {
    try {
      const pageText = document.body ? document.body.innerText : '';
      const match = pageText.match(/音檔[：:\s]+(\d+[AB])?\s*(\d+):(\d+)\s*[~～]\s*(\d+[AB])?\s*(\d+):(\d+)/i) ||
                    pageText.match(/(\d+):(\d+)\s*[~～]\s*(\d+):(\d+)/);
      if (match) {
        if (match.length >= 7 && match[2] !== undefined) {
          const startSec = parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
          const endSec = parseInt(match[5], 10) * 60 + parseInt(match[6], 10);
          return { start: startSec, end: endSec, label: match[0] };
        } else if (match[1] !== undefined) {
          const startSec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
          const endSec = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
          return { start: startSec, end: endSec, label: match[0] };
        }
      }
    } catch (e) {}
    return null;
  }

  function getAllPageTimestamps() {
    const seekList = Array.from(document.querySelectorAll('span.seek-to, [data-time]'));
    const list = [];
    seekList.forEach((el) => {
      const t = parseTimeToSeconds(el.getAttribute('data-time'));
      if (!isNaN(t) && !list.includes(t)) {
        list.push(t);
      }
    });
    list.sort((a, b) => a - b);
    return list;
  }

  function findMasterAudioStart() {
    const audio = getAudio();
    if (!audio) return;

    // 1. 尋找 blockquote (大慈恩師父手抄稿引用區塊)
    const bq = document.querySelector('blockquote, .master-quote, .qbox');
    if (bq) {
      // 取得 blockquote 內的時間節點
      const innerSeek = bq.querySelector('span.seek-to, [data-time]');
      if (innerSeek) {
        const endTime = parseTimeToSeconds(innerSeek.getAttribute('data-time'));
        const timestamps = getAllPageTimestamps();
        const idx = timestamps.indexOf(endTime);
        if (idx > 0) {
          const startTime = timestamps[idx - 1];
          audio.currentTime = startTime;
          if (audio.paused) doPlay();
          return;
        }
      }

      // 檢查緊鄰的前一個元素上的時間標記
      const prevSeek = bq.previousElementSibling?.querySelector?.('span.seek-to, [data-time]') ||
                       (bq.previousElementSibling?.matches?.('span.seek-to, [data-time]') ? bq.previousElementSibling : null);
      if (prevSeek) {
        const t = parseTimeToSeconds(prevSeek.getAttribute('data-time'));
        if (!isNaN(t)) {
          audio.currentTime = t;
          if (audio.paused) doPlay();
          return;
        }
      }
    }

    // 2. 尋找頁面上首個 a.mvt
    const firstMvt = document.querySelector('a.mvt');
    if (firstMvt) {
      firstMvt.click();
      return;
    }

    // 3. 搜尋文字中的起訖範圍
    const range = parseMasterAudioRange();
    if (range && range.start !== undefined) {
      audio.currentTime = range.start;
      if (audio.paused) doPlay();
      return;
    }
  }

  function getParagraphSegment(currentTime) {
    // 1. 優先使用大慈恩官網手抄稿的 span.seek-to 時間節點
    const timestamps = getAllPageTimestamps();
    if (timestamps.length >= 2) {
      if (currentTime < timestamps[0]) {
        return { start: 0, end: timestamps[0] };
      }
      for (let i = 0; i < timestamps.length - 1; i++) {
        if (currentTime >= timestamps[i] && currentTime < timestamps[i + 1]) {
          return { start: timestamps[i], end: timestamps[i + 1] };
        }
      }
      const last = timestamps[timestamps.length - 1];
      const audio = getAudio();
      const max = audio && audio.duration ? audio.duration : last + 30;
      return { start: last, end: max };
    }

    // 2. 若頁面為 span.lrc 格式
    const lrcList = Array.from(document.querySelectorAll('span.lrc, span[data-s]'));
    if (lrcList.length > 0) {
      let currentLrc = lrcList.find(span => {
        const s = parseFloat(span.getAttribute('data-s') || '0');
        const e = parseFloat(span.getAttribute('data-e') || '999999');
        return currentTime >= s && currentTime <= e;
      });

      if (!currentLrc) {
        for (let i = lrcList.length - 1; i >= 0; i--) {
          const s = parseFloat(lrcList[i].getAttribute('data-s') || '0');
          if (s <= currentTime) {
            currentLrc = lrcList[i];
            break;
          }
        }
      }

      if (currentLrc) {
        const parentP = currentLrc.closest('p') || currentLrc.parentElement;
        if (parentP) {
          const pSpans = Array.from(parentP.querySelectorAll('span.lrc, span[data-s]'));
          if (pSpans.length > 0) {
            const start = parseFloat(pSpans[0].getAttribute('data-s') || '0');
            const lastSpan = pSpans[pSpans.length - 1];
            const end = parseFloat(lastSpan.getAttribute('data-e') || (start + 15).toString());
            if (end > start) {
              return { start, end };
            }
          }
        }

        const s = parseFloat(currentLrc.getAttribute('data-s') || '0');
        const e = parseFloat(currentLrc.getAttribute('data-e') || (s + 10).toString());
        return { start: s, end: e };
      }
    }

    return {
      start: Math.max(0, Math.floor(currentTime)),
      end: Math.floor(currentTime) + 15,
    };
  }

  function getCurrentSubtitle(currentTime) {
    // 1. 若當前已有反白元素（播稿模式文字反白高亮）
    const highlighted = document.querySelector('.lrc-highlight, .highlight-lrc, .highlight, span.lrc.active, span.lrc.on');
    if (highlighted && highlighted.textContent && highlighted.textContent.trim()) {
      return highlighted.textContent.trim();
    }

    // 2. 若頁面為 span.lrc 格式
    const lrcList = Array.from(document.querySelectorAll('span.lrc, span[data-s]'));
    if (lrcList.length > 0) {
      let currentLrc = lrcList.find((span) => {
        const s = parseFloat(span.getAttribute('data-s') || '0');
        const e = parseFloat(span.getAttribute('data-e') || '999999');
        return currentTime >= s && currentTime <= e;
      });

      if (!currentLrc) {
        for (let i = lrcList.length - 1; i >= 0; i--) {
          const s = parseFloat(lrcList[i].getAttribute('data-s') || '0');
          if (s <= currentTime) {
            currentLrc = lrcList[i];
            break;
          }
        }
      }

      if (currentLrc && currentLrc.textContent && currentLrc.textContent.trim()) {
        return currentLrc.textContent.trim();
      }
    }

    // 3. 若為 span.seek-to, [data-time] 段落
    const seekList = Array.from(document.querySelectorAll('span.seek-to, [data-time]'));
    if (seekList.length > 0) {
      let matchedSeek = null;
      for (let i = seekList.length - 1; i >= 0; i--) {
        const t = parseTimeToSeconds(seekList[i].getAttribute('data-time'));
        if (!isNaN(t) && t <= currentTime) {
          matchedSeek = seekList[i];
          break;
        }
      }
      if (matchedSeek) {
        const p = matchedSeek.closest('p') || matchedSeek.parentElement;
        if (p) {
          const text = p.textContent ? p.textContent.trim() : '';
          if (text) {
            return text.replace(/^\[\d+:\d+(?::\d+)?\]\s*/, '').slice(0, 150);
          }
        }
        return matchedSeek.textContent ? matchedSeek.textContent.trim() : '';
      }
    }

    return '';
  }

  function collectState() {
    const audio = getAudio();
    const currentTime = audio ? audio.currentTime : 0;
    const duration = audio && !isNaN(audio.duration) ? audio.duration : 0;
    const isPlaying = audio ? !audio.paused && !audio.ended : false;
    const playbackRate = audio ? audio.playbackRate : 1.0;

    const isLight = document.body.classList.contains('amec_theme') ||
                    document.querySelector('input[name="bottom_toolbar_theme"]:checked')?.value === '1';

    const scrollModeChecked = document.querySelector('input[name="bottom_toolbar_autoscroll"]:checked');
    const scrollMode = scrollModeChecked ? scrollModeChecked.value : '0';

    const speechModeInput = document.getElementById('bottom_toolbar_speechmode');
    const speechMode = speechModeInput ? speechModeInput.checked : false;

    const fontSlider = document.getElementById('setFontSlider');
    const fontSize = fontSlider ? parseFloat(fontSlider.value) : 16;

    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const masterRange = parseMasterAudioRange();
    const currentSubtitle = getCurrentSubtitle(currentTime);

    return {
      lessonNumber: getLessonNumber(),
      lessonTitle: getLessonTitle(),
      playing: isPlaying,
      currentTime: Math.round(currentTime * 10) / 10,
      currentTimeStr: formatTime(currentTime),
      duration: Math.round(duration * 10) / 10,
      durationStr: formatTime(duration),
      playbackRate: playbackRate,
      theme: isLight ? 'light' : 'dark',
      scrollMode: parseInt(scrollMode, 10),
      speechMode: speechMode,
      fontSize: fontSize,
      isFullscreen: isFullscreen,
      looping: loopConfig.enabled,
      masterRange: masterRange,
      currentSubtitle: currentSubtitle,
      isFocused: isPageActive(),
    };
  }

  // 輔助操作函式
  function doPlay() {
    const mejsBtn = document.querySelector('.mejs-play button, .mejs-playpause-button.mejs-play button');
    if (mejsBtn) {
      mejsBtn.click();
      return;
    }
    const audio = getAudio();
    if (audio) {
      audio.play().catch((e) => {
        console.warn('Play error:', e);
        const anyBtn = document.querySelector('.mejs-playpause-button button');
        if (anyBtn) anyBtn.click();
      });
    } else {
      const anyBtn = document.querySelector('.mejs-playpause-button button');
      if (anyBtn) anyBtn.click();
    }
  }

  function doPause() {
    const pauseBtn = document.querySelector('.mejs-pause button, .mejs-playpause-button.mejs-pause button');
    if (pauseBtn) {
      pauseBtn.click();
      return;
    }
    const audio = getAudio();
    if (audio) {
      audio.pause();
    }
  }

  function doTogglePlay() {
    const audio = getAudio();
    if (audio) {
      if (audio.paused || audio.ended) {
        doPlay();
      } else {
        doPause();
      }
    } else {
      const btn = document.querySelector('.mejs-playpause-button button');
      if (btn) btn.click();
    }
  }

  function seekAudio(targetSec, shouldPlay = true) {
    const audio = getAudio();
    const target = Math.max(0, parseFloat(targetSec) || 0);

    // 1. 如果有 exact 或最接近的 seek-to / lrc 標籤，點擊觸發網頁原生滾動與跳轉
    const seekElements = Array.from(document.querySelectorAll('span.seek-to, [data-time], span.lrc, span[data-s]'));
    for (const el of seekElements) {
      const t = el.hasAttribute('data-time') ? parseTimeToSeconds(el.getAttribute('data-time')) : parseFloat(el.getAttribute('data-s') || '0');
      if (!isNaN(t) && Math.abs(t - target) < 0.5) {
        try {
          el.click();
          break;
        } catch (e) {}
      }
    }

    // 2. 原生 audio 設定 currentTime
    if (audio) {
      try {
        audio.currentTime = target;
      } catch (e) {}

      // 觸發原生事件通知所有播放器外觀與時間軸更新
      try {
        audio.dispatchEvent(new Event('seeking', { bubbles: true }));
        audio.dispatchEvent(new Event('timeupdate', { bubbles: true }));
        audio.dispatchEvent(new Event('seeked', { bubbles: true }));
      } catch (e) {}

      if (shouldPlay && audio.paused) {
        doPlay();
      }
    }

    // 3. 若有 mediaelement.js 播放器實例，同步調用其 setCurrentTime
    try {
      if (window.mejs && window.mejs.players) {
        for (const key in window.mejs.players) {
          const p = window.mejs.players[key];
          if (p && typeof p.setCurrentTime === 'function') {
            p.setCurrentTime(target);
          }
        }
      }
    } catch (e) {}

    scheduleThrottledStateUpdate();
  }

  function applyTheme(targetTheme) {
    const isLightNow = document.body.classList.contains('amec_theme');
    let makeLight = !isLightNow;
    if (targetTheme === 'dark' || targetTheme === '0') {
      makeLight = false;
    } else if (targetTheme === 'light' || targetTheme === '1') {
      makeLight = true;
    }

    const cssDefault = document.getElementById('css_default');
    const cssAmec = document.getElementById('css_amec');

    if (makeLight) {
      document.body.classList.add('amec_theme');
      if (cssDefault) cssDefault.removeAttribute('rel');
      if (cssAmec) cssAmec.setAttribute('rel', 'stylesheet');
      const radio1 = document.getElementById('bottom_toolbar_theme-1');
      if (radio1) radio1.checked = true;
      try { localStorage.setItem('amrtf_high_contrast_temp2', JSON.stringify('1')); } catch (e) {}
    } else {
      document.body.classList.remove('amec_theme');
      if (cssAmec) cssAmec.removeAttribute('rel');
      if (cssDefault) cssDefault.setAttribute('rel', 'stylesheet');
      const radio0 = document.getElementById('bottom_toolbar_theme-0');
      if (radio0) radio0.checked = true;
      try { localStorage.setItem('amrtf_high_contrast_temp2', JSON.stringify('0')); } catch (e) {}
    }

    const targetId = makeLight ? 'bottom_toolbar_theme-1' : 'bottom_toolbar_theme-0';
    const label = document.querySelector(`label[for="${targetId}"]`);
    if (label) label.click();

    sendCurrentState();
  }

  function playModalVideo(modalId, triggerSelector) {
    // 1. 播放影片前先暫停背景課程音訊
    doPause();

    // 2. 點擊觸發按鈕以開啟彈窗
    let btn = triggerSelector ? document.querySelector(triggerSelector) : null;
    if (!btn && modalId) {
      btn = document.querySelector(`a[href="#${modalId}"]`);
    }
    if (btn) {
      btn.click();
    }

    // 3. 自動從頭播放 YouTube 影片 (0:00)
    setTimeout(() => {
      const modal = document.getElementById(modalId) || document.querySelector('.omw-modal.open');
      if (!modal) return;
      const iframe = modal.querySelector('iframe');
      if (!iframe) return;

      try {
        let src = iframe.src || iframe.getAttribute('src') || '';
        if (src) {
          const url = new URL(src, window.location.origin);
          url.searchParams.set('autoplay', '1');
          url.searchParams.set('enablejsapi', '1');
          url.searchParams.set('start', '0');
          if (iframe.src !== url.toString()) {
            iframe.src = url.toString();
          }
        }
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }
      } catch (e) {
        console.warn('Modal video autoplay failed:', e);
      }
    }, 400);
  }

  function triggerModalMigtsema() {
    playModalVideo('omw-114567', 'a[href="#omw-114567"], a.button_prepare:has(span), a.button_prepare');
  }

  function triggerModalPrepVideo() {
    playModalVideo('omw-32781', 'a[href="#omw-32781"]');
  }

  function triggerModalDedicationVideo() {
    playModalVideo('omw-33934', '#modal_omw_33934, a[href="#omw-33934"]');
  }

  function triggerModalClose() {
    // 徹底停止所有影片播放
    const iframes = document.querySelectorAll('.omw-modal iframe, iframe[src*="youtube"], iframe[src*="youtu.be"]');
    iframes.forEach((iframe) => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), '*');
        }
      } catch (e) {}

      // 重設 src 以徹底終止音訊輸出
      try {
        const originalSrc = iframe.src || iframe.getAttribute('src');
        if (originalSrc && originalSrc !== 'about:blank') {
          iframe.src = 'about:blank';
          setTimeout(() => {
            try {
              iframe.src = originalSrc.replace(/autoplay=1/g, 'autoplay=0');
            } catch (e) {}
          }, 300);
        }
      } catch (e) {}
    });

    const closeBtn = document.querySelector('.omw-modal.open .omw-close-modal, .omw-close-modal, a[href*="modal-window-close"]');
    if (closeBtn) closeBtn.click();
    document.querySelectorAll('.omw-modal.open').forEach((m) => m.classList.remove('open'));
  }

  // 2. 回報狀態至 Background
  function sendCurrentState(isRegister = false) {
    const data = collectState();
    try {
      chrome.runtime.sendMessage({
        type: isRegister ? 'TAB_REGISTER' : 'TAB_STATE_UPDATE',
        data: data,
      });
    } catch (e) {}
  }

  function scheduleThrottledStateUpdate() {
    if (statusThrottleTimer) return;
    statusThrottleTimer = setTimeout(() => {
      statusThrottleTimer = null;
      sendCurrentState();
    }, 250);
  }

  // 3. 綁定音訊事件
  function attachAudioListeners() {
    const audio = getAudio();
    if (!audio) {
      setTimeout(attachAudioListeners, 500);
      return;
    }

    audio.addEventListener('play', () => {
      notifyFocus();
      scheduleThrottledStateUpdate();
    });
    audio.addEventListener('pause', scheduleThrottledStateUpdate);
    audio.addEventListener('ended', scheduleThrottledStateUpdate);
    audio.addEventListener('timeupdate', () => {
      if (loopConfig.enabled && loopConfig.end > loopConfig.start) {
        if (audio.currentTime >= loopConfig.end) {
          audio.currentTime = loopConfig.start;
          if (audio.paused) doPlay();
        }
      }

      if (customSegment.enabled && customSegment.end > customSegment.start) {
        if (audio.currentTime >= customSegment.end) {
          if (customSegment.loop) {
            audio.currentTime = customSegment.start;
            if (audio.paused) doPlay();
          } else {
            doPause();
            customSegment.enabled = false;
          }
        }
      }

      scheduleThrottledStateUpdate();
    });
    audio.addEventListener('ratechange', scheduleThrottledStateUpdate);
    audio.addEventListener('loadedmetadata', scheduleThrottledStateUpdate);
  }

  attachAudioListeners();

  // 監聽介面設定控制項變動
  document.addEventListener('change', (e) => {
    if (
      e.target.name === 'bottom_toolbar_theme' ||
      e.target.name === 'bottom_toolbar_autoscroll' ||
      e.target.id === 'bottom_toolbar_speechmode' ||
      e.target.id === 'setFontSlider'
    ) {
      scheduleThrottledStateUpdate();
    }
  });

  document.addEventListener('fullscreenchange', scheduleThrottledStateUpdate);

  // 4. 監聽來自 Background 的指令
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'QUERY_STATUS') {
      sendResponse({
        lessonTitle: getLessonTitle(),
        lessonNumber: getLessonNumber(),
        isFocused: isPageActive(),
      });
      return true;
    }

    console.log('[AMRTF-Companion] 執行指令:', msg);
    const audio = getAudio();
    const action = msg.action;
    const params = msg.params || {};

    switch (action) {
      case 'play':
        doPlay();
        break;

      case 'pause':
        doPause();
        break;

      case 'toggle_play':
        doTogglePlay();
        break;

      case 'restart':
      case 'play_from_start':
        customSegment.enabled = false;
        seekAudio(0, true);
        break;

      case 'modal_migtsema':
        triggerModalMigtsema();
        break;

      case 'modal_prep_video':
        triggerModalPrepVideo();
        break;

      case 'modal_dedication_video':
        triggerModalDedicationVideo();
        break;

      case 'modal_close':
        triggerModalClose();
        break;

      case 'seek_relative': {
        const delta = parseFloat(params.seconds) || 0;
        const a = getAudio();
        if (a) {
          const target = Math.max(0, Math.min(a.duration || 99999, a.currentTime + delta));
          seekAudio(target, !a.paused);
        }
        break;
      }

      case 'seek_absolute':
      case 'seek_to': {
        const rawVal = params.time !== undefined ? params.time : params.seconds;
        const target = parseTimeToSeconds(rawVal);
        // 跳至指定時間時，清空舊自訂段落限制並立即跳轉播放
        customSegment.enabled = false;
        seekAudio(target, true);
        break;
      }

      case 'play_custom_segment': {
        const startSec = parseTimeToSeconds(params.start_time || params.start);
        const endSec = parseTimeToSeconds(params.end_time || params.end);
        const shouldLoop = !!params.loop;

        customSegment = {
          enabled: true,
          start: startSec,
          end: endSec > startSec ? endSec : startSec + 60,
          loop: shouldLoop,
        };

        seekAudio(startSec, true);
        break;
      }

      case 'set_playback_rate': {
        const rate = parseFloat(params.rate) || 1.0;
        if (audio) audio.playbackRate = rate;
        break;
      }

      case 'prev_lesson': {
        const prevLink = document.querySelector('.nav-previous a');
        if (prevLink && prevLink.href) {
          window.location.href = prevLink.href;
        } else {
          const curr = parseInt(getLessonNumber(), 10);
          if (curr > 1) {
            const prefix = getCurrentCoursePrefix();
            const pad = String(curr - 1).padStart(4, '0');
            window.location.href = `/zh-hant/${prefix}-${pad}/`;
          }
        }
        break;
      }

      case 'next_lesson': {
        const nextLink = document.querySelector('.nav-next a');
        if (nextLink && nextLink.href) {
          window.location.href = nextLink.href;
        } else {
          const curr = parseInt(getLessonNumber(), 10);
          if (!isNaN(curr)) {
            const prefix = getCurrentCoursePrefix();
            const pad = String(curr + 1).padStart(4, '0');
            window.location.href = `/zh-hant/${prefix}-${pad}/`;
          }
        }
        break;
      }

      case 'goto_lesson': {
        const num = parseInt(params.lesson, 10);
        if (!isNaN(num) && num > 0) {
          const pad = String(num).padStart(4, '0');
          const prefix = (params.course && params.course !== 'current') ? params.course : getCurrentCoursePrefix();
          window.location.href = `/zh-hant/${prefix}-${pad}/`;
        }
        break;
      }

      case 'open_course_home': {
        if (params.course && COURSE_HOME_MAP[params.course]) {
          window.location.href = COURSE_HOME_MAP[params.course];
        }
        break;
      }

      case 'jump_to_master_start': {
        if (params.seconds !== undefined) {
          if (audio) {
            audio.currentTime = parseFloat(params.seconds);
            if (audio.paused) doPlay();
          }
        } else {
          findMasterAudioStart();
        }
        break;
      }

      case 'toggle_loop_segment': {
        if (params.enabled !== undefined) {
          loopConfig.enabled = !!params.enabled;
        } else {
          loopConfig.enabled = !loopConfig.enabled;
        }

        if (loopConfig.enabled) {
          if (params.start !== undefined && params.end !== undefined) {
            loopConfig.start = parseFloat(params.start);
            loopConfig.end = parseFloat(params.end);
          } else if (params.target === 'master_quote') {
            const range = parseMasterAudioRange();
            if (range) {
              loopConfig.start = range.start;
              loopConfig.end = range.end;
            }
          } else {
            // 預設為 current_paragraph (目前播放的這段重複播放)
            if (audio) {
              const seg = getParagraphSegment(audio.currentTime);
              loopConfig.start = seg.start;
              loopConfig.end = seg.end;
            }
          }

          if (audio && loopConfig.start >= 0) {
            audio.currentTime = loopConfig.start;
            doPlay();
          }
        }
        sendCurrentState();
        break;
      }

      case 'toggle_fullscreen': {
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch (e) {}
        try {
          chrome.runtime.sendMessage({ type: 'REQ_TOGGLE_FULLSCREEN' });
        } catch (e) {}
        break;
      }

      case 'set_theme': {
        applyTheme(params.theme);
        break;
      }

      case 'set_scroll_mode': {
        const mode = params.mode !== undefined ? params.mode : '0';
        const label = document.querySelector(`label[for="bottom_toolbar_autoscroll-${mode}"]`);
        if (label) {
          label.click();
        } else {
          const input = document.getElementById(`bottom_toolbar_autoscroll-${mode}`);
          if (input) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        sendCurrentState();
        break;
      }

      case 'toggle_speech_mode': {
        const input = document.getElementById('bottom_toolbar_speechmode');
        if (input) {
          if (params.enabled !== undefined) {
            if (input.checked !== !!params.enabled) {
              input.click();
            }
          } else {
            input.click();
          }
        }
        sendCurrentState();
        break;
      }

      case 'set_font_size': {
        const size = parseFloat(params.size) || 16;
        const slider = document.getElementById('setFontSlider');
        if (slider) {
          slider.value = size;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }

      case 'adjust_font_size': {
        const delta = parseFloat(params.delta) || 1.5;
        const slider = document.getElementById('setFontSlider');
        if (slider) {
          let curr = parseFloat(slider.value) || 16;
          slider.value = Math.max(10, Math.min(22, curr + delta));
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }

      case 'query_state':
        sendCurrentState();
        break;
    }

    scheduleThrottledStateUpdate();
    sendResponse({ success: true });
    return true;
  });

  // 初始註冊本分頁
  sendCurrentState(true);
})();
