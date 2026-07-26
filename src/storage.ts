import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { SourceSnapshot } from './types.js';

function sourceFilename(sourceId: string) {
  return `${sourceId.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
}

export function snapshotPath(stateDir: string, sourceId: string) {
  return join(stateDir, 'snapshots', sourceFilename(sourceId));
}

export async function readSnapshot(stateDir: string, sourceId: string): Promise<SourceSnapshot | undefined> {
  try {
    const parsed = JSON.parse(await readFile(snapshotPath(stateDir, sourceId), 'utf8')) as SourceSnapshot;
    if (parsed.schemaVersion !== 1 || parsed.sourceId !== sourceId || typeof parsed.normalizedText !== 'string') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export async function writeSnapshot(stateDir: string, snapshot: SourceSnapshot) {
  const target = snapshotPath(stateDir, snapshot.sourceId);
  await mkdir(join(stateDir, 'snapshots'), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

export async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
