import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { AmrtfWsServer, type ClientTabInfo, type ChromeTabItem } from './ws-server.js'

export type ModuleSchema = {
  config: ModuleConfig
  secrets: undefined
  actions: ActionsSchema
  feedbacks: FeedbacksSchema
  variables: VariablesSchema
}

export interface StatePayload {
  lessonNumber: string
  lessonTitle: string
  playing: boolean
  currentTime: number
  currentTimeStr: string
  duration: number
  durationStr: string
  playbackRate: number
  theme: 'dark' | 'light'
  scrollMode: number
  speechMode: boolean
  fontSize: number
  isFullscreen: boolean
  looping: boolean
  masterRange: { start: number; end: number; label: string } | null
  currentSubtitle?: string
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
  config!: ModuleConfig
  private wsServer: AmrtfWsServer | null = null

  public currentState: StatePayload = {
    lessonNumber: '',
    lessonTitle: '未連線',
    playing: false,
    currentTime: 0,
    currentTimeStr: '00:00',
    duration: 0,
    durationStr: '00:00',
    playbackRate: 1.0,
    theme: 'dark',
    scrollMode: 0,
    speechMode: false,
    fontSize: 16,
    isFullscreen: false,
    looping: false,
    masterRange: null,
    currentSubtitle: '',
  }

  constructor(internal: unknown) {
    super(internal)
  }

  async init(config: ModuleConfig): Promise<void> {
    this.config = config

    this.updateStatus(InstanceStatus.Connecting, '等待 Chrome 擴充套件連線...')

    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()
    this.updateVariableDefinitions()

    this.initWebSocketServer()
  }

  async destroy(): Promise<void> {
    this.log('debug', 'Destroying module')
    if (this.wsServer) {
      this.wsServer.stop()
      this.wsServer = null
    }
  }

  async configUpdated(config: ModuleConfig): Promise<void> {
    const oldPort = this.config?.wsPort
    const oldIp = this.config?.chromeIp
    this.config = config

    if (oldPort !== config.wsPort || oldIp !== config.chromeIp) {
      this.initWebSocketServer()
    }
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return GetConfigFields()
  }

  updateActions(): void {
    UpdateActions(this)
  }

  updateFeedbacks(): void {
    UpdateFeedbacks(this)
  }

  updatePresets(): void {
    UpdatePresets(this)
  }

  updateVariableDefinitions(): void {
    UpdateVariableDefinitions(this)
  }

  private initWebSocketServer(): void {
    if (this.wsServer) {
      this.wsServer.stop()
    }

    const port = this.config.wsPort || 9999
    this.wsServer = new AmrtfWsServer(this)
    this.wsServer.start(port, this.config.chromeIp)
  }

  public sendCommand(cmd: Record<string, unknown>, targetId?: string): void {
    if (!this.wsServer || !this.wsServer.hasClients()) {
      this.log('warn', '尚無已連線的 Chrome 擴充套件，指令可能無法執行')
    }
    if (this.wsServer) {
      this.wsServer.sendCommand(cmd, targetId)
    }
  }

  public isClientConnected(): boolean {
    return this.wsServer ? this.wsServer.hasClients() : false
  }

  public getConnectedTabsCount(): number {
    return this.wsServer ? this.wsServer.getChromeTabsCount() : 0
  }

  public cycleNextTab(): void {
    if (this.wsServer) {
      this.wsServer.cycleNextTab()
    }
  }

  public focusActiveTab(): void {
    if (this.wsServer) {
      this.wsServer.focusActiveTab()
    }
  }

  public cycleScrollMode(): void {
    const nextMode = ((this.currentState.scrollMode || 0) + 1) % 3
    this.sendCommand({ action: 'set_scroll_mode', params: { mode: nextMode } })
  }

  public selectTabByIndex(index: number): void {
    if (this.wsServer) {
      this.wsServer.selectTabByIndex(index)
    }
  }

  public setServerPortError(port: number): void {
    this.updateStatus(InstanceStatus.ConnectionFailure, `連接埠 ${port} 已被占用，請更換 Port`)
  }

  public onTabsListUpdated(tabs: ChromeTabItem[], activeTabId: number | string | null): void {
    const count = tabs.length
    const active = tabs.find((t) => String(t.id) === String(activeTabId)) || tabs[0]

    const title = active ? (active.lessonTitle || `第 ${active.lessonNumber} 講`) : '已連線'
    if (count > 0) {
      this.updateStatus(InstanceStatus.Ok, `Chrome 連線成功 (${count} 個分頁，受控: ${title})`)
    }

    this.setVariableValues({
      connected_tabs_count: count,
      active_tab_title: title,
      active_tab_id: active ? String(active.id) : '',
    })

    this.checkFeedbacks('connected_state', 'multiple_tabs')
  }

  public onClientListUpdated(): void {
    if (!this.wsServer) return

    const count = this.wsServer.getChromeTabsCount()
    const active = this.wsServer.getActiveClient()

    if (count > 0) {
      const title = active?.lessonTitle || '已連線'
      this.updateStatus(
        InstanceStatus.Ok,
        `Chrome 連線成功 (${count} 個分頁，受控: ${title})`
      )
    } else {
      this.updateStatus(InstanceStatus.Connecting, '等待 Chrome 擴充套件連線...')
    }

    this.setVariableValues({
      connected_tabs_count: count,
      client_ip: active ? active.ip : '無',
      active_tab_title: active ? active.lessonTitle : '無',
      active_tab_id: active ? active.id : '',
    })

    this.checkFeedbacks('connected_state', 'multiple_tabs')
  }

  public onStateUpdate(state: StatePayload, clientInfo?: ClientTabInfo): void {
    this.currentState = state

    const scrollMap = ['手動', '自動持續', '自動區段']
    const scrollStr = scrollMap[state.scrollMode] || '手動'

    this.setVariableValues({
      lesson_number: state.lessonNumber || '',
      lesson_title: state.lessonTitle || '',
      play_state: state.playing ? 'PLAYING' : 'PAUSED',
      current_time: state.currentTime,
      current_time_str: state.currentTimeStr,
      duration: state.duration,
      duration_str: state.durationStr,
      playback_rate: state.playbackRate,
      theme: state.theme === 'light' ? '淺色' : '深色',
      speech_mode: state.speechMode ? '開啟' : '關閉',
      scroll_mode: scrollStr,
      font_size: state.fontSize,
      fullscreen: state.isFullscreen ? '全螢幕' : '正常',
      looping: state.looping ? '循環中' : '未循環',
      master_range: state.masterRange ? state.masterRange.label : '無標記',
      current_subtitle: state.currentSubtitle || '',
      client_ip: clientInfo ? clientInfo.ip : '127.0.0.1',
      active_tab_title: clientInfo ? clientInfo.lessonTitle : state.lessonTitle,
      active_tab_id: clientInfo ? clientInfo.id : '',
    })

    this.checkFeedbacks('play_state', 'speech_mode', 'loop_state', 'theme_state', 'scroll_mode')
  }
}
