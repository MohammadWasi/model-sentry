import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { assertSafeSourceUrl } from './source-url.js';
const sourceKinds = ['changelog', 'documentation', 'pricing', 'sdk'];
function asRecord(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
function asText(value, label, maximumLength = 160) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maximumLength || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new Error(`${label} must be a non-empty, single-line string up to ${maximumLength} characters.`);
    }
    return value.trim();
}
function assertOnlyKeys(value, allowed, label) {
    const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
    if (unexpected.length)
        throw new Error(`${label} contains unsupported field(s): ${unexpected.join(', ')}.`);
}
function parseSource(value, index) {
    const source = asRecord(value, `sources[${index}]`);
    assertOnlyKeys(source, ['id', 'provider', 'title', 'url', 'kind', 'enabled', 'maxBytes'], `sources[${index}]`);
    const id = asText(source.id, `sources[${index}].id`, 80);
    if (!/^[a-zA-Z0-9._-]+$/.test(id))
        throw new Error(`sources[${index}].id may contain only letters, numbers, dots, underscores, and dashes.`);
    const provider = asText(source.provider, `sources[${index}].provider`, 80);
    const url = asText(source.url, `sources[${index}].url`, 2_000);
    try {
        assertSafeSourceUrl(url);
    }
    catch {
        throw new Error(`sources[${index}].url must be a public HTTP(S) URL without credentials.`);
    }
    if (!sourceKinds.includes(source.kind))
        throw new Error(`sources[${index}].kind must be one of: ${sourceKinds.join(', ')}.`);
    if (source.enabled !== undefined && typeof source.enabled !== 'boolean')
        throw new Error(`sources[${index}].enabled must be a boolean.`);
    if (source.title !== undefined && typeof source.title !== 'string')
        throw new Error(`sources[${index}].title must be a string.`);
    const title = source.title === undefined ? undefined : asText(source.title, `sources[${index}].title`);
    if (source.maxBytes !== undefined && typeof source.maxBytes !== 'number')
        throw new Error(`sources[${index}].maxBytes must be a number.`);
    const maxBytes = source.maxBytes;
    if (maxBytes !== undefined && (!Number.isInteger(maxBytes) || maxBytes < 1_024 || maxBytes > 5 * 1024 * 1024)) {
        throw new Error(`sources[${index}].maxBytes must be an integer from 1024 to 5242880.`);
    }
    return {
        id,
        provider,
        title,
        url,
        kind: source.kind,
        enabled: source.enabled === undefined ? true : source.enabled,
        maxBytes,
    };
}
export async function loadConfig(configPath) {
    const absolutePath = resolve(configPath);
    let raw;
    try {
        raw = JSON.parse(await readFile(absolutePath, 'utf8'));
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Unable to read ${absolutePath}: ${reason}`);
    }
    const config = asRecord(raw, 'Model Sentry config');
    assertOnlyKeys(config, ['version', 'project', 'stateDir', 'reportDir', 'sources'], 'Model Sentry config');
    if (config.version !== 1)
        throw new Error('version must be 1.');
    if (!Array.isArray(config.sources) || !config.sources.length)
        throw new Error('sources must be a non-empty array.');
    if (config.sources.length > 50)
        throw new Error('A config may include at most 50 sources.');
    if (config.project !== undefined && typeof config.project !== 'string')
        throw new Error('project must be a string.');
    if (config.stateDir !== undefined && typeof config.stateDir !== 'string')
        throw new Error('stateDir must be a string.');
    if (config.reportDir !== undefined && typeof config.reportDir !== 'string')
        throw new Error('reportDir must be a string.');
    const sources = config.sources.map(parseSource);
    if (new Set(sources.map((source) => source.id)).size !== sources.length)
        throw new Error('Each source id must be unique.');
    const baseDirectory = dirname(absolutePath);
    return {
        version: 1,
        project: config.project === undefined ? undefined : asText(config.project, 'project', 120),
        stateDir: resolve(baseDirectory, config.stateDir === undefined ? '.model-sentry/state' : asText(config.stateDir, 'stateDir', 1_000)),
        reportDir: resolve(baseDirectory, config.reportDir === undefined ? '.model-sentry/reports' : asText(config.reportDir, 'reportDir', 1_000)),
        sources,
    };
}
//# sourceMappingURL=config.js.map