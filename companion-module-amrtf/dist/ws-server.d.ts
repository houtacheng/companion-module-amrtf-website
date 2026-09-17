import { WebSocket } from 'ws';
import type ModuleInstance from './main.js';
export interface ClientTabInfo {
    id: string;
    ws: WebSocket;
    ip: string;
    lessonNumber: string;
    lessonTitle: string;
    isFocused: boolean;
    lastSeen: number;
}
export interface ChromeTabItem {
    id: number | string;
    lessonNumber: string;
    lessonTitle: string;
    isFocused: boolean;
}
export declare class AmrtfWsServer {
    private wss;
    private clients;
    private instance;
    private activeClientId;
    private chromeTabs;
    private activeChromeTabId;
    constructor(instance: ModuleInstance);
    start(port: number, allowedIp?: string): void;
    sendCommand(command: Record<string, unknown>, targetId?: string): void;
    setActiveClient(clientId: string): void;
    cycleNextTab(): void;
    focusActiveTab(): void;
    selectTabByIndex(index: number): void;
    getChromeTabs(): ChromeTabItem[];
    getChromeTabsCount(): number;
    getActiveClient(): ClientTabInfo | null;
    getClientList(): ClientTabInfo[];
    hasClients(): boolean;
    stop(): void;
}
