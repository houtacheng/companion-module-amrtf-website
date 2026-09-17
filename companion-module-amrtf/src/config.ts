import { type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
  wsPort: number
  chromeIp?: string
  targetTabMode: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'static-text',
      id: 'info',
      width: 12,
      label: '說明',
      value: '本模組透過區域網路 WebSocket 與 Chrome 擴充套件通訊。播放電腦與 Companion 主機可為不同電腦。',
    },
    {
      type: 'number',
      id: 'wsPort',
      label: 'WebSocket 連接埠 (Port)',
      width: 6,
      min: 1024,
      max: 65535,
      default: 9999,
    },
    {
      type: 'textinput',
      id: 'chromeIp',
      label: 'Chrome 播放電腦 IP (選填，留空即可)',
      tooltip: '建議留空。Companion 作為伺服器會自動接收 Chrome 連線；若填入 IP 僅作連線日誌標記，不會阻斷連線。',
      width: 6,
    },
    {
      type: 'dropdown',
      id: 'targetTabMode',
      label: '多分頁控制模式',
      tooltip: '當同一台 Chrome 開啟多個大慈恩頁面時的預設控制策略',
      width: 12,
      default: 'auto_active',
      choices: [
        { id: 'auto_active', label: '智慧切換：自動控制目前活動中 / 正在播放 / 最後點擊的分頁' },
        { id: 'broadcast', label: '全部分頁同步廣播控制' },
      ],
    },
  ]
}
