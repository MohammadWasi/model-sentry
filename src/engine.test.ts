import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { runSentry } from './engine.js';
import type { SentryConfig, SourceFetcher } from './types.js';

test('the first run creates a baseline and the second run classifies a source-backed change', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'model-sentry-'));
  try {
    const config: SentryConfig = {
      version: 1,
      project: 'test-project',
      stateDir: join(temporary, 'state'),
      reportDir: join(temporary, 'reports'),
      sources: [{ id: 'notes', provider: 'example-ai', url: 'https://example.com/notes', kind: 'changelog' }],
    };
    let body = '<p>Model Alpha is available.</p>';
    const fetcher: SourceFetcher = async () => ({ content: body, contentType: 'text/html', resolvedUrl: 'https://example.com/notes/latest' });

    const initial = await runSentry(config, { fetcher, now: new Date('2026-07-26T00:00:00.000Z') });
    assert.equal(initial.status, 'initial');
    assert.equal(initial.sources[0]?.status, 'initial');

    body = '<p>Model Alpha will be deprecated and removed on August 1.</p>';
    const changed = await runSentry(config, { fetcher, now: new Date('2026-07-27T00:00:00.000Z') });
    assert.equal(changed.status, 'changed');
    assert.equal(changed.highestSeverity, 'critical');
    assert.equal(changed.sources[0]?.classifications[0]?.ruleId, 'model-lifecycle');
    assert.equal(changed.sources[0]?.resolvedUrl, 'https://example.com/notes/latest');
    assert.ok(changed.reportPath);
    assert.match(await readFile(changed.markdownPath || '', 'utf8'), /Retrieved from: <https:\/\/example\.com\/notes\/latest>/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
