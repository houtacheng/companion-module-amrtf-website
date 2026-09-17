import { type SomeCompanionConfigField } from '@companion-module/base';
export type ModuleConfig = {
    wsPort: number;
    chromeIp?: string;
    targetTabMode: string;
};
export declare function GetConfigFields(): SomeCompanionConfigField[];
