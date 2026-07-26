import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSafeSourceUrl, isNonPublicAddress } from './source-url.js';

test('non-public IPv4 and IPv6 literals are rejected', () => {
  for (const address of ['0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.1.1', '172.16.0.1', '192.168.0.1', '198.18.0.1', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:7f00:1']) {
    assert.equal(isNonPublicAddress(address), true, address);
  }
});

test('public URLs are accepted while local URLs and credentials are rejected', () => {
  assert.equal(assertSafeSourceUrl('https://docs.example.com/releases').hostname, 'docs.example.com');
  for (const value of ['file:///tmp/notes', 'https://user:secret@example.com/notes', 'https://localhost/notes', 'https://127.0.0.1/notes', 'https://[::1]/notes']) {
    assert.throws(() => assertSafeSourceUrl(value));
  }
});
