import { createHash } from 'node:crypto';

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function normalizeDocument(content: string, contentType: string) {
  if (contentType.includes('json')) {
    try {
      return stableJson(JSON.parse(content));
    } catch {
      // Keep a malformed JSON response observable rather than silently dropping it.
    }
  }

  const withoutUnsafeBlocks = content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<(?:nav|header|footer|aside|template)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside|template)>/gi, '');
  const withBreaks = withoutUnsafeBlocks.replace(/<\/?(?:article|section|div|p|li|h[1-6]|br|tr|td|pre|code)[^>]*>/gi, '\n');
  return decodeHtml(withBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function documentHash(normalizedText: string) {
  return createHash('sha256').update(normalizedText).digest('hex');
}

export function toSegments(normalizedText: string, maximumLength = 480) {
  const segments: string[] = [];
  for (const rawSegment of normalizedText.split(/\n+/)) {
    let remaining = rawSegment.trim();
    while (remaining.length > maximumLength) {
      const boundary = Math.max(remaining.lastIndexOf('. ', maximumLength), remaining.lastIndexOf('; ', maximumLength), remaining.lastIndexOf(' ', maximumLength));
      const end = boundary > maximumLength / 2 ? boundary + 1 : maximumLength;
      const segment = remaining.slice(0, end).trim();
      if (segment.length > 8) segments.push(segment);
      remaining = remaining.slice(end).trim();
    }
    if (remaining.length > 8) segments.push(remaining);
  }
  return [...new Set(segments)];
}
