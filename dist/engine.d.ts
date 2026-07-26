import type { RunOptions, RunReport, SentryConfig } from './types.js';
export declare function runSentry(config: SentryConfig, options?: RunOptions): Promise<RunReport>;
