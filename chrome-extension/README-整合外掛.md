# 大慈恩官網整合外掛（標註筆記＋Companion 橋接）

一個 Chrome 外掛，合併了兩個功能：

1. **標註與筆記**（[Quantum Highlighter PRO](https://github.com/Jorge-Antonio-Gomez/quantum-highlighter-pro-chrome-extension)
   的大慈恩修改版）：任何網站都能選字標註、寫筆記、懸浮球，透過 Google 雲端硬碟和「大慈恩官網」App 雙向同步。
2. **Companion 橋接**：讓 Bitfocus Companion／Stream Deck 遙控大慈恩官網（播放、跳轉講次、顯示模式、MQTT…）。

## 安裝

1. 如果你之前裝過「大慈恩標註筆記」和「大慈恩 AMRTF Companion 橋樑」，**先把這兩個移除**。兩個同時開著會各連一次
   Companion，標註也會跑兩套。
2. 開啟 `chrome://extensions`，打開「開發人員模式」，按「載入未封裝項目」選這個資料夾。
3. 外掛 ID 應該是 `pihongameppeihodgockibfaipnmhfep`（要和 Google Cloud 登記的相同，才能連線 Google 雲端硬碟）。
4. Companion 端：匯入 `amrtf-website-1.2.0.tgz` 模組（舊版 1.1.0 要升級到 1.2.0，才有標註的按鈕）。

點工具列圖示會出現設定視窗：上半是標註（顯示標註、顯示懸浮球、標註側邊欄、全部標註），下半是 Companion 連線設定。
沒有使用 Companion 的電腦，可以關掉「啟用 Companion 橋接」，工具列圖示就不會再顯示紅色驚嘆號。

## 升級

彈出視窗下方的「軟體更新」會到 GitHub 儲存庫（`houtacheng/companion-module-amrtf-website`）看 `chrome-extension/manifest.json` 的版本號，
有新版就顯示提示和下載連結（每 6 小時自動檢查，也可以手動按「檢查更新」）。Chrome 不允許未封裝的外掛自己安裝更新，
所以更新方式是：下載新版 → 覆蓋原本載入的資料夾 → 在 `chrome://extensions` 按外掛的「重新載入」。
資料夾位置不變、外掛 ID 不變，標註與設定都會保留。

舊版的 Companion 橋樑外掛（1.1.0）也是看同一個檔案，所以儲存庫的 `chrome-extension/` 換成這個整合版之後，舊版就會提示「發現新版本」。

## Companion 可以做的標註控制

標註與懸浮球的顯示狀態是**整個瀏覽器共用**的，不限大慈恩網站：Companion 按一下，所有分頁、所有網站的標註一起隱藏或顯示，
也不需要開著大慈恩的分頁。

| Companion 動作 | 說明 |
|---|---|
| 顯示／隱藏標註 | 切換、顯示、隱藏三種模式；按鈕會依狀態變色 |
| 顯示／隱藏懸浮球 | 同上 |
| 標註側邊欄 | 在 Companion 控制的大慈恩分頁開關；沒有的話，開在目前看的那一頁（任何網站） |
| 全部標註 | 開啟「全部標註」頁面 |

MQTT：`{prefix}/control/annotations`、`/ball`（內容 `toggle`／`show`／`hide`／`on`／`off`）、`/annotation_sidebar`、`/annotations_panel`；
狀態在 `{prefix}/status/annotations_hidden`、`{prefix}/status/ball_hidden`。

## 整合時的改動

- 背景程式只有一個：標註外掛的 `background.js` 載入 `companion-bridge.js`。橋接只處理自己的訊息，不會影響雲端硬碟同步。
- Companion 的內容腳本（`companion-content.js`）只在 amrtf.org 執行，且只回應 Companion 的指令，不會搶標註側邊欄的訊息。
- 保留橋接的「檢查升級」：到 GitHub 儲存庫看 `chrome-extension/manifest.json` 的版本號，有新版就提示（Chrome 不允許未封裝外掛自己安裝更新，所以是提示＋連到下載頁）。
- 權限：在標註外掛原有的權限之外，只增加 `scripting` 和 amrtf.org 的網站權限。

## 授權

標註外掛的部分（原作者 Jorge Antonio Gomez）依 CC BY-SA 4.0 授權，修改的檔案見 `NOTICE-整合.txt`；
Companion 橋接的部分（`companion-bridge.js`、`companion-content.js`、`popup.html`、`popup.js`、`mqtt.min.js`）來自 Companion 橋樑外掛，
`mqtt.min.js` 是 MQTT.js（MIT）。
