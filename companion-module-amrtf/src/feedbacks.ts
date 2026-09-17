import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'

export type FeedbacksSchema = {
  play_state: {
    type: 'boolean'
    options: {
      state: string
    }
  }
  speech_mode: {
    type: 'boolean'
    options: Record<string, never>
  }
  loop_state: {
    type: 'boolean'
    options: Record<string, never>
  }
  theme_state: {
    type: 'boolean'
    options: {
      theme: string
    }
  }
  connected_state: {
    type: 'boolean'
    options: Record<string, never>
  }
  multiple_tabs: {
    type: 'boolean'
    options: Record<string, never>
  }
  scroll_mode: {
    type: 'boolean'
    options: {
      mode: number
    }
  }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
  self.setFeedbackDefinitions({
    play_state: {
      type: 'boolean',
      name: '播放狀態反饋',
      description: '當播放或暫停時改變按鈕顏色',
      defaultStyle: {
        bgcolor: combineRgb(0, 160, 0),
        color: combineRgb(255, 255, 255),
      },
      options: [
        {
          type: 'dropdown',
          id: 'state',
          label: '狀態',
          default: 'playing',
          choices: [
            { id: 'playing', label: '播放中' },
            { id: 'paused', label: '已暫停' },
          ],
        },
      ],
      callback: (feedback) => {
        const isPlaying = self.currentState.playing
        if (feedback.options.state === 'playing') {
          return isPlaying
        } else {
          return !isPlaying
        }
      },
    },

    speech_mode: {
      type: 'boolean',
      name: '播稿模式反饋',
      description: '當啟用播稿模式時按鈕高亮',
      defaultStyle: {
        bgcolor: combineRgb(220, 120, 0),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => {
        return !!self.currentState.speechMode
      },
    },

    loop_state: {
      type: 'boolean',
      name: '區段循環狀態反饋',
      description: '當處於循環播放段落時高亮',
      defaultStyle: {
        bgcolor: combineRgb(0, 120, 220),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => {
        return !!self.currentState.looping
      },
    },

    theme_state: {
      type: 'boolean',
      name: '主題反饋',
      description: '當前網頁主題色彩',
      defaultStyle: {
        bgcolor: combineRgb(200, 180, 140),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          id: 'theme',
          label: '主題',
          default: 'light',
          choices: [
            { id: 'dark', label: '深色' },
            { id: 'light', label: '淺色' },
          ],
        },
      ],
      callback: (feedback) => {
        return self.currentState.theme === feedback.options.theme
      },
    },

    connected_state: {
      type: 'boolean',
      name: 'Chrome 擴充套件連線反饋',
      description: '當 Chrome 外掛已連線時高亮',
      defaultStyle: {
        bgcolor: combineRgb(0, 180, 50),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => {
        return self.isClientConnected()
      },
    },

    multiple_tabs: {
      type: 'boolean',
      name: '多個分頁連線提示',
      description: '當同時開啟並連線多個大慈恩分頁時高亮提示',
      defaultStyle: {
        bgcolor: combineRgb(200, 160, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [],
      callback: () => {
        return self.getConnectedTabsCount() > 1
      },
    },

    scroll_mode: {
      type: 'boolean',
      name: '捲動模式反饋',
      description: '當處於特定捲動模式時改變顏色',
      defaultStyle: {
        bgcolor: combineRgb(30, 142, 62),
        color: combineRgb(255, 255, 255),
      },
      options: [
        {
          type: 'dropdown',
          id: 'mode',
          label: '捲動模式',
          default: 1,
          choices: [
            { id: 0, label: '手動' },
            { id: 1, label: '自動持續' },
            { id: 2, label: '自動區段' },
          ],
        },
      ],
      callback: (feedback) => {
        return self.currentState.scrollMode === Number(feedback.options.mode)
      },
    },
  })
}
