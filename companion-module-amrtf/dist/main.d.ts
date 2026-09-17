import { InstanceBase, type SomeCompanionConfigField } from '@companion-module/base';
import { type ModuleConfig } from './config.js';
import { type VariablesSchema } from './variables.js';
import { UpgradeScripts } from './upgrades.js';
import { type ActionsSchema } from './actions.js';
import { type FeedbacksSchema } from './feedbacks.js';
import { type ClientTabInfo, type ChromeTabItem } from './ws-server.js';
export type ModuleSchema = {
    config: ModuleConfig;
    secrets: undefined;
    actions: ActionsSchema;
    feedbacks: FeedbacksSchema;
    variables: VariablesSchema;
};
export interface StatePayload {
    lessonNumber: string;
    lessonTitle: string;
    playing: boolean;
    currentTime: number;
    currentTimeStr: string;
    duration: number;
    durationStr: string;
    playbackRate: number;
    theme: 'dark' | 'light';
    scrollMode: number;
    speechMode: boolean;
    fontSize: number;
    isFullscreen: boolean;
    looping: boolean;
    masterRange: {
        start: number;
        end: number;
        label: string;
    } | null;
    currentSubtitle?: string;
}
export { UpgradeScripts };
export default class ModuleInstance extends InstanceBase<ModuleSchema> {
    config: ModuleConfig;
    private wsServer;
    currentState: StatePayload;
    constructor(internal: unknown);
    init(config: ModuleConfig): Promise<void>;
    destroy(): Promise<void>;
    configUpdated(config: ModuleConfig): Promise<void>;
    getConfigFields(): SomeCompanionConfigField[];
    updateActions(): void;
    updateFeedbacks(): void;
    updatePresets(): void;
    updateVariableDefinitions(): void;
    private initWebSocketServer;
    sendCommand(cmd: Record<string, unknown>, targetId?: string): void;
    isClientConnected(): boolean;
    getConnectedTabsCount(): number;
    cycleNextTab(): void;
    focusActiveTab(): void;
    cycleScrollMode(): void;
    selectTabByIndex(index: number): void;
    setServerPortError(port: number): void;
    onTabsListUpdated(tabs: ChromeTabItem[], activeTabId: number | string | null): void;
    onClientListUpdated(): void;
    onStateUpdate(state: StatePayload, clientInfo?: ClientTabInfo): void;
}
