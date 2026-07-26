import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadConfig } from './config.js';
import { availablePacks, createConfigFromPacks, loadProviderPack } from './packs.js';

const expectedPacks = {
  anthropic: {
    host: 'platform.claude.com',
    url: 'https://platform.claude.com/docs/en/release-notes/overview',
  },
  'google-gemini': {
    host: 'ai.google.dev',
    url: 'https://ai.google.dev/gemini-api/docs/changelog',
  },
  openai: {
    host: 'developers.openai.com',
    url: 'https://developers.openai.com/api/docs/changelog',
  },
};

test('starter provider pack fixtures are restricted to reviewed official changelogs', async () => {
  assert.deepEqual(await availablePacks(), Object.keys(expectedPacks));
  for (const [name, expected] of Object.entries(expectedPacks)) {
    const pack = await loadProviderPack(name);
    assert.equal(pack.schemaVersion, 1);
    assert.ok(pack.reviewNote.includes('public'));
    assert.ok(pack.officialHosts.includes(expected.host));
    assert.equal(pack.sources.length, 1);
    assert.equal(pack.sources[0]?.url, expected.url);
    assert.equal(new URL(pack.sources[0]?.url || '').hostname, expected.host);
    assert.equal(pack.sources[0]?.kind, 'changelog');
  }
});

test('initializing packs produces a strict, loadable config without overwriting it by default', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'model-sentry-packs-'));
  const output = join(directory, 'model-sentry.json');
  try {
    const created = await createConfigFromPacks(['openai', 'anthropic', 'google-gemini'], output, 'fixture-project');
    assert.equal(created.sourceCount, 3);
    assert.equal((await loadConfig(output)).sources.length, 3);
    const serialized = JSON.parse(await readFile(output, 'utf8')) as { sources: Array<Record<string, unknown>> };
    assert.deepEqual(Object.keys(serialized.sources[0] || {}).sort(), ['id', 'kind', 'provider', 'title', 'url']);
    await assert.rejects(createConfigFromPacks(['openai'], output), /Refusing to replace existing config/);
    await assert.rejects(createConfigFromPacks(['openai', 'openai'], join(directory, 'duplicate.json')), /only once/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
