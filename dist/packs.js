import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeSourceUrl } from './source-url.js';
const sourceKinds = ['changelog', 'documentation', 'pricing', 'sdk'];
const identifierPattern = /^[a-zA-Z0-9._-]+$/;
function packsDirectory() {
    return fileURLToPath(new URL('../packs/', import.meta.url));
}
function asRecord(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
function asText(value, label, maximumLength) {
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
function sourceFromPack(value, index, provider, officialHosts) {
    const source = asRecord(value, `sources[${index}]`);
    assertOnlyKeys(source, ['id', 'provider', 'title', 'url', 'kind', 'maxBytes'], `sources[${index}]`);
    const id = asText(source.id, `sources[${index}].id`, 80);
    if (!identifierPattern.test(id))
        throw new Error(`sources[${index}].id may contain only letters, numbers, dots, underscores, and dashes.`);
    if (source.provider !== provider)
        throw new Error(`sources[${index}].provider must be ${provider}.`);
    const title = asText(source.title, `sources[${index}].title`, 160);
    const url = asText(source.url, `sources[${index}].url`, 2_000);
    const parsedUrl = assertSafeSourceUrl(url);
    if (parsedUrl.protocol !== 'https:')
        throw new Error(`sources[${index}].url must use HTTPS.`);
    if (!officialHosts.includes(parsedUrl.hostname.toLowerCase())) {
        throw new Error(`sources[${index}].url must use one of the declared official hosts.`);
    }
    if (!sourceKinds.includes(source.kind))
        throw new Error(`sources[${index}].kind must be one of: ${sourceKinds.join(', ')}.`);
    if (source.maxBytes !== undefined && (typeof source.maxBytes !== 'number' || !Number.isInteger(source.maxBytes) || source.maxBytes < 1_024 || source.maxBytes > 5 * 1024 * 1024)) {
        throw new Error(`sources[${index}].maxBytes must be an integer from 1024 to 5242880.`);
    }
    return { id, provider, title, url, kind: source.kind, maxBytes: source.maxBytes };
}
function parsePack(value, expectedName) {
    const pack = asRecord(value, `Provider pack ${expectedName}`);
    assertOnlyKeys(pack, ['schemaVersion', 'provider', 'label', 'officialHosts', 'reviewNote', 'sources'], `Provider pack ${expectedName}`);
    if (pack.schemaVersion !== 1)
        throw new Error(`Provider pack ${expectedName} must use schemaVersion 1.`);
    const provider = asText(pack.provider, `Provider pack ${expectedName}.provider`, 80);
    if (provider !== expectedName || !identifierPattern.test(provider))
        throw new Error(`Provider pack ${expectedName} has an invalid provider identifier.`);
    const label = asText(pack.label, `Provider pack ${expectedName}.label`, 80);
    if (!Array.isArray(pack.officialHosts) || !pack.officialHosts.length)
        throw new Error(`Provider pack ${expectedName}.officialHosts must be a non-empty array.`);
    const officialHosts = pack.officialHosts.map((host, index) => {
        const value = asText(host, `Provider pack ${expectedName}.officialHosts[${index}]`, 253).toLowerCase();
        if (!/^[a-z0-9.-]+$/.test(value) || value.startsWith('.') || value.endsWith('.') || value.includes('..')) {
            throw new Error(`Provider pack ${expectedName}.officialHosts[${index}] is invalid.`);
        }
        return value;
    });
    if (new Set(officialHosts).size !== officialHosts.length)
        throw new Error(`Provider pack ${expectedName}.officialHosts must not repeat a host.`);
    const reviewNote = asText(pack.reviewNote, `Provider pack ${expectedName}.reviewNote`, 500);
    if (!Array.isArray(pack.sources) || !pack.sources.length)
        throw new Error(`Provider pack ${expectedName}.sources must be a non-empty array.`);
    if (pack.sources.length > 10)
        throw new Error(`Provider pack ${expectedName} may include at most 10 sources.`);
    const sources = pack.sources.map((source, index) => sourceFromPack(source, index, provider, officialHosts));
    if (new Set(sources.map((source) => source.id)).size !== sources.length)
        throw new Error(`Provider pack ${expectedName} contains duplicate source ids.`);
    return { schemaVersion: 1, provider, label, officialHosts, reviewNote, sources };
}
export async function availablePacks() {
    const entries = await readdir(packsDirectory(), { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name.slice(0, -'.json'.length)).sort();
}
export async function loadProviderPack(name) {
    if (!identifierPattern.test(name))
        throw new Error(`Invalid provider pack name: ${name}`);
    let raw;
    try {
        raw = JSON.parse(await readFile(resolve(packsDirectory(), `${name}.json`), 'utf8'));
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Unable to read provider pack ${name}: ${reason}`);
    }
    return parsePack(raw, name);
}
export async function createConfigFromPacks(providerNames, outputPath, project, options = {}) {
    if (!providerNames.length)
        throw new Error('At least one provider pack is required.');
    if (new Set(providerNames).size !== providerNames.length)
        throw new Error('Each provider pack may be selected only once.');
    const packs = await Promise.all(providerNames.map(loadProviderPack));
    const sources = packs.flatMap((pack) => pack.sources);
    if (new Set(sources.map((source) => source.id)).size !== sources.length)
        throw new Error('Selected provider packs contain duplicate source ids.');
    const normalizedProject = project && project.trim() ? asText(project, 'project', 120) : undefined;
    const config = {
        version: 1,
        project: normalizedProject,
        stateDir: '.model-sentry/state',
        reportDir: '.model-sentry/reports',
        sources,
    };
    const target = resolve(outputPath);
    await mkdir(dirname(target), { recursive: true });
    try {
        await writeFile(target, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', flag: options.force ? 'w' : 'wx' });
    }
    catch (error) {
        if (error.code === 'EEXIST') {
            throw new Error(`Refusing to replace existing config at ${target}. Pass --force to replace it.`);
        }
        throw error;
    }
    return { path: target, providers: packs.map((pack) => pack.provider), sourceCount: sources.length };
}
//# sourceMappingURL=packs.js.map