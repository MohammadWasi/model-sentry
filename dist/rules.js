const rules = [
    {
        id: 'model-lifecycle',
        severity: 'critical',
        pattern: /\b(deprecat(?:ed|ion)|sunset|retir(?:e|ed|ing)|end[- ]of[- ]life|will be removed|no longer available)\b/i,
        summary: (source) => `${source.provider} published a potential model or feature lifecycle change.`,
    },
    {
        id: 'breaking-api-change',
        severity: 'high',
        pattern: /\b(breaking change|backward incompatible|no longer support(?:ed)?|removed (?:the )?(?:api|endpoint|parameter|method)|migration required)\b/i,
        summary: (source) => `${source.provider} published a potential breaking API change.`,
    },
    {
        id: 'pricing-change',
        severity: 'high',
        pattern: /\b(pric(?:e|ing)|cost per|per (?:million|1m|1,000,000) tokens|input tokens|output tokens|billing)\b|\$\s*\d/i,
        summary: (source) => `${source.provider} published a potential pricing or billing change.`,
    },
    {
        id: 'rate-limit-change',
        severity: 'medium',
        pattern: /\b(rate limit|quota|requests per (?:minute|day)|tokens per minute|rpm|tpm|throttl)/i,
        summary: (source) => `${source.provider} published a potential capacity or rate-limit change.`,
    },
    {
        id: 'sdk-release',
        severity: 'low',
        pattern: /\b(sdk|client library|version\s+v?\d+\.\d+|release notes?)\b/i,
        summary: (source) => `${source.provider} published an SDK or release-note change.`,
    },
];
const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
export function compareSeverity(left, right) {
    return severityRank[left] - severityRank[right];
}
export function classifyDiff(source, diff) {
    const changedText = [...diff.added, ...diff.removed.map((line) => `Removed: ${line}`)];
    return rules.flatMap((rule) => {
        const evidence = changedText.filter((line) => rule.pattern.test(line)).slice(0, 3);
        return evidence.length ? [{ ruleId: rule.id, severity: rule.severity, summary: rule.summary(source), evidence }] : [];
    });
}
export function highestSeverity(classifications) {
    return classifications.reduce((highest, classification) => {
        if (!highest || compareSeverity(classification.severity, highest) > 0)
            return classification.severity;
        return highest;
    }, undefined);
}
//# sourceMappingURL=rules.js.map