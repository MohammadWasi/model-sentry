import assert from 'node:assert/strict';
import test from 'node:test';

import { diffText } from './diff.js';
import { normalizeDocument } from './normalization.js';

test('normalization removes volatile markup while retaining readable source text', () => {
  const normalized = normalizeDocument('<article><h1>Release notes</h1><script>ignore()</script><p>Model A is available.</p></article>', 'text/html');
  assert.equal(normalized, 'Release notes\n\nModel A is available.');
});

test('normalization removes common site chrome before diffing a document', () => {
  const normalized = normalizeDocument('<header>Marketing navigation</header><main><h1>Release notes</h1><p>Model A is available.</p></main><footer>Copyright</footer>', 'text/html');
  assert.equal(normalized, 'Release notes\n\nModel A is available.');
});

test('diff identifies meaningful added and removed segments', () => {
  const diff = diffText('Model A is available.\nRate limit is 100 RPM.', 'Model A is deprecated.\nRate limit is 200 RPM.');
  assert.deepEqual(diff.added, ['Model A is deprecated.', 'Rate limit is 200 RPM.']);
  assert.deepEqual(diff.removed, ['Model A is available.', 'Rate limit is 100 RPM.']);
});
