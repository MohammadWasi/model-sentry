import { toSegments } from './normalization.js';
/**
 * Paragraph-level diffs are stable across layout-only changes and preserve
 * enough surrounding source text for a reviewer to verify the event.
 */
export function diffText(previousText, currentText) {
    const before = new Set(toSegments(previousText));
    const after = new Set(toSegments(currentText));
    return {
        added: [...after].filter((segment) => !before.has(segment)),
        removed: [...before].filter((segment) => !after.has(segment)),
    };
}
export function hasTextChange(diff) {
    return diff.added.length > 0 || diff.removed.length > 0;
}
//# sourceMappingURL=diff.js.map