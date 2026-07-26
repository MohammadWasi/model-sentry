import type { TextDiff } from './types.js';
/**
 * Paragraph-level diffs are stable across layout-only changes and preserve
 * enough surrounding source text for a reviewer to verify the event.
 */
export declare function diffText(previousText: string, currentText: string): TextDiff;
export declare function hasTextChange(diff: TextDiff): boolean;
