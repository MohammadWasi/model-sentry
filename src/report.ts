import { join } from 'node:path';

import type { RunReport, Severity, SourceRun } from './types.js';
import { writeTextFile } from './storage.js';

const severityRank: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function reportSummary(report: RunReport) {
  return report.sources.reduce((summary, source) => {
    summary[source.status] = (summary[source.status] || 0) + 1;
    return summary;
  }, {} as Record<string, number>);
}

function sourceLocation(source: SourceRun) {
  const configured = `- Source: <${source.source.url}>`;
  return source.resolvedUrl && source.resolvedUrl !== source.source.url
    ? `${configured}\n- Retrieved from: <${source.resolvedUrl}>`
    : configured;
}

function evidenceCode(value: string) {
  return `\`${value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/`/g, "'").slice(0, 220)}\``;
}

function sourceMarkdown(source: SourceRun, dryRun: boolean) {
  const title = source.source.title || source.source.id;
  if (source.status === 'error') return `### ${title}\n\n- Status: **error** — ${source.error}\n${sourceLocation(source)}\n`;
  if (source.status === 'initial') return `### ${title}\n\n- Status: **${dryRun ? 'baseline would be created' : 'baseline created'}**\n${sourceLocation(source)}\n`;
  if (source.status === 'no_change') return `### ${title}\n\n- Status: no material text change\n${sourceLocation(source)}\n`;
  if (source.status === 'skipped') return `### ${title}\n\n- Status: skipped\n${sourceLocation(source)}\n`;
  const classifications = source.classifications.length
    ? source.classifications.map((classification) => `- **${classification.severity.toUpperCase()} · ${classification.ruleId}** — ${classification.summary}\n  - Evidence: ${classification.evidence.map(evidenceCode).join('; ')}`).join('\n')
    : '- **LOW · content-change** — Source text changed but no semantic rule matched. Review the source diff.';
  const diff = source.diff ? `\n- Added segments: ${source.diff.added.length}; removed segments: ${source.diff.removed.length}` : '';
  return `### ${title}\n\n- Status: **changed**\n${sourceLocation(source)}${diff}\n${classifications}\n`;
}

export function renderMarkdown(report: RunReport) {
  const summary = reportSummary(report);
  return [
    '# Model Sentry report',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Status: **${report.status}**`,
    `- Dry run: **${report.dryRun ? 'yes' : 'no'}**`,
    `- Highest severity: **${report.highestSeverity || 'none'}**`,
    `- Sources: ${report.sources.length} (${Object.entries(summary).map(([status, count]) => `${count} ${status}`).join(', ') || 'none'})`,
    '',
    ...report.sources.map((source) => sourceMarkdown(source, report.dryRun)),
    '## Review guidance',
    '',
    'Model Sentry detects source text changes; it does not prove a production impact. Open the original source, confirm scope against your dependency version and configuration, then decide whether to act.',
    '',
  ].join('\n');
}

export async function writeReport(report: RunReport, reportDir: string) {
  const baseName = `model-sentry-${report.generatedAt.replace(/[:.]/g, '-')}`;
  const jsonPath = join(reportDir, `${baseName}.json`);
  const markdownPath = join(reportDir, `${baseName}.md`);
  const reportWithPaths = { ...report, reportPath: jsonPath, markdownPath };
  await writeTextFile(jsonPath, `${JSON.stringify(reportWithPaths, null, 2)}\n`);
  await writeTextFile(markdownPath, renderMarkdown(reportWithPaths));
  return reportWithPaths;
}

export function failsAtSeverity(report: RunReport, threshold: Severity | 'none') {
  if (threshold === 'none' || !report.highestSeverity) return false;
  return severityRank[report.highestSeverity] >= severityRank[threshold];
}
