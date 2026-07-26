import type { ChangeClassification, Severity, SourceDefinition, TextDiff } from './types.js';
export declare function compareSeverity(left: Severity, right: Severity): number;
export declare function classifyDiff(source: SourceDefinition, diff: TextDiff): ChangeClassification[];
export declare function highestSeverity(classifications: ChangeClassification[]): "low" | "medium" | "high" | "critical" | undefined;
