import type ModuleInstance from './main.js';
export declare const COURSE_CHOICES: {
    id: string;
    label: string;
}[];
export type ActionsSchema = {
    play: {
        options: Record<string, never>;
    };
    pause: {
        options: Record<string, never>;
    };
    toggle_play: {
        options: Record<string, never>;
    };
    restart: {
        options: Record<string, never>;
    };
    rewind_5s: {
        options: Record<string, never>;
    };
    forward_5s: {
        options: Record<string, never>;
    };
    rewind_10s: {
        options: Record<string, never>;
    };
    forward_10s: {
        options: Record<string, never>;
    };
    seek_relative: {
        options: {
            seconds: number;
        };
    };
    seek_absolute: {
        options: {
            time: string;
        };
    };
    play_custom_segment: {
        options: {
            start_time: string;
            end_time: string;
            loop: string;
        };
    };
    set_playback_rate: {
        options: {
            rate: number;
        };
    };
    prev_lesson: {
        options: Record<string, never>;
    };
    next_lesson: {
        options: Record<string, never>;
    };
    goto_lesson: {
        options: {
            course: string;
            lesson: number;
        };
    };
    open_new_lesson_tab: {
        options: {
            teacher: string;
            course: string;
            lesson: number;
        };
    };
    open_course_home: {
        options: {
            course: string;
        };
    };
    jump_to_master_start: {
        options: Record<string, never>;
    };
    toggle_loop_segment: {
        options: {
            target?: string;
            enabled?: string;
        };
    };
    toggle_fullscreen: {
        options: Record<string, never>;
    };
    set_theme: {
        options: {
            theme: string;
        };
    };
    set_font_size: {
        options: {
            size: number;
        };
    };
    adjust_font_size: {
        options: {
            delta: number;
        };
    };
    set_scroll_mode: {
        options: {
            mode: number;
        };
    };
    cycle_scroll_mode: {
        options: Record<string, never>;
    };
    toggle_speech_mode: {
        options: {
            mode: string;
        };
    };
    cycle_next_tab: {
        options: Record<string, never>;
    };
    focus_active_tab: {
        options: Record<string, never>;
    };
    select_tab_by_index: {
        options: {
            index: number;
        };
    };
    modal_migtsema: {
        options: Record<string, never>;
    };
    modal_prep_video: {
        options: Record<string, never>;
    };
    modal_dedication_video: {
        options: Record<string, never>;
    };
    modal_close: {
        options: Record<string, never>;
    };
    set_annotations: {
        options: {
            mode: string;
        };
    };
    set_floating_ball: {
        options: {
            mode: string;
        };
    };
    toggle_annotation_sidebar: {
        options: Record<string, never>;
    };
    open_annotations_panel: {
        options: Record<string, never>;
    };
};
export declare function UpdateActions(self: ModuleInstance): void;
