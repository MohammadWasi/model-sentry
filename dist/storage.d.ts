import type { SourceSnapshot } from './types.js';
export declare function snapshotPath(stateDir: string, sourceId: string): string;
export declare function readSnapshot(stateDir: string, sourceId: string): Promise<SourceSnapshot | undefined>;
export declare function writeSnapshot(stateDir: string, snapshot: SourceSnapshot): Promise<void>;
export declare function writeTextFile(path: string, content: string): Promise<void>;
