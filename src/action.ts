import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { loadConfig } from './config.js';
import { runSentry } from './engine.js';
import { failsAtSeverity, renderMarkdown } from './report.js';
import type { Severity } from './types.js';

const validSeverities = new Set(['none', 'low', 'medium', 'high', 'critical']);

function actionInput(name: string, fallback: string) {
  return process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`]?.trim() || fallback;
}

async function setOutput(name: string, value: string) {
  const path = process.env.GITHUB_OUTPUT;
  if (path) await appendFile(path, `${name}<<MODEL_SENTRY_EOF\n${value}\nMODEL_SENTRY_EOF\n`);
}

async function main() {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const configPath = resolve(workspace, actionInput('config-path', 'model-sentry.json'));
  const failOn = actionInput('fail-on', 'none');
  if (!validSeverities.has(failOn)) throw new Error(`Invalid fail-on severity: ${failOn}`);
  const dryRun = actionInput('dry-run', 'false') === 'true';
  const report = await runSentry(await loadConfig(configPath), { dryRun });
  const markdown = renderMarkdown(report);
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  await setOutput('status', report.status);
  await setOutput('report-path', report.reportPath || '');
  await setOutput('highest-severity', report.highestSeverity || '');
  if (failsAtSeverity(report, failOn as Severity | 'none')) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Model Sentry action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
