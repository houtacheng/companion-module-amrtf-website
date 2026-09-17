import type ModuleInstance from './main.js'

export const COURSE_CHOICES = [
  { id: 'current', label: '【維持當前課程/專題】' },
  { id: 'clear-moonlight-great-ocean', label: '真如老師 - 廣海明月' },
  { id: 'vipasyana-supramundane-insight', label: '真如老師 - 廣論止觀初探・毗缽舍那' },
  { id: 'serenity-insight-introduction', label: '真如老師 - 廣論止觀初探・奢摩他' },
  { id: 'lamrim-death-impermanence', label: '真如老師 - 廣論念死無常' },
  { id: 'sutra-stories', label: '真如老師 - 佛經故事' },
  { id: 'lamrim-condensed-points', label: '真如老師 - 道次第略義淺釋' },
  { id: 'eight-verses-mind-training', label: '真如老師 - 修心八偈淺釋' },
  { id: 'blossoming-merit', label: '真如老師 - 功德花海' },
  { id: 'lamrim-transcripts-nanputuo', label: '日常老和尚 - 菩提道次第廣論手抄稿（南普陀版）' },
  { id: 'lamrim-transcripts-fengshan', label: '日常老和尚 - 菩提道次第廣論手抄稿（鳳山寺版）' },
  { id: 'nanshan-vinaya-transcripts1991', label: '日常老和尚 - 南山律在家備覽略編手抄稿（1991年版）' },
  { id: 'nanshan-vinaya-transcripts2000', label: '日常老和尚 - 南山律在家備覽略編手抄稿（2000年版）' },
]

export type ActionsSchema = {
  play: { options: Record<string, never> }
  pause: { options: Record<string, never> }
  toggle_play: { options: Record<string, never> }
  restart: { options: Record<string, never> }
  rewind_5s: { options: Record<string, never> }
  forward_5s: { options: Record<string, never> }
  rewind_10s: { options: Record<string, never> }
  forward_10s: { options: Record<string, never> }
  seek_relative: { options: { seconds: number } }
  seek_absolute: { options: { time: string } }
  play_custom_segment: { options: { start_time: string; end_time: string; loop: string } }
  set_playback_rate: { options: { rate: number } }
  prev_lesson: { options: Record<string, never> }
  next_lesson: { options: Record<string, never> }
  goto_lesson: { options: { course: string; lesson: number } }
  open_new_lesson_tab: { options: { teacher: string; course: string; lesson: number } }
  open_course_home: { options: { course: string } }
  jump_to_master_start: { options: Record<string, never> }
  toggle_loop_segment: { options: { target?: string; enabled?: string } }
  toggle_fullscreen: { options: Record<string, never> }
  set_theme: { options: { theme: string } }
  set_font_size: { options: { size: number } }
  adjust_font_size: { options: { delta: number } }
  set_scroll_mode: { options: { mode: number } }
  cycle_scroll_mode: { options: Record<string, never> }
  toggle_speech_mode: { options: { mode: string } }
  cycle_next_tab: { options: Record<string, never> }
  focus_active_tab: { options: Record<string, never> }
  select_tab_by_index: { options: { index: number } }
  modal_migtsema: { options: Record<string, never> }
  modal_prep_video: { options: Record<string, never> }
  modal_dedication_video: { options: Record<string, never> }
  modal_close: { options: Record<string, never> }
}

export function UpdateActions(self: ModuleInstance): void {
  self.setActionDefinitions({
    // 0. 分頁控制
    cycle_next_tab: {
      name: '切換至下一個分頁 (Cycle Next Tab)',
      options: [],
      callback: async () => {
        self.cycleNextTab()
      },
    },

    focus_active_tab: {
      name: '切換並聚焦至當前受控分頁 (Focus Active Tab)',
      options: [],
      callback: async () => {
        self.focusActiveTab()
      },
    },

    select_tab_by_index: {
      name: '依序號選擇受控分頁 (Select Tab by Index)',
      options: [
        {
          type: 'number',
          id: 'index',
          label: '分頁序號 (1, 2, 3...)',
          default: 1,
          min: 1,
          max: 20,
        },
      ],
      callback: async (action) => {
        self.selectTabByIndex(Number(action.options.index) - 1)
      },
    },

    // 1. 基本控制
    play: {
      name: '播放 (Play)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'play' })
      },
    },

    pause: {
      name: '暫停 (Pause)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'pause' })
      },
    },

    toggle_play: {
      name: '播放 / 暫停切換 (Play/Pause Toggle)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'toggle_play' })
      },
    },

    restart: {
      name: '從頭播放 (Play from Start)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'restart' })
      },
    },

    rewind_5s: {
      name: '倒退 5 秒 (-5s)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'seek_relative', params: { seconds: -5 } })
      },
    },

    forward_5s: {
      name: '快進 5 秒 (+5s)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'seek_relative', params: { seconds: 5 } })
      },
    },

    rewind_10s: {
      name: '倒退 10 秒 (-10s)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'seek_relative', params: { seconds: -10 } })
      },
    },

    forward_10s: {
      name: '快進 10 秒 (+10s)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'seek_relative', params: { seconds: 10 } })
      },
    },

    seek_relative: {
      name: '相對跳轉秒數',
      options: [
        {
          type: 'number',
          id: 'seconds',
          label: '秒數 (正數快進，負數倒退)',
          default: 10,
          min: -36000,
          max: 36000,
        },
      ],
      callback: async (action) => {
        self.sendCommand({ action: 'seek_relative', params: { seconds: Number(action.options.seconds) } })
      },
    },

    seek_absolute: {
      name: '跳至指定時間 (MM:SS 或秒數)',
      options: [
        {
          type: 'textinput',
          id: 'time',
          label: '目標時間 (例如 02:30 或秒數 150)',
          default: '01:00',
        },
      ],
      callback: async (action) => {
        const timeStr = String(action.options.time || '0').trim()
        let seconds = 0
        if (timeStr.includes(':') || timeStr.includes('：')) {
          const parts = timeStr.split(/[:：]/).map(Number)
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            seconds = parts[0] * 60 + parts[1]
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
          }
        } else {
          seconds = parseFloat(timeStr) || 0
        }
        self.sendCommand({ action: 'seek_absolute', params: { seconds, time: timeStr } })
      },
    },

    play_custom_segment: {
      name: '播放特定段落 (指定開始與結束時間)',
      options: [
        {
          type: 'textinput',
          id: 'start_time',
          label: '開始時間 (MM:SS 或秒數，例如 01:30)',
          default: '00:00',
        },
        {
          type: 'textinput',
          id: 'end_time',
          label: '結束時間 (MM:SS 或秒數，例如 02:45)',
          default: '01:00',
        },
        {
          type: 'dropdown',
          id: 'loop',
          label: '播放完畢動作',
          default: 'false',
          choices: [
            { id: 'false', label: '播放完該段停止 (單次播放)' },
            { id: 'true', label: '播放完自動重複循環' },
          ],
        },
      ],
      callback: async (action) => {
        self.sendCommand({
          action: 'play_custom_segment',
          params: {
            start_time: String(action.options.start_time || '0').trim(),
            end_time: String(action.options.end_time || '0').trim(),
            loop: action.options.loop === 'true',
          },
        })
      },
    },

    set_playback_rate: {
      name: '設定播放倍速',
      options: [
        {
          type: 'dropdown',
          id: 'rate',
          label: '倍速',
          default: 1.0,
          choices: [
            { id: 0.75, label: '0.75x' },
            { id: 1.0, label: '1.0x (正常)' },
            { id: 1.25, label: '1.25x' },
            { id: 1.5, label: '1.5x' },
            { id: 1.75, label: '1.75x' },
            { id: 2.0, label: '2.0x' },
          ],
        },
      ],
      callback: async (action) => {
        self.sendCommand({ action: 'set_playback_rate', params: { rate: Number(action.options.rate) } })
      },
    },

    prev_lesson: {
      name: '上一講 (Previous Lesson)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'prev_lesson' })
      },
    },

    next_lesson: {
      name: '下一講 (Next Lesson)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'next_lesson' })
      },
    },

    goto_lesson: {
      name: '跳轉至指定講次 (Goto Lesson)',
      options: [
        {
          type: 'dropdown',
          id: 'course',
          label: '專題 / 課程',
          default: 'current',
          choices: COURSE_CHOICES,
        },
        {
          type: 'number',
          id: 'lesson',
          label: '講次編號 (如 1, 564, 565)',
          default: 1,
          min: 1,
          max: 9999,
        },
      ],
      callback: async (action) => {
        self.sendCommand({
          action: 'goto_lesson',
          params: {
            course: action.options.course,
            lesson: Number(action.options.lesson),
          },
        })
      },
    },

    open_new_lesson_tab: {
      name: '開啟特定講次 (新分頁) (Open Specific Lesson in New Tab)',
      options: [
        {
          type: 'dropdown',
          id: 'teacher',
          label: '1. 師父 / 老師',
          default: 'zhenru',
          choices: [
            { id: 'zhenru', label: '真如老師' },
            { id: 'richang', label: '日常老和尚' },
          ],
        },
        {
          type: 'dropdown',
          id: 'course',
          label: '2. 專題 / 課程',
          default: 'clear-moonlight-great-ocean',
          choices: COURSE_CHOICES.filter((c) => c.id !== 'current'),
        },
        {
          type: 'number',
          id: 'lesson',
          label: '3. 講次編號',
          default: 1,
          min: 1,
          max: 9999,
        },
      ],
      callback: async (action) => {
        self.sendCommand({
          action: 'open_new_tab',
          params: {
            teacher: action.options.teacher,
            course: action.options.course,
            lesson: Number(action.options.lesson),
          },
        })
      },
    },

    open_course_home: {
      name: '開啟專題首頁 (Open Course Home)',
      options: [
        {
          type: 'dropdown',
          id: 'course',
          label: '專題 / 課程',
          default: 'clear-moonlight-great-ocean',
          choices: COURSE_CHOICES.filter((c) => c.id !== 'current'),
        },
      ],
      callback: async (action) => {
        self.sendCommand({
          action: 'open_course_home',
          params: {
            course: action.options.course,
          },
        })
      },
    },

    jump_to_master_start: {
      name: '跳至引文起點',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'jump_to_master_start' })
      },
    },

    toggle_loop_segment: {
      name: '區段循環播放開關 (Loop Segment)',
      options: [
        {
          type: 'dropdown',
          id: 'target',
          label: '循環目標',
          default: 'master_quote',
          choices: [
            { id: 'master_quote', label: '師父開示段落 (若有引文)' },
            { id: 'current_paragraph', label: '目前播放的這段' },
          ],
        },
        {
          type: 'dropdown',
          id: 'enabled',
          label: '循環模式',
          default: 'toggle',
          choices: [
            { id: 'toggle', label: '切換 (Toggle)' },
            { id: 'on', label: '開啟循環' },
            { id: 'off', label: '關閉循環' },
          ],
        },
      ],
      callback: async (action) => {
        const mode = action.options.enabled
        const enabled = mode === 'toggle' ? undefined : mode === 'on'
        self.sendCommand({
          action: 'toggle_loop_segment',
          params: {
            enabled,
            target: action.options.target || 'master_quote',
          },
        })
      },
    },

    toggle_fullscreen: {
      name: '全螢幕 / 恢復正常視窗 (Toggle Fullscreen)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'toggle_fullscreen' })
      },
    },

    set_theme: {
      name: '設定主題 (Theme)',
      options: [
        {
          type: 'dropdown',
          id: 'theme',
          label: '主題色彩',
          default: 'toggle',
          choices: [
            { id: 'toggle', label: '切換深淺色' },
            { id: '0', label: '深色 (Dark)' },
            { id: '1', label: '淺色 (Light)' },
          ],
        },
      ],
      callback: async (action) => {
        self.sendCommand({ action: 'set_theme', params: { theme: action.options.theme } })
      },
    },

    set_font_size: {
      name: '設定文字大小 (Font Size)',
      options: [
        {
          type: 'dropdown',
          id: 'size',
          label: '文字大小',
          default: 16,
          choices: [
            { id: 10, label: '小 (10)' },
            { id: 13, label: '中 (13)' },
            { id: 16, label: '大 (16 - 預設)' },
            { id: 19, label: '特大 (19)' },
            { id: 22, label: '最大 (22)' },
          ],
        },
      ],
      callback: async (action) => {
        self.sendCommand({ action: 'set_font_size', params: { size: Number(action.options.size) } })
      },
    },

    adjust_font_size: {
      name: '微調文字大小 (放大 / 縮小)',
      options: [
        {
          type: 'dropdown',
          id: 'delta',
          label: '調整',
          default: 1.5,
          choices: [
            { id: 1.5, label: '放大 (+)' },
            { id: -1.5, label: '縮小 (-)' },
          ],
        },
      ],
      callback: async (action) => {
        self.sendCommand({ action: 'adjust_font_size', params: { delta: Number(action.options.delta) } })
      },
    },

    set_scroll_mode: {
      name: '設定捲動模式 (Scroll Mode)',
      options: [
        {
          type: 'dropdown',
          id: 'mode',
          label: '捲動模式',
          default: 0,
          choices: [
            { id: 0, label: '手動' },
            { id: 1, label: '自動持續' },
            { id: 2, label: '自動區段' },
          ],
        },
      ],
      callback: async (action) => {
        self.sendCommand({ action: 'set_scroll_mode', params: { mode: Number(action.options.mode) } })
      },
    },

    cycle_scroll_mode: {
      name: '捲動模式輪播切換 (手動 -> 自動持續 -> 自動區段)',
      options: [],
      callback: async () => {
        const nextMode = ((self.currentState.scrollMode || 0) + 1) % 3
        self.sendCommand({ action: 'set_scroll_mode', params: { mode: nextMode } })
      },
    },

    toggle_speech_mode: {
      name: '播稿模式 (Speech Mode)',
      options: [
        {
          type: 'dropdown',
          id: 'mode',
          label: '模式',
          default: 'toggle',
          choices: [
            { id: 'toggle', label: '切換 (Toggle)' },
            { id: 'on', label: '開啟' },
            { id: 'off', label: '關閉' },
          ],
        },
      ],
      callback: async (action) => {
        const mode = action.options.mode
        const enabled = mode === 'toggle' ? undefined : mode === 'on'
        self.sendCommand({ action: 'toggle_speech_mode', params: { enabled } })
      },
    },

    modal_migtsema: {
      name: '播放密集嘛 (Play Migtsema)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'modal_migtsema' })
      },
    },

    modal_prep_video: {
      name: '播放前行影片 (Play Preparation Video)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'modal_prep_video' })
      },
    },

    modal_dedication_video: {
      name: '播放迴向影片 (Play Dedication Video)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'modal_dedication_video' })
      },
    },

    modal_close: {
      name: '關閉彈出影片/視窗 (Close Video Modal)',
      options: [],
      callback: async () => {
        self.sendCommand({ action: 'modal_close' })
      },
    },
  })
}
