import type { RunReport, Severity, SourceRun } from './types.js';
export declare function renderMarkdown(report: RunReport): string;
export declare function writeReport(report: RunReport, reportDir: string): Promise<{
    reportPath: string;
    markdownPath: string;
    schemaVersion: 1;
    project?: string;
    status: import("./types.js").RunStatus;
    dryRun: boolean;
    generatedAt: string;
    highestSeverity?: Severity;
    sources: SourceRun[];
}>;
export declare function failsAtSeverity(report: RunReport, threshold: Severity | 'none'): boolean;
