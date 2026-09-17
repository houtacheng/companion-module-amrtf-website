// AMRTF 大慈恩官網 - Companion Bridge Background Service Worker
// 在 Extension 背景獨立環境執行，不受網頁 HTTPS Mixed Content 或 CSP 阻擋

try {
  importScripts('mqtt.min.js');
} catch (e) {
  console.error('[AMRTF-Bridge-BG] 載入 mqtt.min.js 失敗:', e);
}

let ws = null;
let wsUrl = 'ws://127.0.0.1:9999';
let reconnectTimer = null;
let heartbeatTimer = null;
let activeTabId = null;
const connectedTabs = new Map();

// MQTT 狀態與設定
let mqttClient = null;
let mqttEnabled = false;
let mqttBrokerUrl = 'ws://127.0.0.1:1884';
let mqttTopicPrefix = 'amrtf';
let mqttUsername = '';
let mqttPassword = '';
let mqttLastError = '';

console.log('[AMRTF-Bridge-BG] Background Service Worker 啟動 (v1.1.0)');

// 1. 初始化讀取設定
chrome.storage.local.get(
  ['wsUrl', 'mqttEnabled', 'mqttBrokerUrl', 'mqttTopicPrefix', 'mqttUsername', 'mqttPassword'],
  (res) => {
    if (res.wsUrl) {
      wsUrl = res.wsUrl;
    }
    connectWebSocket();

    mqttEnabled = !!res.mqttEnabled;
    if (res.mqttBrokerUrl) mqttBrokerUrl = res.mqttBrokerUrl;
    if (res.mqttTopicPrefix) mqttTopicPrefix = res.mqttTopicPrefix;
    if (res.mqttUsername !== undefined) mqttUsername = res.mqttUsername;
    if (res.mqttPassword !== undefined) mqttPassword = res.mqttPassword;

    if (mqttEnabled) {
      connectMqtt();
    }
  }
);

// 自動注入與探索現有大慈恩分頁
function scanAllAmrtfTabs() {
  chrome.tabs.query({}, (allTabs) => {
    if (!allTabs) return;

    const amrtfTabs = allTabs.filter((t) => t.url && t.url.includes('amrtf.org'));

    // 清理已不存在的分頁
    const currentTabIds = new Set(amrtfTabs.map((t) => t.id));
    for (const id of connectedTabs.keys()) {
      if (!currentTabIds.has(id)) {
        connectedTabs.delete(id);
      }
    }

    if (amrtfTabs.length === 0) {
      if (activeTabId && !currentTabIds.has(activeTabId)) {
        activeTabId = null;
      }
      broadcastTabsList();
      return;
    }

    for (const tab of amrtfTabs) {
      if (!tab.id) continue;

      if (!connectedTabs.has(tab.id)) {
        connectedTabs.set(tab.id, {
          tabId: tab.id,
          windowId: tab.windowId,
          lessonNumber: '',
          lessonTitle: tab.title || '大慈恩分頁',
          isFocused: tab.active,
          lastState: null,
        });

        // 嘗試注入 content.js (若尚未注入)
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          .catch(() => {});
      } else {
        const info = connectedTabs.get(tab.id);
        info.windowId = tab.windowId;
        if (tab.title && (!info.lessonTitle || info.lessonTitle === '大慈恩分頁')) {
          info.lessonTitle = tab.title;
        }
      }

      // 要求分頁回報最新狀態與標題
      chrome.tabs.sendMessage(tab.id, { type: 'QUERY_STATUS' }, (res) => {
        if (!chrome.runtime.lastError && res) {
          const info = connectedTabs.get(tab.id);
          if (info) {
            if (res.lessonTitle) info.lessonTitle = res.lessonTitle;
            if (res.lessonNumber) info.lessonNumber = res.lessonNumber;
            info.isFocused = !!res.isFocused;
          }
        }
      });
    }

    if (!activeTabId || !connectedTabs.has(activeTabId)) {
      const activeInWindow = amrtfTabs.find((t) => t.active);
      activeTabId = activeInWindow ? activeInWindow.id : amrtfTabs[0].id;
    }

    broadcastTabsList();
  });
}

// 定期主動掃描以確保分頁清單絕對同步 (每 2 秒)
setInterval(scanAllAmrtfTabs, 2000);

// 2. WebSocket 連線管理
function connectWebSocket() {
  if (ws) {
    try {
      ws.onclose = null;
      ws.close();
    } catch (e) {}
    ws = null;
  }

  clearTimeout(reconnectTimer);
  clearInterval(heartbeatTimer);

  try {
    console.log(`[AMRTF-Bridge-BG] 正在連線至 Companion: ${wsUrl}`);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[AMRTF-Bridge-BG] WebSocket 連線成功 (${wsUrl})！`);
      updateBadge(true);
      scanAllAmrtfTabs();
      broadcastTabsList();
      reportActiveTabState();

      // 每 5 秒發送心跳保持連線暢通
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
            broadcastTabsList();
          } catch (e) {}
        }
      }, 5000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'PONG' || msg.type === 'INIT_ACK') {
          return;
        }
        console.log('[AMRTF-Bridge-BG] 收到 Companion 指令:', msg);
        processCommand(msg);
      } catch (err) {
        console.error('[AMRTF-Bridge-BG] 解析指令失敗:', err);
      }
    };

    ws.onclose = (event) => {
      console.warn(`[AMRTF-Bridge-BG] WebSocket 斷線 (${wsUrl}, 代碼: ${event.code})，3 秒後重連...`);
      ws = null;
      updateBadge(false);
      clearInterval(heartbeatTimer);
      reconnectTimer = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('[AMRTF-Bridge-BG] WebSocket 連線錯誤:', err);
    };
  } catch (e) {
    console.error('[AMRTF-Bridge-BG] 建立 WebSocket 失敗:', e);
    updateBadge(false);
    clearInterval(heartbeatTimer);
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  }
}

function updateBadge(connected) {
  if (connected) {
    chrome.action.setBadgeText({ text: 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: '#1e8e3e' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  }
}

// 2b. 統一指令處理 (支援 Companion WebSocket 與 MQTT)
function processCommand(msg) {
  if (!msg || !msg.action) return;

  if (msg.action === 'focus_active_tab') {
    activateTab(activeTabId);
    return;
  }

  if (msg.action === 'cycle_next_tab') {
    cycleToNextTab();
    return;
  }

  if (msg.action === 'select_tab_index') {
    selectTabByIndex(msg.index);
    return;
  }

  // 指定播放講次：新增頁面並切換呈現
  if (msg.action === 'goto_lesson' || msg.action === 'open_new_tab') {
    const params = msg.params || {};
    const course = params.course && params.course !== 'current' ? params.course : 'clear-moonlight-great-ocean';
    const lesson = parseInt(params.lesson, 10) || 1;
    const pad = String(lesson).padStart(4, '0');
    const url = `https://www.amrtf.org/zh-hant/${course}-${pad}/`;
    openNewTabAndFocus(url);
    return;
  }

  // 開啟專題首頁：新增頁面並切換呈現
  if (msg.action === 'open_course_home') {
    const params = msg.params || {};
    const course = params.course || 'clear-moonlight-great-ocean';
    const url = `https://www.amrtf.org/zh-hant/${course}/`;
    openNewTabAndFocus(url);
    return;
  }

  if (msg.action === 'toggle_fullscreen') {
    toggleWindowFullscreen();
    return;
  }

  dispatchCommandToTabs(msg);
}

// 2c. MQTT 客戶端管理與雙向通訊
function disconnectMqtt() {
  if (mqttClient) {
    try {
      mqttClient.end(true);
    } catch (e) {}
    mqttClient = null;
  }
}

function connectMqtt() {
  disconnectMqtt();
  mqttLastError = '';
  if (!mqttEnabled) return;

  if (typeof mqtt === 'undefined' || !mqtt.connect) {
    mqttLastError = 'MQTT 套件尚未載入，無法連線';
    console.error('[AMRTF-Bridge-BG] ' + mqttLastError);
    return;
  }

  // 協定與通訊埠檢查：瀏覽器擴充套件環境僅支援 WebSocket (ws:// / wss://)
  if (mqttBrokerUrl.startsWith('mqtt://') || mqttBrokerUrl.startsWith('tcp://')) {
    mqttBrokerUrl = mqttBrokerUrl.replace(/^(mqtt|tcp):\/\//, 'ws://');
  } else if (mqttBrokerUrl.startsWith('mqtts://')) {
    mqttBrokerUrl = mqttBrokerUrl.replace(/^mqtts:\/\//, 'wss://');
  }
  if (mqttBrokerUrl.includes(':1883')) {
    mqttBrokerUrl = mqttBrokerUrl.replace(':1883', ':1884');
  } else if (mqttBrokerUrl.includes(':8883')) {
    mqttBrokerUrl = mqttBrokerUrl.replace(':8883', ':8884');
  }

  console.log(`[AMRTF-Bridge-BG] 正在連線至 MQTT Broker: ${mqttBrokerUrl}`);
  try {
    const opts = {
      reconnectPeriod: 4000,
      connectTimeout: 8000,
    };
    if (mqttUsername) opts.username = mqttUsername;
    if (mqttPassword) opts.password = mqttPassword;

    mqttClient = mqtt.connect(mqttBrokerUrl, opts);

    mqttClient.on('connect', () => {
      mqttLastError = '';
      console.log(`[AMRTF-Bridge-BG] MQTT 連線成功 (${mqttBrokerUrl})！主題前綴: ${mqttTopicPrefix}`);
      const prefix = mqttTopicPrefix.replace(/\/+$/, '');

      mqttClient.subscribe([
        `${prefix}/command`,
        `${prefix}/control/#`,
      ], (err) => {
        if (err) console.error('[AMRTF-Bridge-BG] MQTT 訂閱主題失敗:', err);
      });

      mqttClient.publish(`${prefix}/status/connection`, 'connected', { retain: true });
      reportActiveTabState();
    });

    mqttClient.on('message', (topic, payloadBuffer) => {
      try {
        const payloadStr = payloadBuffer.toString().trim();
        handleMqttMessage(topic, payloadStr);
      } catch (err) {
        console.error('[AMRTF-Bridge-BG] 處理 MQTT 訊息失敗:', err);
      }
    });

    mqttClient.on('error', (err) => {
      const errMsg = err && err.message ? err.message : String(err);
      console.error('[AMRTF-Bridge-BG] MQTT 錯誤:', err);
      if (errMsg.includes('net module') || errMsg.includes('TCP') || mqttBrokerUrl.includes(':1883')) {
        mqttLastError = '連線失敗：瀏覽器僅支援 WebSocket 協定 (預設埠 1884)，不支援純 TCP (1883 埠)。';
      } else {
        mqttLastError = `MQTT 錯誤: ${errMsg}`;
      }
    });

    mqttClient.on('close', () => {
      console.warn('[AMRTF-Bridge-BG] MQTT 連線中斷');
    });
  } catch (err) {
    const errMsg = err && err.message ? err.message : String(err);
    console.error('[AMRTF-Bridge-BG] 建立 MQTT 客戶端失敗:', err);
    if (errMsg.includes('net module') || mqttBrokerUrl.includes(':1883')) {
      mqttLastError = '連線失敗：瀏覽器環境不支援純 TCP (1883 埠)，請使用 WebSocket (預設埠 1884)。';
    } else {
      mqttLastError = `連線初始化失敗: ${errMsg}`;
    }
  }
}

function handleMqttMessage(topic, payloadStr) {
  const prefix = mqttTopicPrefix.replace(/\/+$/, '');
  console.log(`[AMRTF-Bridge-BG] 收到 MQTT 訊息: ${topic} => ${payloadStr}`);

  // 1. JSON 格式指令: ${prefix}/command
  if (topic === `${prefix}/command`) {
    try {
      const msg = JSON.parse(payloadStr);
      processCommand(msg);
    } catch (e) {
      processCommand({ action: payloadStr });
    }
    return;
  }

  // 2. 主題式控制: ${prefix}/control/{action}
  if (topic.startsWith(`${prefix}/control/`)) {
    const subTopic = topic.substring(`${prefix}/control/`.length);
    switch (subTopic) {
      case 'play':
        processCommand({ action: 'play' });
        break;
      case 'pause':
      case 'stop':
        processCommand({ action: 'pause' });
        break;
      case 'toggle_play':
        processCommand({ action: 'toggle_play' });
        break;
      case 'seek_relative': {
        const seconds = parseFloat(payloadStr) || 0;
        processCommand({ action: 'seek_relative', params: { seconds } });
        break;
      }
      case 'seek_to': {
        processCommand({ action: 'seek_to', params: { seconds: payloadStr } });
        break;
      }
      case 'playback_rate': {
        const rate = parseFloat(payloadStr) || 1.0;
        processCommand({ action: 'set_playback_rate', params: { rate } });
        break;
      }
      case 'theme': {
        processCommand({ action: 'set_theme', params: { theme: payloadStr } });
        break;
      }
      case 'speech_mode': {
        const enabled = payloadStr === 'toggle' ? undefined : (payloadStr === 'true' || payloadStr === '1' || payloadStr === 'on');
        processCommand({ action: 'toggle_speech_mode', params: { enabled } });
        break;
      }
      case 'scroll_mode': {
        const mode = parseInt(payloadStr, 10) || 0;
        processCommand({ action: 'set_scroll_mode', params: { mode } });
        break;
      }
      case 'font_size': {
        const size = parseFloat(payloadStr) || 16;
        processCommand({ action: 'set_font_size', params: { size } });
        break;
      }
      case 'fullscreen':
        toggleWindowFullscreen();
        break;
      case 'cycle_next_tab':
        cycleToNextTab();
        break;
      case 'focus_active_tab':
        activateTab(activeTabId);
        break;
      case 'goto_lesson': {
        try {
          const p = JSON.parse(payloadStr);
          processCommand({ action: 'goto_lesson', params: p });
        } catch (e) {
          processCommand({ action: 'goto_lesson', params: { lesson: parseInt(payloadStr, 10) || 1 } });
        }
        break;
      }
      case 'open_course_home':
        processCommand({ action: 'open_course_home', params: { course: payloadStr || 'clear-moonlight-great-ocean' } });
        break;
      case 'loop_segment': {
        try {
          const p = JSON.parse(payloadStr);
          processCommand({ action: 'toggle_loop_segment', params: p });
        } catch (e) {
          processCommand({ action: 'toggle_loop_segment', params: { target: payloadStr || 'master_quote' } });
        }
        break;
      }
      case 'jump_to_master_start':
        processCommand({ action: 'jump_to_master_start' });
        break;
      case 'open_modal_video': {
        try {
          const p = JSON.parse(payloadStr);
          processCommand({ action: 'open_modal_video', params: p });
        } catch (e) {
          processCommand({ action: 'open_modal_video', params: { videoType: payloadStr } });
        }
        break;
      }
      case 'close_modal_video':
        processCommand({ action: 'close_modal_video' });
        break;
      default:
        processCommand({ action: subTopic });
        break;
    }
  }
}

function publishStateToMqtt(stateData, tabId) {
  if (!mqttClient || !mqttClient.connected) return;

  const prefix = mqttTopicPrefix.replace(/\/+$/, '');
  const payload = {
    ...stateData,
    tabId: tabId,
    timestamp: Date.now(),
  };

  try {
    // 1. 完整 JSON 狀態
    mqttClient.publish(`${prefix}/state`, JSON.stringify(payload), { qos: 0 });

    // 2. 個別主題狀態（推播目前播放文字/字幕等）
    mqttClient.publish(`${prefix}/status/playing`, String(!!stateData.playing), { qos: 0 });
    mqttClient.publish(`${prefix}/status/current_time`, String(stateData.currentTimeStr || '00:00'), { qos: 0 });
    mqttClient.publish(`${prefix}/status/current_time_seconds`, String(stateData.currentTime || 0), { qos: 0 });
    mqttClient.publish(`${prefix}/status/duration`, String(stateData.durationStr || '00:00'), { qos: 0 });
    mqttClient.publish(`${prefix}/status/lesson_number`, String(stateData.lessonNumber || ''), { qos: 0 });
    mqttClient.publish(`${prefix}/status/lesson_title`, String(stateData.lessonTitle || ''), { qos: 0 });
    mqttClient.publish(`${prefix}/status/current_subtitle`, String(stateData.currentSubtitle || ''), { qos: 0 });
    mqttClient.publish(`${prefix}/status/theme`, String(stateData.theme || 'dark'), { qos: 0 });
    mqttClient.publish(`${prefix}/status/speech_mode`, String(!!stateData.speechMode), { qos: 0 });
    mqttClient.publish(`${prefix}/status/scroll_mode`, String(stateData.scrollMode ?? 0), { qos: 0 });
    mqttClient.publish(`${prefix}/status/looping`, String(!!stateData.looping), { qos: 0 });
  } catch (e) {
    console.error('[AMRTF-Bridge-BG] MQTT 發送狀態失敗:', e);
  }
}

// 3. 多分頁管理與切換聚焦
function broadcastTabsList() {
  const tabs = Array.from(connectedTabs.values()).map((t) => ({
    id: t.tabId,
    lessonNumber: t.lessonNumber || '',
    lessonTitle: t.lessonTitle || '',
    isFocused: t.tabId === activeTabId,
  }));

  if (mqttClient && mqttClient.connected) {
    const prefix = mqttTopicPrefix.replace(/\/+$/, '');
    try {
      mqttClient.publish(`${prefix}/status/tabs_count`, String(tabs.length), { qos: 0 });
    } catch (e) {}
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    ws.send(
      JSON.stringify({
        type: 'TABS_LIST_UPDATE',
        tabsCount: tabs.length,
        activeTabId: activeTabId,
        tabs: tabs,
      })
    );
  } catch (e) {
    console.error('[AMRTF-Bridge-BG] 發送分頁清單失敗:', e);
  }
}

// 無論目前 Chrome 在哪一個頁面，都切換並置頂聚焦顯示目標分頁
function activateTab(tabId) {
  if (!tabId) {
    const first = connectedTabs.keys().next().value;
    if (first) tabId = first;
    else return;
  }
  activeTabId = tabId;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      connectedTabs.delete(tabId);
      broadcastTabsList();
      return;
    }

    // 1. 將該分頁在該視窗設為 active
    chrome.tabs.update(tab.id, { active: true }, () => {
      // 2. 將包含該分頁的 Chrome 視窗置頂並獲得系統焦點
      if (tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true }, () => {
          chrome.tabs.update(tab.id, { active: true });
        });
      }
    });

    broadcastTabsList();
    reportActiveTabState();
  });
}

function cycleToNextTab() {
  const tabIds = Array.from(connectedTabs.keys());
  if (tabIds.length === 0) {
    scanAllAmrtfTabs();
    return;
  }
  const currentIdx = tabIds.indexOf(activeTabId);
  const nextIdx = (currentIdx + 1) % tabIds.length;
  activateTab(tabIds[nextIdx]);
}

function selectTabByIndex(index) {
  const tabIds = Array.from(connectedTabs.keys());
  if (index >= 0 && index < tabIds.length) {
    activateTab(tabIds[index]);
  }
}

function openNewTabAndFocus(url) {
  chrome.tabs.create({ url: url, active: true }, (tab) => {
    if (tab && tab.id) {
      activeTabId = tab.id;
      if (tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true });
      }
      scanAllAmrtfTabs();
    }
  });
}

function toggleWindowFullscreen() {
  const targetId = activeTabId;
  if (targetId) {
    chrome.tabs.get(targetId, (tab) => {
      const winId = tab && tab.windowId ? tab.windowId : chrome.windows.WINDOW_ID_CURRENT;
      chrome.windows.get(winId, (win) => {
        if (win && win.id) {
          const nextState = win.state === 'fullscreen' ? 'normal' : 'fullscreen';
          chrome.windows.update(win.id, { state: nextState, focused: true });
        }
      });
    });
  } else {
    chrome.windows.getCurrent((win) => {
      if (win && win.id) {
        const nextState = win.state === 'fullscreen' ? 'normal' : 'fullscreen';
        chrome.windows.update(win.id, { state: nextState, focused: true });
      }
    });
  }
}

// 4. 監聽 Chrome 分頁事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (connectedTabs.has(activeInfo.tabId)) {
    activeTabId = activeInfo.tabId;
    broadcastTabsList();
    reportActiveTabState();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('amrtf.org')) {
    if (changeInfo.status === 'complete') {
      chrome.tabs.sendMessage(tabId, { action: 'query_state' }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting
            .executeScript({
              target: { tabId: tabId },
              files: ['content.js'],
            })
            .catch(() => {});
        }
      });
    }
    scanAllAmrtfTabs();
  }
});

chrome.tabs.onRemoved.addListener((closedTabId) => {
  if (connectedTabs.has(closedTabId)) {
    connectedTabs.delete(closedTabId);
    if (activeTabId === closedTabId) {
      const nextTab = connectedTabs.keys().next().value;
      activeTabId = nextTab || null;
      if (activeTabId) {
        const nextInfo = connectedTabs.get(activeTabId);
        if (nextInfo && nextInfo.lastState) {
          sendStateToCompanion(nextInfo.lastState, activeTabId);
        }
      }
    }
    broadcastTabsList();
  }
});

// 5. 處理來自 Content Script 與 Popup 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderTabId = sender.tab ? sender.tab.id : null;

  if (request.type === 'REQ_TOGGLE_FULLSCREEN') {
    toggleWindowFullscreen();
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'TAB_REGISTER') {
    if (senderTabId) {
      connectedTabs.set(senderTabId, {
        tabId: senderTabId,
        windowId: sender.tab?.windowId,
        lessonNumber: request.data.lessonNumber,
        lessonTitle: request.data.lessonTitle,
        isFocused: request.data.isFocused,
        lastState: request.data,
      });

      if (!activeTabId || activeTabId === senderTabId || connectedTabs.size === 1 || request.data.isFocused) {
        activeTabId = senderTabId;
      }
      sendStateToCompanion(request.data, senderTabId);
      broadcastTabsList();
    }
    sendResponse({ success: true, activeTabId });
  } else if (request.type === 'TAB_STATE_UPDATE') {
    if (senderTabId) {
      const tabInfo = connectedTabs.get(senderTabId) || { tabId: senderTabId, windowId: sender.tab?.windowId };
      tabInfo.lessonNumber = request.data.lessonNumber;
      tabInfo.lessonTitle = request.data.lessonTitle;
      tabInfo.lastState = request.data;
      connectedTabs.set(senderTabId, tabInfo);

      if (senderTabId === activeTabId || connectedTabs.size === 1) {
        sendStateToCompanion(request.data, senderTabId);
      }
      broadcastTabsList();
    }
    sendResponse({ success: true });
  } else if (request.type === 'TAB_FOCUSED') {
    if (senderTabId) {
      activeTabId = senderTabId;
      const tabInfo = connectedTabs.get(senderTabId);
      if (tabInfo && tabInfo.lastState) {
        sendStateToCompanion(tabInfo.lastState, senderTabId);
      }
      broadcastTabsList();
    }
    sendResponse({ success: true });
  } else if (request.type === 'POPUP_GET_STATUS') {
    scanAllAmrtfTabs();
    sendResponse({
      wsConnected: ws && ws.readyState === WebSocket.OPEN,
      wsUrl: wsUrl,
      mqttConnected: !!(mqttClient && mqttClient.connected),
      mqttEnabled: mqttEnabled,
      mqttBrokerUrl: mqttBrokerUrl,
      mqttTopicPrefix: mqttTopicPrefix,
      mqttUsername: mqttUsername,
      mqttPassword: mqttPassword,
      mqttLastError: mqttLastError,
      activeTabId: activeTabId,
      tabsCount: connectedTabs.size,
    });
  } else if (request.type === 'POPUP_SET_CONFIG') {
    if (request.wsUrl) {
      wsUrl = request.wsUrl;
    }
    if (request.mqttEnabled !== undefined) {
      mqttEnabled = !!request.mqttEnabled;
    }
    if (request.mqttBrokerUrl) {
      mqttBrokerUrl = request.mqttBrokerUrl;
    }
    if (request.mqttTopicPrefix) {
      mqttTopicPrefix = request.mqttTopicPrefix;
    }
    if (request.mqttUsername !== undefined) {
      mqttUsername = request.mqttUsername;
    }
    if (request.mqttPassword !== undefined) {
      mqttPassword = request.mqttPassword;
    }

    chrome.storage.local.set(
      {
        wsUrl,
        mqttEnabled,
        mqttBrokerUrl,
        mqttTopicPrefix,
        mqttUsername,
        mqttPassword,
      },
      () => {
        connectWebSocket();
        if (mqttEnabled) {
          connectMqtt();
        } else {
          disconnectMqtt();
        }
      }
    );
    sendResponse({ success: true });
  } else if (request.type === 'POPUP_CLAIM_ACTIVE') {
    if (request.targetTabId) {
      activateTab(request.targetTabId);
    }
    sendResponse({ success: true });
  }
  return true;
});

// 6. 發送狀態至 Companion 與 MQTT
function sendStateToCompanion(stateData, tabId) {
  // 同步推播至 MQTT
  publishStateToMqtt(stateData, tabId);

  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const payload = {
    type: 'STATE_UPDATE',
    data: {
      ...stateData,
      tabId: tabId,
    },
  };

  try {
    ws.send(JSON.stringify(payload));
  } catch (e) {
    console.error('[AMRTF-Bridge-BG] 發送狀態至 Companion 失敗:', e);
  }
}

function reportActiveTabState() {
  if (activeTabId && connectedTabs.has(activeTabId)) {
    const tab = connectedTabs.get(activeTabId);
    if (tab.lastState) {
      sendStateToCompanion(tab.lastState, activeTabId);
    }
  }
}

// 7. 轉發 Companion 指令至分頁
function dispatchCommandToTabs(cmd) {
  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, cmd, () => {
      if (chrome.runtime.lastError) {
        broadcastToAllTabs(cmd);
      }
    });
  } else {
    broadcastToAllTabs(cmd);
  }
}

function broadcastToAllTabs(cmd) {
  chrome.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (t.id && t.url && t.url.includes('amrtf.org')) {
        chrome.tabs.sendMessage(t.id, cmd, () => {});
      }
    }
  });
}

// 8. 自動偵測 GitHub 儲存庫更新
function compareSemver(v1, v2) {
  const clean1 = (v1 || '').replace(/^[^\d]*/, '');
  const clean2 = (v2 || '').replace(/^[^\d]*/, '');
  const p1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function checkRepoUpdate() {
  chrome.storage.local.get(['githubRepo'], async (res) => {
    const repo = res.githubRepo || 'houtacheng/companion-module-amrtf-website';
    const currentVersion = chrome.runtime.getManifest().version || '1.1.0';

    let remoteVersion = null;
    let releaseUrl = `https://github.com/${repo}`;

    try {
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/chrome-extension/manifest.json?_t=${Date.now()}`;
      const r = await fetch(rawUrl, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        remoteVersion = data.version;
      }
    } catch (e) {}

    if (!remoteVersion) {
      try {
        const r2 = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
        if (r2.ok) {
          const rel = await r2.json();
          remoteVersion = (rel.tag_name || '').replace(/^[^\d]*/, '');
          if (rel.html_url) releaseUrl = rel.html_url;
        }
      } catch (e) {}
    }

    if (remoteVersion && compareSemver(remoteVersion, currentVersion) > 0) {
      console.log(`[AMRTF-Bridge-BG] 發現新版本 v${remoteVersion} (當前: v${currentVersion})`);
      chrome.storage.local.set({
        updateAvailable: true,
        latestVersion: remoteVersion,
        updateUrl: releaseUrl,
      });
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
    } else if (remoteVersion) {
      chrome.storage.local.set({ updateAvailable: false });
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

// 註冊定時警報 (每 360 分鐘 = 6 小時檢查一次)
try {
  chrome.alarms.create('CHECK_REPO_UPDATE', { periodInMinutes: 360 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'CHECK_REPO_UPDATE') {
      checkRepoUpdate();
    }
  });
  // Service Worker 啟動後延遲 3 秒執行一次靜默檢查
  setTimeout(checkRepoUpdate, 3000);
} catch (e) {
  console.warn('[AMRTF-Bridge-BG] 設定檢查更新定時器失敗:', e);
}

