#!/usr/bin/env node

import { resolve } from 'node:path';

import { loadConfig } from './config.js';
import { runSentry } from './engine.js';
import { availablePacks, createConfigFromPacks } from './packs.js';
import { failsAtSeverity, renderMarkdown } from './report.js';
import type { Severity } from './types.js';

const severityValues = new Set(['none', 'low', 'medium', 'high', 'critical']);

function valueFor(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function usage() {
  return `Model Sentry — source-backed AI vendor change detection

Usage:
  model-sentry init --providers openai,anthropic,google-gemini [--config model-sentry.json] [--project name] [--force]
  model-sentry run [--config model-sentry.json] [--dry-run] [--fail-on none|low|medium|high|critical]
  model-sentry packs

State is stored locally by default. Review the original source before acting on a report.`;
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }
  if (command === 'packs') {
    console.log((await availablePacks()).join('\n'));
    return;
  }
  if (command === 'init') {
    const providers = (valueFor(args, '--providers') || '').split(',').map((provider) => provider.trim()).filter(Boolean);
    if (!providers.length) throw new Error('init requires --providers. Run `model-sentry packs` to see available packs.');
    const created = await createConfigFromPacks(providers, valueFor(args, '--config') || 'model-sentry.json', valueFor(args, '--project'), { force: hasFlag(args, '--force') });
    console.log(`Created ${created.path} with ${created.sourceCount} source(s) from ${created.providers.join(', ')}.`);
    return;
  }
  if (command === 'run') {
    const failOn = valueFor(args, '--fail-on') || 'none';
    if (!severityValues.has(failOn)) throw new Error(`Invalid --fail-on value: ${failOn}`);
    const config = await loadConfig(resolve(valueFor(args, '--config') || 'model-sentry.json'));
    const report = await runSentry(config, { dryRun: hasFlag(args, '--dry-run') });
    console.log(renderMarkdown(report));
    if (report.reportPath) console.log(`JSON report: ${report.reportPath}`);
    if (failsAtSeverity(report, failOn as Severity | 'none')) process.exitCode = 2;
    return;
  }
  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch((error) => {
  console.error(`Model Sentry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
