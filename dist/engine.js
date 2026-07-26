import { documentHash, normalizeDocument } from './normalization.js';
import { diffText, hasTextChange } from './diff.js';
import { fetchSource } from './http.js';
import { classifyDiff, highestSeverity } from './rules.js';
import { readSnapshot, writeSnapshot } from './storage.js';
import { writeReport } from './report.js';
function reportStatus(sources) {
    if (sources.some((source) => source.status === 'error'))
        return 'error';
    if (sources.some((source) => source.status === 'changed'))
        return 'changed';
    if (sources.some((source) => source.status === 'initial'))
        return 'initial';
    return 'no_change';
}
export async function runSentry(config, options = {}) {
    const now = options.now || new Date();
    const fetcher = options.fetcher || fetchSource;
    const sources = [];
    // Sequential collection intentionally makes the first release respectful of
    // provider quotas and keeps failure attribution obvious in CI logs.
    for (const source of config.sources) {
        if (source.enabled === false) {
            sources.push({ source, status: 'skipped', classifications: [] });
            continue;
        }
        try {
            const previous = await readSnapshot(config.stateDir, source.id);
            const response = await fetcher(source);
            const normalizedText = normalizeDocument(response.content, response.contentType);
            const currentHash = documentHash(normalizedText);
            const snapshot = {
                schemaVersion: 1,
                sourceId: source.id,
                sourceUrl: response.resolvedUrl,
                contentType: response.contentType,
                fetchedAt: now.toISOString(),
                contentHash: currentHash,
                normalizedText,
            };
            if (!previous) {
                if (!options.dryRun)
                    await writeSnapshot(config.stateDir, snapshot);
                sources.push({ source, resolvedUrl: response.resolvedUrl, status: 'initial', fetchedAt: snapshot.fetchedAt, currentHash, classifications: [] });
                continue;
            }
            if (previous.contentHash === currentHash) {
                if (!options.dryRun)
                    await writeSnapshot(config.stateDir, snapshot);
                sources.push({ source, resolvedUrl: response.resolvedUrl, status: 'no_change', fetchedAt: snapshot.fetchedAt, previousHash: previous.contentHash, currentHash, classifications: [] });
                continue;
            }
            const diff = diffText(previous.normalizedText, normalizedText);
            const classifications = classifyDiff(source, diff);
            if (!options.dryRun)
                await writeSnapshot(config.stateDir, snapshot);
            sources.push({
                source,
                resolvedUrl: response.resolvedUrl,
                status: hasTextChange(diff) ? 'changed' : 'no_change',
                fetchedAt: snapshot.fetchedAt,
                previousHash: previous.contentHash,
                currentHash,
                diff,
                classifications,
            });
        }
        catch (error) {
            sources.push({ source, status: 'error', classifications: [], error: error instanceof Error ? error.message : 'Unknown collection error.' });
        }
    }
    const report = {
        schemaVersion: 1,
        project: config.project,
        status: reportStatus(sources),
        dryRun: Boolean(options.dryRun),
        generatedAt: now.toISOString(),
        highestSeverity: highestSeverity(sources.flatMap((source) => source.classifications)),
        sources,
    };
    return options.dryRun ? report : writeReport(report, config.reportDir);
}
//# sourceMappingURL=engine.js.map