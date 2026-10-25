import { WebSocketServer, WebSocket } from 'ws';
export class AmrtfWsServer {
    wss = null;
    clients = new Map();
    instance;
    activeClientId = null;
    chromeTabs = [];
    activeChromeTabId = null;
    constructor(instance) {
        this.instance = instance;
    }
    start(port, allowedIp) {
        this.stop();
        try {
            // 預設監聽所有介面 (包含 127.0.0.1, localhost, 區網 IP)，不強制指定 host 以兼顧 IPv4/IPv6
            this.wss = new WebSocketServer({ port });
            this.instance.log('info', `AMRTF WebSocket 伺服器已在連接埠 ${port} 啟動，等待 Chrome 擴充套件連線...`);
            this.wss.on('connection', (ws, req) => {
                let remoteIp = req.socket.remoteAddress || '';
                if (remoteIp.startsWith('::ffff:')) {
                    remoteIp = remoteIp.replace('::ffff:', '');
                }
                this.instance.log('info', `收到來自 ${remoteIp} 的連線請求`);
                // 若使用者指定了 Chrome 電腦 IP，僅作提示紀錄，不隨意斷線
                if (allowedIp && allowedIp.trim() !== '') {
                    const filterIp = allowedIp.trim();
                    const isLocal = remoteIp === '127.0.0.1' || remoteIp === '::1';
                    const isMatch = remoteIp === filterIp || remoteIp.includes(filterIp) || filterIp.includes(remoteIp);
                    if (!isMatch && !isLocal) {
                        this.instance.log('info', `提示: 連線來源 IP (${remoteIp}) 與設定值 (${filterIp}) 不同，仍正常接受連線`);
                    }
                }
                const clientId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const clientInfo = {
                    id: clientId,
                    ws,
                    ip: remoteIp,
                    lessonNumber: '',
                    lessonTitle: 'Chrome 已連線',
                    isFocused: true,
                    lastSeen: Date.now(),
                };
                this.clients.set(clientId, clientInfo);
                this.activeClientId = clientId;
                this.instance.log('info', `Chrome 擴充套件已連線成功！(來源 IP: ${remoteIp})`);
                this.instance.onClientListUpdated();
                // 回應客戶端其 assigned clientId
                ws.send(JSON.stringify({ type: 'INIT_ACK', clientId }));
                ws.on('message', (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        clientInfo.lastSeen = Date.now();
                        if (msg.type === 'PING') {
                            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                            return;
                        }
                        if (msg.type === 'TABS_LIST_UPDATE') {
                            this.chromeTabs = msg.tabs || [];
                            this.activeChromeTabId = msg.activeTabId || null;
                            this.instance.onTabsListUpdated(this.chromeTabs, this.activeChromeTabId);
                            return;
                        }
                        if (msg.type === 'ANNOTATION_STATE' && msg.data) {
                            // 標註／懸浮球的顯示狀態（整合版外掛才會送；舊版外掛不會有這個訊息）
                            if (this.activeClientId === clientId || this.clients.size === 1) {
                                this.instance.onAnnotationState(msg.data);
                            }
                            return;
                        }
                        if (msg.type === 'STATE_UPDATE' && msg.data) {
                            clientInfo.lessonNumber = msg.data.lessonNumber || '';
                            clientInfo.lessonTitle = msg.data.lessonTitle || '';
                            if (msg.data.isFocused) {
                                clientInfo.isFocused = true;
                                if (this.instance.config.targetTabMode === 'auto_active') {
                                    this.activeClientId = clientId;
                                }
                            }
                            if (this.activeClientId === clientId || this.clients.size === 1) {
                                this.instance.onStateUpdate(msg.data, clientInfo);
                            }
                            this.instance.onClientListUpdated();
                        }
                        else if (msg.type === 'PAGE_FOCUSED') {
                            clientInfo.isFocused = true;
                            if (this.instance.config.targetTabMode === 'auto_active') {
                                this.activeClientId = clientId;
                                this.instance.log('info', `使用者焦點切換至分頁: ${clientInfo.lessonTitle}`);
                            }
                            this.instance.onClientListUpdated();
                        }
                    }
                    catch (err) {
                        this.instance.log('warn', `解析客戶端訊息失敗: ${err}`);
                    }
                });
                ws.on('close', (code, reason) => {
                    this.clients.delete(clientId);
                    this.chromeTabs = [];
                    this.activeChromeTabId = null;
                    this.instance.log('info', `Chrome 擴充套件中斷連線 (代碼: ${code})`);
                    if (this.activeClientId === clientId) {
                        const next = this.clients.keys().next().value;
                        this.activeClientId = next || null;
                    }
                    this.instance.onClientListUpdated();
                });
                ws.on('error', (err) => {
                    this.instance.log('error', `WebSocket 客戶端連線錯誤: ${err}`);
                });
            });
            this.wss.on('error', (err) => {
                this.instance.log('error', `WebSocket 伺服器錯誤: ${err?.message || err}`);
                if (err?.code === 'EADDRINUSE') {
                    this.instance.setServerPortError(port);
                }
            });
        }
        catch (e) {
            this.instance.log('error', `啟動 WebSocket 伺服器失敗: ${e?.message || e}`);
        }
    }
    sendCommand(command, targetId) {
        const payload = JSON.stringify(command);
        if (!targetId && this.instance.config.targetTabMode === 'broadcast') {
            for (const client of this.clients.values()) {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(payload);
                }
            }
            return;
        }
        const destId = targetId || this.activeClientId;
        if (destId && this.clients.has(destId)) {
            const client = this.clients.get(destId);
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
                return;
            }
        }
        for (const client of this.clients.values()) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
                break;
            }
        }
    }
    setActiveClient(clientId) {
        if (this.clients.has(clientId)) {
            this.activeClientId = clientId;
            this.instance.log('info', `已切換受控分頁為: ${this.clients.get(clientId).lessonTitle}`);
            this.sendCommand({ action: 'query_state' }, clientId);
            this.instance.onClientListUpdated();
        }
    }
    cycleNextTab() {
        this.sendCommand({ action: 'cycle_next_tab' });
    }
    focusActiveTab() {
        this.sendCommand({ action: 'focus_active_tab' });
    }
    selectTabByIndex(index) {
        this.sendCommand({ action: 'select_tab_index', index });
    }
    getChromeTabs() {
        return this.chromeTabs;
    }
    getChromeTabsCount() {
        return this.chromeTabs.length > 0 ? this.chromeTabs.length : this.clients.size;
    }
    getActiveClient() {
        if (this.activeClientId && this.clients.has(this.activeClientId)) {
            return this.clients.get(this.activeClientId);
        }
        const first = this.clients.values().next().value;
        return first || null;
    }
    getClientList() {
        return Array.from(this.clients.values());
    }
    hasClients() {
        return this.clients.size > 0;
    }
    stop() {
        if (this.wss) {
            for (const client of this.clients.values()) {
                try {
                    client.ws.terminate();
                }
                catch (e) { }
            }
            this.clients.clear();
            try {
                this.wss.close();
            }
            catch (e) { }
            this.wss = null;
        }
    }
}
//# sourceMappingURL=ws-server.js.map