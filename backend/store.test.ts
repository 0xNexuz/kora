import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store.ts';
import { tempStore } from './test-helpers.ts';
import { hash } from './domain.ts';

test('roundtrip insert/get/list', () => {
  const t = tempStore();
  try {
    t.store.insert('run', 'r1', { id: 'r1', n: 5 });
    assert.deepEqual(t.store.get('run', 'r1'), { id: 'r1', n: 5 });
    assert.equal(t.store.get('run', 'missing'), null);
    assert.deepEqual(t.store.list('run'), [{ id: 'r1', n: 5 }]);
  } finally { t.close(); }
});

test('duplicate insert rejected', () => {
  const t = tempStore();
  try {
    t.store.insert('run', 'r1', 1);
    assert.throws(() => t.store.insert('run', 'r1', 2), (e: unknown) => (e as Error & {code:string}).code === 'DUPLICATE_RUN');
  } finally { t.close(); }
});

test('replace bumps revision and rejects missing keys', () => {
  const t = tempStore();
  try {
    t.store.insert('run', 'r1', { n: 1 });
    t.store.replace('run', 'r1', { n: 2 });
    assert.deepEqual(t.store.get('run', 'r1'), { n: 2 });
    assert.throws(() => t.store.replace('run', 'missing', 1), (e: unknown) => (e as Error & {code:string}).code === 'NOT_FOUND');
  } finally { t.close(); }
});

test('atomic rolls back on throw', () => {
  const t = tempStore();
  try {
    t.store.insert('run', 'r0', 1);
    assert.throws(() =>
      t.store.atomic(() => {
        t.store.insert('run', 'r1', 1);
        throw new Error('boom');
      }),
    );
    assert.equal(t.store.get('run', 'r1'), null);
    assert.equal(t.store.get('run', 'r0'), 1);
  } finally { t.close(); }
});

test('atomic enforces uniqueness inside the transaction', () => {
  const t = tempStore();
  try {
    t.store.insert('run', 'r0', 1);
    assert.throws(() =>
      t.store.atomic(() =>
        t.store.insert('run', 'r0', 2),
      ),
      (e: unknown) => (e as Error).message.includes('SQLITE_CONSTRAINT') || (e as Error & {code:string}).code === 'DUPLICATE_RUN',
    );
    assert.equal(t.store.get('run', 'r0'), 1);
  } finally { t.close(); }
});

test('payloads are encrypted at rest', () => {
  const t = tempStore();
  try {
    t.store.insert('secret', 'marker', { plaintext: 'S3CR3T-MARKER-42' });
    const raw = readFileSync(join(t.dir, 'kora.sqlite'), 'utf8');
    assert.ok(!raw.includes('S3CR3T-MARKER-42'));
  } finally { t.close(); }
});

test('invalid storage key file rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-test-key-'));
  try {
    writeFileSync(join(dir, 'data.key'), Buffer.alloc(16));
    assert.throws(() => new Store(dir), (e: unknown) => (e as Error & {code:string}).code === 'INVALID_STORAGE_KEY');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('audit log builds a verifiable hash chain', () => {
  const t = tempStore();
  try {
    const d1 = t.store.audit({ event: 'A', at: 1 });
    const d2 = t.store.audit({ event: 'B', at: 2 });
    assert.equal(d1, hash({ previous: 'GENESIS', event: { event: 'A', at: 1 } }));
    assert.equal(d2, hash({ previous: d1, event: { event: 'B', at: 2 } }));
    assert.equal(t.store.verifyAudit(), d2);
  } finally { t.close(); }
});

test('audit tampering is detected', () => {
  const t = tempStore();
  try {
    const d1 = t.store.audit({ event: 'A', at: 1 });
    t.store.audit({ event: 'B', at: 2 });
    // Rewrite the middle entry's encrypted payload out-of-band.
    (t.store.db.prepare('UPDATE audit SET payload=? WHERE seq=2').run(t.store.seal({ event: 'TAMPERED', at: 99 })));
    assert.throws(() => t.store.verifyAudit(), (e: unknown) => (e as Error & {code:string}).code === 'AUDIT_TAMPERED');
    assert.equal(d1.length, 66); // 0x + 64 hex chars
  } finally { t.close(); }
});

test('data encrypted with a different key cannot be read', () => {
  const t0 = tempStore();
  const t1 = tempStore();
  try {
    t0.store.insert('run', 'r0', { n: 7 });
    const sealed = t0.store.seal({ n: 7 });
    assert.throws(() => t1.store.open(sealed));
  } finally { t0.close(); t1.close(); }
});