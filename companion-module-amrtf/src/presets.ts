import { combineRgb, type CompanionPresetDefinitions, type CompanionPresetSection } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'

export function UpdatePresets(self: ModuleInstance): void {
  const structure: CompanionPresetSection[] = [
    {
      id: 'tabs_management',
      name: '0. 分頁切換與管理',
      definitions: [
        {
          id: 'tab_group',
          name: '分頁選擇',
          type: 'simple',
          presets: ['cycle_tab_btn', 'tab_info_btn'],
        },
      ],
    },
    {
      id: 'playback',
      name: '1. 播放控制',
      definitions: [
        {
          id: 'playback_group',
          name: '基本播放',
          type: 'simple',
          presets: [
            'play_pause_toggle',
            'play_from_start_btn',
            'seek_absolute_btn',
            'seek_knob',
            'rewind_5s',
            'forward_5s',
            'rewind_10s_btn',
            'forward_10s_btn',
            'time_display',
            'rate_1_0',
            'rate_1_25',
            'rate_1_5',
          ],
        },
      ],
    },
    {
      id: 'navigation',
      name: '2. 講次導航',
      definitions: [
        {
          id: 'nav_group',
          name: '講次切換',
          type: 'simple',
          presets: ['lesson_display', 'prev_lesson', 'next_lesson', 'open_new_lesson_btn'],
        },
      ],
    },
    {
      id: 'master_audio',
      name: '3. 引文音檔與段落循環',
      definitions: [
        {
          id: 'master_group',
          name: '音檔段落',
          type: 'simple',
          presets: ['master_start', 'loop_segment', 'loop_current_paragraph_btn', 'play_custom_segment_btn'],
        },
      ],
    },
    {
      id: 'ui_modes',
      name: '4. 介面與顯示模式',
      definitions: [
        {
          id: 'ui_group',
          name: '畫面與捲動',
          type: 'simple',
          presets: [
            'speech_mode',
            'cycle_scroll_mode_btn',
            'fullscreen_toggle',
            'theme_toggle',
            'font_larger',
            'font_smaller',
          ],
        },
      ],
    },
    {
      id: 'status',
      name: '5. 連線狀態與字幕',
      definitions: [
        {
          id: 'status_group',
          name: '狀態監視',
          type: 'simple',
          presets: ['connection_status', 'subtitle_display'],
        },
      ],
    },
    {
      id: 'prep_videos',
      name: '6. 前行與迴向影片',
      definitions: [
        {
          id: 'video_group',
          name: '前行與迴向',
          type: 'simple',
          presets: ['modal_migtsema_btn', 'modal_prep_btn', 'modal_dedication_btn', 'modal_close_btn'],
        },
      ],
    },
  ]

  const presets: CompanionPresetDefinitions<ModuleSchema> = {
    // 切換下一個分頁
    cycle_tab_btn: {
      type: 'simple',
      name: '切換下一個分頁',
      style: {
        text: '切換分頁\\n(共$(amrtf:connected_tabs_count)頁)',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 40, 70),
      },
      steps: [
        {
          down: [
            {
              actionId: 'cycle_next_tab',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'multiple_tabs',
          options: {},
          style: {
            bgcolor: combineRgb(180, 100, 20),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    // 受控分頁顯示與聚焦切換
    tab_info_btn: {
      type: 'simple',
      name: '當前受控分頁標題 (點擊切換並聚焦該頁)',
      style: {
        text: '受控頁面:\\n$(amrtf:active_tab_title)',
        size: 12,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(25, 25, 45),
      },
      steps: [
        {
          down: [
            {
              actionId: 'focus_active_tab',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 播放 / 暫停切換
    play_pause_toggle: {
      type: 'simple',
      name: '播放 / 暫停切換 (含狀態反饋)',
      style: {
        text: '$(amrtf:play_state)\\n$(amrtf:current_time_str)',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(40, 40, 40),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_play',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'play_state',
          options: {
            state: 'playing',
          },
          style: {
            bgcolor: combineRgb(0, 150, 0),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    // 從頭播放
    play_from_start_btn: {
      type: 'simple',
      name: '從頭播放',
      style: {
        text: '從頭\\n播放',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(20, 90, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'restart',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 跳至指定時間
    seek_absolute_btn: {
      type: 'simple',
      name: '跳至指定時間',
      style: {
        text: '跳至\\n指定時間',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(40, 70, 100),
      },
      steps: [
        {
          down: [
            {
              actionId: 'seek_absolute',
              options: {
                time: '01:00',
              },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 倒退 5 秒
    rewind_5s: {
      type: 'simple',
      name: '倒退 5 秒',
      style: {
        text: '<< 5s\\n後退',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'rewind_5s',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 快進 5 秒
    forward_5s: {
      type: 'simple',
      name: '快進 5 秒',
      style: {
        text: '5s >>\\n前進',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'forward_5s',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 快進退旋鈕 (支援 Stream Deck + 旋鈕)
    seek_knob: {
      type: 'simple',
      name: '快進退旋鈕 (±10s 旋鈕 / 按下播放暫停)',
      style: {
        text: '快進退\\n旋鈕 ±10s',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(40, 50, 75),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_play',
              options: {},
            },
          ],
          up: [],
          rotate_left: [
            {
              actionId: 'seek_relative',
              options: { seconds: -10 },
            },
          ],
          rotate_right: [
            {
              actionId: 'seek_relative',
              options: { seconds: 10 },
            },
          ],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'play_state',
          options: { state: 'playing' },
          style: {
            bgcolor: combineRgb(0, 130, 60),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    // 倒退 10 秒
    rewind_10s_btn: {
      type: 'simple',
      name: '倒退 10 秒',
      style: {
        text: '<< 10s\\n後退',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'rewind_10s',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 快進 10 秒
    forward_10s_btn: {
      type: 'simple',
      name: '快進 10 秒',
      style: {
        text: '10s >>\\n前進',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'forward_10s',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 時間進度
    time_display: {
      type: 'simple',
      name: '當前進度 / 總時長',
      style: {
        text: '$(amrtf:current_time_str)\\n/\\n$(amrtf:duration_str)',
        size: 14,
        color: combineRgb(255, 215, 0),
        bgcolor: combineRgb(20, 20, 20),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_play',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 倍速切換 (1.0x / 1.25x / 1.5x)
    rate_1_0: {
      type: 'simple',
      name: '1.0x 正常倍速',
      style: {
        text: '1.0x\\n原速',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 50, 50),
      },
      steps: [
        {
          down: [
            {
              actionId: 'set_playback_rate',
              options: { rate: 1.0 },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    rate_1_25: {
      type: 'simple',
      name: '1.25x 倍速',
      style: {
        text: '1.25x\\n倍速',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 50, 50),
      },
      steps: [
        {
          down: [
            {
              actionId: 'set_playback_rate',
              options: { rate: 1.25 },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    rate_1_5: {
      type: 'simple',
      name: '1.5x 倍速',
      style: {
        text: '1.5x\\n快速',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 50, 50),
      },
      steps: [
        {
          down: [
            {
              actionId: 'set_playback_rate',
              options: { rate: 1.5 },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 講次顯示與導航
    lesson_display: {
      type: 'simple',
      name: '當前講次編號',
      style: {
        text: '第 $(amrtf:lesson_number) 講\\n$(amrtf:lesson_title)',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(30, 40, 60),
      },
      steps: [],
      feedbacks: [],
    },

    prev_lesson: {
      type: 'simple',
      name: '上一講',
      style: {
        text: '|<\\n上一講',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(70, 50, 30),
      },
      steps: [
        {
          down: [
            {
              actionId: 'prev_lesson',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    next_lesson: {
      type: 'simple',
      name: '下一講',
      style: {
        text: '>|\\n下一講',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(70, 50, 30),
      },
      steps: [
        {
          down: [
            {
              actionId: 'next_lesson',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    open_new_lesson_btn: {
      type: 'simple',
      name: '開啟特定講次 (新分頁)',
      style: {
        text: '開啟\\n指定講次',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 50, 80),
      },
      steps: [
        {
          down: [
            {
              actionId: 'open_new_lesson_tab',
              options: {
                teacher: 'zhenru',
                course: 'clear-moonlight-great-ocean',
                lesson: 1,
              },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 師父音檔起訖與循環
    master_start: {
      type: 'simple',
      name: '跳至引文起點',
      style: {
        text: '引文\\n起點',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(100, 60, 20),
      },
      steps: [
        {
          down: [
            {
              actionId: 'jump_to_master_start',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    loop_segment: {
      type: 'simple',
      name: '引文循環播放 (師父開示段落)',
      style: {
        text: '引文\\n循環',
        size: 18,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(40, 40, 40),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_loop_segment',
              options: {
                target: 'master_quote',
                enabled: 'toggle',
              },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'loop_state',
          options: {},
          style: {
            bgcolor: combineRgb(0, 120, 220),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    loop_current_paragraph_btn: {
      type: 'simple',
      name: '目前播放的這段重複播放',
      style: {
        text: '目前這段\\n循環',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(30, 60, 90),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_loop_segment',
              options: {
                target: 'current_paragraph',
                enabled: 'toggle',
              },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'loop_state',
          options: {},
          style: {
            bgcolor: combineRgb(0, 150, 255),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    play_custom_segment_btn: {
      type: 'simple',
      name: '播放特定段落 (設定開始與結束時間)',
      style: {
        text: '特定段落\\n播放',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 45, 80),
      },
      steps: [
        {
          down: [
            {
              actionId: 'play_custom_segment',
              options: {
                start_time: '00:00',
                end_time: '01:00',
                loop: 'false',
              },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    // 顯示與操作模式
    speech_mode: {
      type: 'simple',
      name: '播稿模式開關 (含反饋)',
      style: {
        text: '播稿模式\\n$(amrtf:speech_mode)',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 50, 50),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_speech_mode',
              options: { mode: 'toggle' },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'speech_mode',
          options: {},
          style: {
            bgcolor: combineRgb(220, 100, 0),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    cycle_scroll_mode_btn: {
      type: 'simple',
      name: '捲動模式輪播切換 (含變色反饋)',
      style: {
        text: '捲動模式\\n$(amrtf:scroll_mode)',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 50, 50),
      },
      steps: [
        {
          down: [
            {
              actionId: 'cycle_scroll_mode',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'scroll_mode',
          options: { mode: 0 },
          style: {
            text: '捲動: 手動\\n(點擊切換)',
            bgcolor: combineRgb(60, 60, 60),
            color: combineRgb(200, 200, 200),
          },
        },
        {
          feedbackId: 'scroll_mode',
          options: { mode: 1 },
          style: {
            text: '捲動: 持續\\n(自動滾動)',
            bgcolor: combineRgb(20, 140, 60),
            color: combineRgb(255, 255, 255),
          },
        },
        {
          feedbackId: 'scroll_mode',
          options: { mode: 2 },
          style: {
            text: '捲動: 區段\\n(自動跳段)',
            bgcolor: combineRgb(0, 110, 200),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    fullscreen_toggle: {
      type: 'simple',
      name: '全螢幕切換',
      style: {
        text: '[ ]\\n全螢幕',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(50, 50, 70),
      },
      steps: [
        {
          down: [
            {
              actionId: 'toggle_fullscreen',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    theme_toggle: {
      type: 'simple',
      name: '深色 / 淺色主題切換 (含文字與底色反饋)',
      style: {
        text: '主題\\n$(amrtf:theme)',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(40, 40, 40),
      },
      steps: [
        {
          down: [
            {
              actionId: 'set_theme',
              options: { theme: 'toggle' },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'theme_state',
          options: { theme: 'light' },
          style: {
            text: '淺色模式\\n(米白底黑字)',
            bgcolor: combineRgb(240, 235, 225),
            color: combineRgb(20, 20, 20),
          },
        },
        {
          feedbackId: 'theme_state',
          options: { theme: 'dark' },
          style: {
            text: '深色模式\\n(深黑底白字)',
            bgcolor: combineRgb(25, 25, 25),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    font_larger: {
      type: 'simple',
      name: '文字放大',
      style: {
        text: 'A+\\n字體放大',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'adjust_font_size',
              options: { delta: 1.5 },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    font_smaller: {
      type: 'simple',
      name: '文字縮小',
      style: {
        text: 'A-\\n字體縮小',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'adjust_font_size',
              options: { delta: -1.5 },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    scroll_mode_step: {
      type: 'simple',
      name: '自動區段捲動',
      style: {
        text: '區段\\n捲動',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(60, 60, 60),
      },
      steps: [
        {
          down: [
            {
              actionId: 'set_scroll_mode',
              options: { mode: 2 },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    connection_status: {
      type: 'simple',
      name: 'Chrome 外掛連線狀態',
      style: {
        text: '網頁連線\\n狀態',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(150, 0, 0),
      },
      steps: [],
      feedbacks: [
        {
          feedbackId: 'connected_state',
          options: {},
          style: {
            bgcolor: combineRgb(0, 160, 50),
            color: combineRgb(255, 255, 255),
          },
        },
      ],
    },

    subtitle_display: {
      type: 'simple',
      name: '目前播放字幕文字顯示',
      style: {
        text: '字幕:\\n$(amrtf:current_subtitle)',
        size: 10,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(20, 25, 40),
      },
      steps: [],
      feedbacks: [],
    },

    modal_migtsema_btn: {
      type: 'simple',
      name: '播放密集嘛',
      style: {
        text: '播放\\n密集嘛',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(160, 130, 90),
      },
      steps: [
        {
          down: [
            {
              actionId: 'modal_migtsema',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    modal_prep_btn: {
      type: 'simple',
      name: '播放前行影片',
      style: {
        text: '播放\\n前行影片',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(160, 130, 90),
      },
      steps: [
        {
          down: [
            {
              actionId: 'modal_prep_video',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    modal_dedication_btn: {
      type: 'simple',
      name: '播放迴向影片',
      style: {
        text: '播放\\n迴向影片',
        size: 16,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(160, 130, 90),
      },
      steps: [
        {
          down: [
            {
              actionId: 'modal_dedication_video',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },

    modal_close_btn: {
      type: 'simple',
      name: '關閉影片視窗',
      style: {
        text: '關閉\\n影片視窗',
        size: 14,
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(90, 90, 90),
      },
      steps: [
        {
          down: [
            {
              actionId: 'modal_close',
              options: {},
            },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    },
  }

  self.setPresetDefinitions(structure, presets)
}
