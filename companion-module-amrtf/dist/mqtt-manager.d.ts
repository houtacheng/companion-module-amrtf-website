import type ModuleInstance from './main.js';
import type { StatePayload } from './main.js';
export declare class AmrtfMqttManager {
    private instance;
    private client;
    private prefix;
    constructor(instance: ModuleInstance);
    start(): void;
    private handleIncomingMessage;
    private handleSubControl;
    private executeAction;
    private parseTimeString;
    publishState(state: StatePayload, extra?: {
        tabsCount: number;
        activeTabTitle: string;
    }): void;
    stop(): void;
}
