import mqtt from 'mqtt';
export class AmrtfMqttManager {
    instance;
    client = null;
    prefix = 'amrtf';
    constructor(instance) {
        this.instance = instance;
    }
    start() {
        this.stop();
        const config = this.instance.config;
        if (!config.enableMqtt) {
            return;
        }
        this.prefix = (config.mqttTopicPrefix || 'amrtf').trim().replace(/\/+$/, '');
        const brokerHost = (config.mqttBroker || '127.0.0.1').trim();
        const port = config.mqttPort || 1883;
        let brokerUrl = brokerHost;
        if (!brokerUrl.startsWith('mqtt://') && !brokerUrl.startsWith('ws://') && !brokerUrl.startsWith('wss://')) {
            brokerUrl = `mqtt://${brokerHost}:${port}`;
        }
        this.instance.log('info', `正在連線至 MQTT Broker: ${brokerUrl}...`);
        try {
            this.client = mqtt.connect(brokerUrl, {
                port: port,
                username: config.mqttUsername || undefined,
                password: config.mqttPassword || undefined,
                clientId: `amrtf_companion_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                clean: true,
                reconnectPeriod: 5000,
            });
            this.client.on('connect', () => {
                this.instance.log('info', `MQTT Broker 連線成功！主題前綴: ${this.prefix}`);
                // 訂閱控制主題
                const commandTopic = `${this.prefix}/command`;
                const controlWildcard = `${this.prefix}/control/#`;
                this.client?.subscribe([commandTopic, controlWildcard], (err) => {
                    if (err) {
                        this.instance.log('error', `MQTT 訂閱失敗: ${err.message}`);
                    }
                    else {
                        this.instance.log('info', `MQTT 已訂閱: ${commandTopic} 與 ${controlWildcard}`);
                    }
                });
                // 發送上線宣告
                this.client?.publish(`${this.prefix}/status/connected`, 'online', { retain: true });
            });
            this.client.on('message', (topic, payload) => {
                this.handleIncomingMessage(topic, payload.toString().trim());
            });
            this.client.on('error', (err) => {
                this.instance.log('warn', `MQTT 連線錯誤: ${err.message}`);
            });
            this.client.on('offline', () => {
                this.instance.log('debug', 'MQTT Broker 目前離線中，將自動嘗試重新連線');
            });
        }
        catch (e) {
            this.instance.log('error', `初始化 MQTT 失敗: ${e?.message || e}`);
        }
    }
    handleIncomingMessage(topic, msgStr) {
        this.instance.log('debug', `收到 MQTT 訊息 [${topic}]: ${msgStr}`);
        try {
            // 1. 若為主要指令主題 `${this.prefix}/command`
            if (topic === `${this.prefix}/command`) {
                if (msgStr.startsWith('{')) {
                    const json = JSON.parse(msgStr);
                    if (json.action) {
                        this.executeAction(json.action, json.params);
                        return;
                    }
                }
                else {
                    // 純字串指令 (如 "play", "pause", "toggle_play")
                    this.executeAction(msgStr);
                    return;
                }
            }
            // 2. 若為捷徑子主題 `${this.prefix}/control/<cmd>`
            const subPrefix = `${this.prefix}/control/`;
            if (topic.startsWith(subPrefix)) {
                const cmd = topic.replace(subPrefix, '').toLowerCase();
                this.handleSubControl(cmd, msgStr);
            }
        }
        catch (err) {
            this.instance.log('warn', `處理 MQTT 指令失敗: ${err?.message || err}`);
        }
    }
    handleSubControl(cmd, payload) {
        switch (cmd) {
            case 'play':
                this.instance.sendCommand({ action: 'play' });
                break;
            case 'pause':
                this.instance.sendCommand({ action: 'pause' });
                break;
            case 'toggle_play':
                this.instance.sendCommand({ action: 'toggle_play' });
                break;
            case 'prev_lesson':
                this.instance.sendCommand({ action: 'prev_lesson' });
                break;
            case 'next_lesson':
                this.instance.sendCommand({ action: 'next_lesson' });
                break;
            case 'rewind': {
                const sec = parseFloat(payload) || 10;
                this.instance.sendCommand({ action: 'seek_relative', params: { seconds: -Math.abs(sec) } });
                break;
            }
            case 'forward': {
                const sec = parseFloat(payload) || 10;
                this.instance.sendCommand({ action: 'seek_relative', params: { seconds: Math.abs(sec) } });
                break;
            }
            case 'seek': {
                const targetSec = this.parseTimeString(payload);
                this.instance.sendCommand({ action: 'seek_absolute', params: { seconds: targetSec } });
                break;
            }
            case 'cycle_tab':
                this.instance.cycleNextTab();
                break;
            case 'focus_tab':
                this.instance.focusActiveTab();
                break;
            case 'cycle_scroll_mode':
                this.instance.cycleScrollMode();
                break;
            case 'theme':
                this.instance.sendCommand({ action: 'set_theme', params: { theme: payload || 'toggle' } });
                break;
            case 'modal_migtsema':
                this.instance.sendCommand({ action: 'modal_migtsema' });
                break;
            case 'modal_prep_video':
                this.instance.sendCommand({ action: 'modal_prep_video' });
                break;
            case 'modal_dedication_video':
                this.instance.sendCommand({ action: 'modal_dedication_video' });
                break;
            case 'modal_close':
                this.instance.sendCommand({ action: 'modal_close' });
                break;
            case 'loop_segment':
                this.instance.sendCommand({ action: 'toggle_loop_segment', params: { target: payload || 'current_paragraph' } });
                break;
            case 'master_start':
                this.instance.sendCommand({ action: 'jump_to_master_start' });
                break;
            case 'fullscreen':
                this.instance.sendCommand({ action: 'toggle_fullscreen' });
                break;
            default:
                this.instance.sendCommand({ action: cmd, params: payload ? { value: payload } : {} });
                break;
        }
    }
    executeAction(action, params) {
        if (action === 'cycle_next_tab') {
            this.instance.cycleNextTab();
        }
        else if (action === 'focus_active_tab') {
            this.instance.focusActiveTab();
        }
        else if (action === 'cycle_scroll_mode') {
            this.instance.cycleScrollMode();
        }
        else {
            this.instance.sendCommand({ action, params });
        }
    }
    parseTimeString(str) {
        if (!str)
            return 0;
        const clean = str.trim();
        if (!isNaN(Number(clean)))
            return Number(clean);
        const parts = clean.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return parts[0] * 60 + parts[1];
        }
        else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
    publishState(state, extra) {
        if (!this.client || !this.client.connected)
            return;
        const scrollMap = ['手動', '自動持續', '自動區段'];
        const payload = {
            ...state,
            scrollModeName: scrollMap[state.scrollMode] || '手動',
            connectedTabsCount: extra ? extra.tabsCount : 1,
            activeTabTitle: extra ? extra.activeTabTitle : state.lessonTitle,
            timestamp: Date.now(),
        };
        try {
            // 1. 推播完整狀態 JSON
            this.client.publish(`${this.prefix}/state`, JSON.stringify(payload), { qos: 0, retain: true });
            // 2. 推播常用細項主題，便於 Node-RED / Home Assistant 直接訂閱
            this.client.publish(`${this.prefix}/status/playing`, state.playing ? 'true' : 'false', { retain: true });
            this.client.publish(`${this.prefix}/status/current_time_str`, state.currentTimeStr, { retain: true });
            this.client.publish(`${this.prefix}/status/duration_str`, state.durationStr, { retain: true });
            this.client.publish(`${this.prefix}/status/lesson_number`, String(state.lessonNumber || ''), { retain: true });
            this.client.publish(`${this.prefix}/status/lesson_title`, state.lessonTitle || '', { retain: true });
            this.client.publish(`${this.prefix}/status/theme`, state.theme, { retain: true });
            this.client.publish(`${this.prefix}/status/scroll_mode`, scrollMap[state.scrollMode] || '手動', { retain: true });
        }
        catch (e) {
            this.instance.log('debug', `MQTT 推播失敗: ${e?.message || e}`);
        }
    }
    stop() {
        if (this.client) {
            try {
                this.client.publish(`${this.prefix}/status/connected`, 'offline', { retain: true });
                this.client.end(true);
            }
            catch (e) { }
            this.client = null;
        }
    }
}
//# sourceMappingURL=mqtt-manager.js.map