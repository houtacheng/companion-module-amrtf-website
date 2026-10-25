import type ModuleInstance from './main.js';
export type FeedbacksSchema = {
    play_state: {
        type: 'boolean';
        options: {
            state: string;
        };
    };
    speech_mode: {
        type: 'boolean';
        options: Record<string, never>;
    };
    loop_state: {
        type: 'boolean';
        options: Record<string, never>;
    };
    theme_state: {
        type: 'boolean';
        options: {
            theme: string;
        };
    };
    connected_state: {
        type: 'boolean';
        options: Record<string, never>;
    };
    multiple_tabs: {
        type: 'boolean';
        options: Record<string, never>;
    };
    scroll_mode: {
        type: 'boolean';
        options: {
            mode: number;
        };
    };
    annotations_hidden: {
        type: 'boolean';
        options: Record<string, never>;
    };
    ball_hidden: {
        type: 'boolean';
        options: Record<string, never>;
    };
};
export declare function UpdateFeedbacks(self: ModuleInstance): void;
