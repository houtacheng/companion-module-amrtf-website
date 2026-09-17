import type ModuleInstance from './main.js'

export type VariablesSchema = {
  lesson_number: string
  lesson_title: string
  play_state: string
  current_time: number
  current_time_str: string
  duration: number
  duration_str: string
  playback_rate: number
  theme: string
  speech_mode: string
  scroll_mode: string
  font_size: number
  fullscreen: string
  looping: string
  master_range: string
  client_ip: string
  connected_tabs_count: number
  active_tab_title: string
  active_tab_id: string
  current_subtitle: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
  self.setVariableDefinitions({
    lesson_number: { name: '當前講次編號' },
    lesson_title: { name: '當前講次標題' },
    play_state: { name: '播放狀態 (PLAYING / PAUSED)' },
    current_time: { name: '播放進度秒數' },
    current_time_str: { name: '播放進度時間 (MM:SS)' },
    duration: { name: '總時間秒數' },
    duration_str: { name: '總時間 (MM:SS)' },
    playback_rate: { name: '播放倍速 (如 1.0, 1.25)' },
    theme: { name: '主題 (深色 / 淺色)' },
    speech_mode: { name: '播稿模式 (開啟 / 關閉)' },
    scroll_mode: { name: '捲動模式 (手動 / 自動持續 / 自動區段)' },
    font_size: { name: '文字大小數值' },
    fullscreen: { name: '全螢幕狀態 (全螢幕 / 正常)' },
    looping: { name: '區段循環狀態 (循環中 / 未循環)' },
    master_range: { name: '師父音檔標示區間' },
    client_ip: { name: 'Chrome 播放電腦 IP' },
    connected_tabs_count: { name: '已連線的大慈恩分頁總數' },
    active_tab_title: { name: '當前受控分頁標題' },
    active_tab_id: { name: '當前受控分頁識別碼' },
    current_subtitle: { name: '目前播放文字 (字幕)' },
  })
}
