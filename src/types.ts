export const severities = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severities)[number];

export type SourceKind = 'changelog' | 'documentation' | 'pricing' | 'sdk';

export type SourceDefinition = {
  id: string;
  provider: string;
  title?: string;
  url: string;
  kind: SourceKind;
  enabled?: boolean;
  maxBytes?: number;
};

export type SentryConfig = {
  version: 1;
  project?: string;
  stateDir: string;
  reportDir: string;
  sources: SourceDefinition[];
};

export type SourceSnapshot = {
  schemaVersion: 1;
  sourceId: string;
  sourceUrl: string;
  contentType: string;
  fetchedAt: string;
  contentHash: string;
  normalizedText: string;
};

export type TextDiff = {
  added: string[];
  removed: string[];
};

export type ChangeClassification = {
  ruleId: string;
  severity: Severity;
  summary: string;
  evidence: string[];
};

export type SourceRunStatus = 'initial' | 'no_change' | 'changed' | 'error' | 'skipped';

export type SourceRun = {
  source: SourceDefinition;
  resolvedUrl?: string;
  status: SourceRunStatus;
  fetchedAt?: string;
  previousHash?: string;
  currentHash?: string;
  diff?: TextDiff;
  classifications: ChangeClassification[];
  error?: string;
};

export type RunStatus = 'initial' | 'no_change' | 'changed' | 'error';

export type RunReport = {
  schemaVersion: 1;
  project?: string;
  status: RunStatus;
  dryRun: boolean;
  generatedAt: string;
  highestSeverity?: Severity;
  sources: SourceRun[];
  reportPath?: string;
  markdownPath?: string;
};

export type FetchResult = {
  content: string;
  contentType: string;
  resolvedUrl: string;
};

export type SourceFetcher = (source: SourceDefinition) => Promise<FetchResult>;

export type RunOptions = {
  dryRun?: boolean;
  now?: Date;
  fetcher?: SourceFetcher;
};
