import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyDiff, highestSeverity } from './rules.js';

const source = {
  id: 'provider-notes',
  provider: 'example-ai',
  url: 'https://example.com/changelog',
  kind: 'changelog' as const,
};

test('model lifecycle notices are classified as critical', () => {
  const classifications = classifyDiff(source, { added: ['Model Alpha will be deprecated and removed on July 1.'], removed: [] });
  assert.equal(classifications[0]?.ruleId, 'model-lifecycle');
  assert.equal(highestSeverity(classifications), 'critical');
});

test('pricing changes are classified as high', () => {
  const classifications = classifyDiff(source, { added: ['Output token pricing is now $12 per million tokens.'], removed: [] });
  assert.equal(classifications.find((classification) => classification.ruleId === 'pricing-change')?.severity, 'high');
});
