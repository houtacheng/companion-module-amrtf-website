// [整合版] 彈出視窗的「標註與筆記」區塊：顯示／隱藏標註與懸浮球、開側邊欄、全部標註、啟用 Companion 橋接。
document.addEventListener('DOMContentLoaded', () => {
  const HIDE_KEY = 'qhp-hide-annotations';
  const BALL_KEY = 'qhp-ball-hidden';
  const BRIDGE_KEY = 'amrtfBridgeEnabled';

  const showAnnotations = document.getElementById('qhpShowAnnotations');
  const showBall = document.getElementById('qhpShowBall');
  const bridgeEnabled = document.getElementById('qhpBridgeEnabled');
  const companionSection = document.getElementById('companionSection');
  if (!showAnnotations || !showBall || !bridgeEnabled) return;

  function render(items) {
    showAnnotations.checked = !items[HIDE_KEY];
    showBall.checked = !items[BALL_KEY];
    bridgeEnabled.checked = items[BRIDGE_KEY] !== false;
    if (companionSection) companionSection.style.display = bridgeEnabled.checked ? '' : 'none';
  }

  chrome.storage.local.get([HIDE_KEY, BALL_KEY, BRIDGE_KEY], render);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[HIDE_KEY] || changes[BALL_KEY] || changes[BRIDGE_KEY])) {
      chrome.storage.local.get([HIDE_KEY, BALL_KEY, BRIDGE_KEY], render);
    }
  });

  showAnnotations.addEventListener('change', () => chrome.storage.local.set({ [HIDE_KEY]: !showAnnotations.checked }));
  showBall.addEventListener('change', () => chrome.storage.local.set({ [BALL_KEY]: !showBall.checked }));
  bridgeEnabled.addEventListener('change', () => chrome.storage.local.set({ [BRIDGE_KEY]: bridgeEnabled.checked }));

  document.getElementById('qhpOpenSidebar').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, () => void chrome.runtime.lastError);
      window.close();
    });
  });

  document.getElementById('qhpOpenPanel').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openAnnotationsPanel' });
    window.close();
  });
});
