import type { FetchResult, SourceDefinition, SourceFetcher } from './types.js';
import { assertSafeSourceUrl } from './source-url.js';

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

async function readBoundedBody(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength && declaredLength > maxBytes) throw new Error(`Response exceeds the ${maxBytes}-byte limit.`);
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeds the ${maxBytes}-byte limit.`);
    }
    chunks.push(value);
  }
  const content = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(content);
}

export const fetchSource: SourceFetcher = async (source: SourceDefinition): Promise<FetchResult> => {
  assertSafeSourceUrl(source.url);
  const response = await fetch(source.url, {
    headers: {
      accept: 'text/html, text/plain, application/json;q=0.9, */*;q=0.1',
    'user-agent': 'ModelSentry/0.1',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  assertSafeSourceUrl(response.url || source.url);
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  return {
    content: await readBoundedBody(response, source.maxBytes || DEFAULT_MAX_BYTES),
    contentType: response.headers.get('content-type') || 'text/plain',
    resolvedUrl: response.url || source.url,
  };
};
