import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadConfig } from './config.js';
async function withConfig(config, run) {
    const directory = await mkdtemp(join(tmpdir(), 'model-sentry-config-'));
    const path = join(directory, 'model-sentry.json');
    try {
        await writeFile(path, JSON.stringify(config), 'utf8');
        await run(path);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
}
const validConfig = {
    version: 1,
    sources: [{ id: 'notes', provider: 'example', title: 'Example release notes', url: 'https://docs.example.com/releases', kind: 'changelog' }],
};
test('configuration rejects private sources and misspelled fields', async () => {
    await withConfig({ ...validConfig, sources: [{ ...validConfig.sources[0], url: 'https://127.0.0.1/releases' }] }, async (path) => {
        await assert.rejects(loadConfig(path), /public HTTP\(S\)/);
    });
    await withConfig({ ...validConfig, reportDirectory: 'reports' }, async (path) => {
        await assert.rejects(loadConfig(path), /unsupported field/);
    });
    await withConfig({ ...validConfig, sources: [{ ...validConfig.sources[0], enabled: 'false' }] }, async (path) => {
        await assert.rejects(loadConfig(path), /enabled must be a boolean/);
    });
});
//# sourceMappingURL=config.test.js.map