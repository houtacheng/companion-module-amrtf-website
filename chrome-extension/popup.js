document.addEventListener('DOMContentLoaded', async () => {
  const hostIpInput = document.getElementById('hostIp');
  const portNumInput = document.getElementById('portNum');
  const setLocalhostBtn = document.getElementById('setLocalhostBtn');
  const saveBtn = document.getElementById('saveBtn');
  const saveFeedback = document.getElementById('saveFeedback');
  const statusContainer = document.getElementById('statusContainer');
  const statusText = document.getElementById('statusText');
  const pageCard = document.getElementById('pageCard');
  const pageTitle = document.getElementById('pageTitle');
  const pageDesc = document.getElementById('pageDesc');
  const claimActiveBtn = document.getElementById('claimActiveBtn');

  // MQTT 控制項
  const mqttEnabledCheckbox = document.getElementById('mqttEnabled');
  const mqttFields = document.getElementById('mqttFields');
  const mqttProtocolSelect = document.getElementById('mqttProtocol');
  const mqttHostInput = document.getElementById('mqttHost');
  const mqttPortInput = document.getElementById('mqttPort');
  const mqttPathInput = document.getElementById('mqttPath');
  const mqttBrokerUrlInput = document.getElementById('mqttBrokerUrl');
  const mqttErrorTip = document.getElementById('mqttErrorTip');
  const mqttTopicPrefixInput = document.getElementById('mqttTopicPrefix');
  const mqttUsernameInput = document.getElementById('mqttUsername');
  const mqttPasswordInput = document.getElementById('mqttPassword');
  const mqttStatusBadge = document.getElementById('mqttStatusBadge');

  // 更新偵測控制項
  const versionTag = document.getElementById('versionTag');
  const updateBanner = document.getElementById('updateBanner');
  const updateBannerTitle = document.getElementById('updateBannerTitle');
  const updateBannerMsg = document.getElementById('updateBannerMsg');
  const updateBannerLink = document.getElementById('updateBannerLink');
  const closeUpdateBanner = document.getElementById('closeUpdateBanner');
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const updateCheckStatus = document.getElementById('updateCheckStatus');
  const DEFAULT_GITHUB_REPO = 'houtacheng/companion-module-amrtf-website';

  const currentManifest = chrome.runtime.getManifest();
  if (versionTag && currentManifest.version) {
    versionTag.textContent = `v${currentManifest.version}`;
  }

  if (closeUpdateBanner) {
    closeUpdateBanner.addEventListener('click', () => {
      updateBanner.style.display = 'none';
    });
  }

  let currentLastError = '';

  mqttEnabledCheckbox.addEventListener('change', () => {
    mqttFields.style.display = mqttEnabledCheckbox.checked ? 'block' : 'none';
  });

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

  async function checkForUpdates(manual = false) {
    const repo = DEFAULT_GITHUB_REPO;
    const curVer = currentManifest.version || '1.1.0';

    if (manual && updateCheckStatus) {
      updateCheckStatus.textContent = '正在連線至 GitHub 檢查更新...';
      updateCheckStatus.style.color = '#5f6368';
    }

    try {
      let remoteVersion = null;
      let releaseUrl = `https://github.com/${repo}`;

      // 1. 優先從 raw.githubusercontent.com 取得最新 manifest.json
      try {
        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/chrome-extension/manifest.json?_t=${Date.now()}`;
        const res = await fetch(rawUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          remoteVersion = data.version;
        }
      } catch (e) {}

      // 2. 若 raw 取得失敗，嘗試取得 GitHub Releases
      if (!remoteVersion) {
        try {
          const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
          const res = await fetch(apiUrl);
          if (res.ok) {
            const release = await res.json();
            remoteVersion = (release.tag_name || '').replace(/^[^\d]*/, '');
            if (release.html_url) releaseUrl = release.html_url;
          }
        } catch (e) {}
      }

      if (!remoteVersion) {
        if (manual && updateCheckStatus) {
          updateCheckStatus.textContent = '⚠️ 暫無法取得遠端版本資訊（請確認儲存庫是否已發布或網路正常）';
          updateCheckStatus.style.color = '#c5221f';
        }
        return;
      }

      const cmp = compareSemver(remoteVersion, curVer);
      if (cmp > 0) {
        if (updateBanner) {
          updateBanner.style.display = 'block';
          updateBannerTitle.textContent = `🎉 發現新版本 v${remoteVersion}！`;
          updateBannerMsg.textContent = `GitHub 儲存庫已釋出新版本（當前版本為 v${curVer}）。`;
          updateBannerLink.href = releaseUrl;
        }
        if (updateCheckStatus) {
          updateCheckStatus.textContent = `⚡ 發現新版本: v${remoteVersion}！`;
          updateCheckStatus.style.color = '#0b57d0';
        }

        chrome.storage.local.set({
          updateAvailable: true,
          latestVersion: remoteVersion,
          updateUrl: releaseUrl,
        });

        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
      } else {
        if (updateBanner) updateBanner.style.display = 'none';
        if (updateCheckStatus) {
          updateCheckStatus.textContent = `✓ 目前已是最新版本 (v${curVer})`;
          updateCheckStatus.style.color = '#137333';
        }

        chrome.storage.local.set({ updateAvailable: false });
        chrome.action.setBadgeText({ text: '' });
      }
    } catch (err) {
      if (manual && updateCheckStatus) {
        updateCheckStatus.textContent = `⚠️ 檢查更新失敗: ${err.message || err}`;
        updateCheckStatus.style.color = '#c5221f';
      }
    }
  }

  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', () => checkForUpdates(true));
  }

  function validateProtocolWarning() {
    if (currentLastError) {
      mqttErrorTip.style.display = 'block';
      mqttErrorTip.textContent = currentLastError;
      return;
    }
    const curPort = (mqttPortInput.value || '').trim();
    if (curPort === '1883') {
      mqttErrorTip.style.display = 'block';
      mqttErrorTip.textContent = '⚠️ 提醒：1883 是純 TCP 通訊埠，瀏覽器外掛無法直連。請將連接埠改為 1884 (WebSocket 埠)。';
    } else if (curPort === '8883') {
      mqttErrorTip.style.display = 'block';
      mqttErrorTip.textContent = '⚠️ 提醒：8883 是純 TCP SSL 通訊埠，瀏覽器外掛無法直連。請將連接埠改為 8884 (WebSocket SSL 埠)。';
    } else {
      mqttErrorTip.style.display = 'none';
    }
  }

  function updateBrokerUrlFromParts() {
    const proto = mqttProtocolSelect.value || 'ws://';
    let host = (mqttHostInput.value || '').trim() || '127.0.0.1';
    host = host.replace(/^(ws|wss|mqtt|mqtts|tcp):\/\//, '');
    const port = (mqttPortInput.value || '').trim();
    let path = (mqttPathInput.value || '').trim();
    if (path && !path.startsWith('/')) path = '/' + path;

    let url = `${proto}${host}`;
    if (port) url += `:${port}`;
    if (path) url += path;

    mqttBrokerUrlInput.value = url;
    validateProtocolWarning();
  }

  function parseBrokerUrlToParts(urlStr) {
    urlStr = (urlStr || '').trim();
    if (!urlStr) return;
    let proto = 'ws://';
    let rest = urlStr;
    if (urlStr.startsWith('wss://') || urlStr.startsWith('mqtts://')) {
      proto = 'wss://';
      rest = urlStr.replace(/^(wss|mqtts):\/\//, '');
    } else if (urlStr.startsWith('ws://') || urlStr.startsWith('mqtt://') || urlStr.startsWith('tcp://')) {
      proto = 'ws://';
      rest = urlStr.replace(/^(ws|mqtt|tcp):\/\//, '');
    }

    let host = rest;
    let port = '';
    let path = '';

    const slashIdx = host.indexOf('/');
    if (slashIdx !== -1) {
      path = host.slice(slashIdx);
      host = host.slice(0, slashIdx);
    }

    const colonIdx = host.indexOf(':');
    if (colonIdx !== -1) {
      port = host.slice(colonIdx + 1);
      host = host.slice(0, colonIdx);
    }

    // 自動導向至 WebSocket 埠
    if (port === '1883') port = '1884';
    if (port === '8883') port = '8884';

    mqttProtocolSelect.value = proto;
    mqttHostInput.value = host;
    mqttPortInput.value = port;
    mqttPathInput.value = path;
    validateProtocolWarning();
  }

  mqttProtocolSelect.addEventListener('change', () => {
    const proto = mqttProtocolSelect.value;
    const curPort = (mqttPortInput.value || '').trim();
    if (proto === 'ws://' && (!curPort || curPort === '8884' || curPort === '1883' || curPort === '9001' || curPort === '8084')) {
      mqttPortInput.value = '1884';
    } else if (proto === 'wss://' && (!curPort || curPort === '1884' || curPort === '8883' || curPort === '9001' || curPort === '8084')) {
      mqttPortInput.value = '8884';
    }
    updateBrokerUrlFromParts();
  });

  mqttHostInput.addEventListener('input', updateBrokerUrlFromParts);
  mqttPortInput.addEventListener('input', updateBrokerUrlFromParts);
  mqttPathInput.addEventListener('input', updateBrokerUrlFromParts);
  mqttBrokerUrlInput.addEventListener('input', () => {
    parseBrokerUrlToParts(mqttBrokerUrlInput.value);
  });

  // 1. 初始化讀取已儲存的設定（只在初次載入時設定輸入框，避免被異步訊息覆蓋）
  chrome.storage.local.get(
    [
      'hostIp',
      'portNum',
      'wsUrl',
      'mqttEnabled',
      'mqttProtocol',
      'mqttHost',
      'mqttPort',
      'mqttPath',
      'mqttBrokerUrl',
      'mqttTopicPrefix',
      'mqttUsername',
      'mqttPassword',
      'githubRepo',
      'updateAvailable',
      'latestVersion',
      'updateUrl',
    ],
    (result) => {
      // 若背景已偵測到新版本，立即呈現更新橫幅
      if (result.updateAvailable && result.latestVersion && updateBanner) {
        updateBanner.style.display = 'block';
        updateBannerTitle.textContent = `🎉 發現新版本 v${result.latestVersion}！`;
        updateBannerMsg.textContent = `GitHub 儲存庫已發布新版本（當前版本為 v${currentManifest.version || '1.1.0'}）。`;
        if (result.updateUrl) updateBannerLink.href = result.updateUrl;
      }

      // 開啟 popup 時自動靜默檢查一次
      setTimeout(() => checkForUpdates(false), 500);

      if (result.hostIp) {
        hostIpInput.value = result.hostIp;
      } else if (result.wsUrl) {
        // 從舊的 wsUrl 解析
        const parsed = parseWsUrl(result.wsUrl);
        hostIpInput.value = parsed.host;
        portNumInput.value = parsed.port;
      } else {
        hostIpInput.value = '127.0.0.1';
      }

      if (result.portNum) {
        portNumInput.value = result.portNum;
      }

      // MQTT 初始值
      const isMqttOn = !!result.mqttEnabled;
      mqttEnabledCheckbox.checked = isMqttOn;
      mqttFields.style.display = isMqttOn ? 'block' : 'none';

      const brokerUrl = result.mqttBrokerUrl || 'ws://127.0.0.1:1884';
      mqttBrokerUrlInput.value = brokerUrl;
      parseBrokerUrlToParts(brokerUrl);

      if (result.mqttProtocol) mqttProtocolSelect.value = result.mqttProtocol;
      if (result.mqttHost) mqttHostInput.value = result.mqttHost;
      if (result.mqttPort) mqttPortInput.value = result.mqttPort;
      if (result.mqttPath !== undefined) mqttPathInput.value = result.mqttPath;

      mqttTopicPrefixInput.value = result.mqttTopicPrefix || 'amrtf';
      mqttUsernameInput.value = result.mqttUsername || '';
      mqttPasswordInput.value = result.mqttPassword || '';

      validateProtocolWarning();
    }
  );

  setLocalhostBtn.addEventListener('click', () => {
    hostIpInput.value = '127.0.0.1';
    portNumInput.value = '9999';
  });

  // 2. 查詢當前狀態
  function checkStatus() {
    chrome.runtime.sendMessage({ type: 'POPUP_GET_STATUS' }, (bgStatus) => {
      if (chrome.runtime.lastError || !bgStatus) {
        setDisconnectedStatus('未連線至 Companion 模組');
        updateMqttBadge(false, false);
        return;
      }
      if (bgStatus.wsConnected) {
        setConnectedStatus(`已連線至 Companion (${bgStatus.tabsCount || 0} 個大慈恩分頁)`);
      } else {
        setDisconnectedStatus('未連線至 Companion 模組');
      }

      currentLastError = bgStatus.mqttLastError || '';
      validateProtocolWarning();

      updateMqttBadge(bgStatus.mqttEnabled, bgStatus.mqttConnected);
    });
  }

  function updateMqttBadge(enabled, connected) {
    if (!mqttStatusBadge) return;
    if (!enabled) {
      mqttStatusBadge.textContent = '未啟用';
      mqttStatusBadge.style.backgroundColor = '#eee';
      mqttStatusBadge.style.color = '#666';
    } else if (connected) {
      mqttStatusBadge.textContent = '● 已連線';
      mqttStatusBadge.style.backgroundColor = '#e6f4ea';
      mqttStatusBadge.style.color = '#137333';
    } else {
      mqttStatusBadge.textContent = '○ 連線中/斷線';
      mqttStatusBadge.style.backgroundColor = '#fce8e6';
      mqttStatusBadge.style.color = '#c5221f';
    }
  }

  checkStatus();
  const pollInterval = setInterval(checkStatus, 1500);
  window.addEventListener('unload', () => clearInterval(pollInterval));

  // 3. 檢查當前活動標籤頁是否為大慈恩官網
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.id && activeTab.url && activeTab.url.includes('amrtf.org')) {
    pageCard.style.display = 'block';

    function queryTabInfo() {
      chrome.tabs.sendMessage(activeTab.id, { type: 'QUERY_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // 腳本未就緒，嘗試自動動態注入
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js'],
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(activeTab.id, { type: 'QUERY_STATUS' }, (res2) => {
                if (res2) {
                  pageTitle.textContent = res2.lessonTitle || activeTab.title || '大慈恩頁面';
                  pageDesc.textContent = `講次: ${res2.lessonNumber || '無'} (分頁 ID: ${activeTab.id})`;
                } else {
                  pageTitle.textContent = activeTab.title || '大慈恩頁面';
                  pageDesc.textContent = '分頁腳本已注入，請稍候或點擊頁面';
                }
              });
            }, 300);
          }).catch(() => {
            pageTitle.textContent = activeTab.title || '大慈恩頁面';
            pageDesc.textContent = '分頁腳本未就緒（請重新整理分頁）';
          });
        } else {
          pageTitle.textContent = response.lessonTitle || '大慈恩頁面';
          pageDesc.textContent = `講次: ${response.lessonNumber || '無'} (分頁 ID: ${activeTab.id})`;

          if (response.isFocused) {
            claimActiveBtn.textContent = '✓ 目前為受控目標分頁';
            claimActiveBtn.style.backgroundColor = '#1e8e3e';
          }
        }
      });
    }

    queryTabInfo();

    claimActiveBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'POPUP_CLAIM_ACTIVE',
        targetTabId: activeTab.id,
      }, () => {
        claimActiveBtn.textContent = '✓ 已設為目前受控分頁';
        claimActiveBtn.style.backgroundColor = '#1e8e3e';
      });
    });
  } else {
    pageCard.style.display = 'none';
  }

  // 4. 儲存設定並通知 Background 重連
  saveBtn.addEventListener('click', async () => {
    let host = hostIpInput.value.trim();
    let port = parseInt(portNumInput.value, 10) || 9999;

    // 智能解析使用者可能輸入的各種格式
    if (host.startsWith('ws://')) host = host.replace('ws://', '');
    if (host.startsWith('wss://')) host = host.replace('wss://', '');
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = parseInt(parts[1], 10) || port;
    }
    if (!host) host = '127.0.0.1';

    hostIpInput.value = host;
    portNumInput.value = port;

    const fullWsUrl = `ws://${host}:${port}`;

    // MQTT 設定處理
    const mqttEnabled = mqttEnabledCheckbox.checked;
    const mqttProtocol = mqttProtocolSelect.value;
    const mqttHost = mqttHostInput.value.trim();
    const mqttPort = mqttPortInput.value.trim();
    const mqttPath = mqttPathInput.value.trim();
    let mqttBrokerUrl = mqttBrokerUrlInput.value.trim() || 'ws://127.0.0.1:1884';
    let mqttTopicPrefix = mqttTopicPrefixInput.value.trim() || 'amrtf';
    let mqttUsername = mqttUsernameInput.value.trim();
    let mqttPassword = mqttPasswordInput.value.trim();

    // 儲存至 Storage
    await chrome.storage.local.set({
      hostIp: host,
      portNum: port,
      wsUrl: fullWsUrl,
      mqttEnabled: mqttEnabled,
      mqttProtocol: mqttProtocol,
      mqttHost: mqttHost,
      mqttPort: mqttPort,
      mqttPath: mqttPath,
      mqttBrokerUrl: mqttBrokerUrl,
      mqttTopicPrefix: mqttTopicPrefix,
      mqttUsername: mqttUsername,
      mqttPassword: mqttPassword,
    });

    currentLastError = '';
    saveFeedback.style.display = 'block';
    saveFeedback.textContent = `✓ 已成功儲存所有設定！正在連線...`;

    // 通知 Background 更新並重連
    chrome.runtime.sendMessage({
      type: 'POPUP_SET_CONFIG',
      wsUrl: fullWsUrl,
      mqttEnabled: mqttEnabled,
      mqttBrokerUrl: mqttBrokerUrl,
      mqttTopicPrefix: mqttTopicPrefix,
      mqttUsername: mqttUsername,
      mqttPassword: mqttPassword,
    }, () => {
      setTimeout(checkStatus, 500);
      setTimeout(() => {
        saveFeedback.style.display = 'none';
      }, 3000);
    });
  });

  function parseWsUrl(url) {
    let clean = url.replace(/^wss?:\/\//, '');
    const [host, port] = clean.split(':');
    return {
      host: host || '127.0.0.1',
      port: port ? parseInt(port, 10) : 9999,
    };
  }

  function setConnectedStatus(msg) {
    statusContainer.className = 'status-badge connected';
    statusText.textContent = msg;
  }

  function setDisconnectedStatus(msg) {
    statusContainer.className = 'status-badge disconnected';
    statusText.textContent = msg;
  }
});
