import type { SourceDefinition } from './types.js';
export type ProviderPack = {
    schemaVersion: 1;
    provider: string;
    label: string;
    officialHosts: string[];
    reviewNote: string;
    sources: SourceDefinition[];
};
export declare function availablePacks(): Promise<string[]>;
export declare function loadProviderPack(name: string): Promise<ProviderPack>;
export declare function createConfigFromPacks(providerNames: string[], outputPath: string, project?: string, options?: {
    force?: boolean;
}): Promise<{
    path: string;
    providers: string[];
    sourceCount: number;
}>;
