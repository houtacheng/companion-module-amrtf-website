# 大慈恩官網 (AMRTF) Companion 控制模組

本模組用於透過 **Chrome 擴充套件** 遠端控制 **大慈恩官網**（`amrtf.org`）的音訊播放、講次跳轉、顯示模式等，並將網頁播放狀態即時反饋回 Stream Deck。

## 安裝與設定步驟

1. **安裝 Chrome 擴充套件**：
   - 開啟 Google Chrome，進入擴充功能頁面 `chrome://extensions/`。
   - 開啟右上角的「**開發人員模式**」。
   - 點擊「**載入未封裝項目**」，選擇本專案的 `chrome-extension` 資料夾。
   - 若要使用**標註**功能（見下方「標註」），請改裝「**大慈恩官網助手（整合版）**」外掛，它同時包含本橋樑與標註筆記，**請不要與單獨的橋樑外掛同時安裝**（兩者同時連線 Companion 會重複）。

2. **啟用 Companion 連線**：
   - 在 Companion 的 **Connections** 頁面搜尋並新增「**大慈恩官網 (AMRTF)**」。
   - 設定 WebSocket 連接埠（預設為 `9999`）。
   - 當 Companion 模組啟動後，連線狀態會先顯示為 `Connecting / 等待 Chrome 外掛連線...`。

3. **連線網頁**：
   - 在 Chrome 瀏覽器中打開大慈恩官網任意講記頁面（例如 `https://www.amrtf.org/zh-hant/clear-moonlight-great-ocean-0564/`）。
   - Chrome 外掛會自動連線至 `ws://127.0.0.1:9999`。
   - Companion 連線狀態將自動轉為綠色 `OK (已連線至大慈恩網頁)`！

## 支援功能 (Actions)

- **基本播放控制**：
  - 播放 (Play)
  - 暫停 (Pause)
  - 播放 / 暫停切換 (Play/Pause Toggle)
  - 從頭播放 (Play from Start)
  - 跳至指定時間 (MM:SS 或秒數)
  - 倒退 5 秒 / 快進 5 秒 / 相對跳轉秒數
  - 播放倍速 (0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x)
- **講次導航**：
  - 上一講 (Previous Lesson)
  - 下一講 (Next Lesson)
  - 跳轉至指定講次 (輸入講次第幾講，如 `565`)
- **引文音檔起訖與循環**：
  - 跳至引文起點 (依頁面或月光藏資料自動定位)
  - 循環播放引文段落開關 (Loop Segment)
  - 播放特定段落 (指定開始與結束時間)
- **顯示與操作模式**：
  - 全螢幕 / 恢復視窗切換 (Toggle Fullscreen)
  - 文字大小調整 (小 10, 中 13, 大 16, 特大 19, 最大 22)
  - 主題色彩 (深色 / 淺色 / 切換)
  - 捲動模式 (手動 / 自動持續 / 自動區段)
  - 播稿模式切換 (Toggle Speech Mode)
- **標註**（需要「大慈恩官網助手（整合版）」外掛）：
  - 顯示 / 隱藏標註（切換、顯示、隱藏）：標註會從所有大慈恩分頁（以及所有安裝了外掛的網站）一起消失或回來，標註資料不受影響
  - 顯示 / 隱藏懸浮球（切換、顯示、隱藏）
  - 開啟 / 關閉標註側邊欄（作用在目前受控的分頁）
  - 開啟「全部標註」面板

## 變數 (Variables)

- `$(amrtf:lesson_number)`：當前講次編號（如 `564`）
- `$(amrtf:lesson_title)`：當前講次標題（如 `廣海明月0564 善逝教授無欺誑`）
- `$(amrtf:play_state)`：播放狀態 (`PLAYING` / `PAUSED`)
- `$(amrtf:current_time_str)`：目前播放時間（`MM:SS`）
- `$(amrtf:duration_str)`：總播放時間（`MM:SS`）
- `$(amrtf:playback_rate)`：當前播放倍速
- `$(amrtf:theme)`：當前主題 (`dark` / `light`)
- `$(amrtf:speech_mode)`：播稿模式 (`ON` / `OFF`)
- `$(amrtf:annotations_state)`：標註顯示狀態 (`顯示中` / `已隱藏`)
- `$(amrtf:annotations_count)`：目前受控頁面的標註數量
- `$(amrtf:ball_state)`：懸浮球狀態 (`顯示中` / `已隱藏`)
