import {describe,test,before,after} from 'node:test';
import {strict as assert} from 'node:assert';
import {createServer,request} from 'node:http';
import type {Server} from 'node:http';
import {createHandler} from './server.ts';
import {makeService,QUESTION,account} from './test-helpers.ts';
import {CHAIN} from './domain.ts';

type Json = Record<string, unknown>;
type T = ReturnType<typeof makeService>;

describe('HTTP layer', () => {
  let t: T;
  let server: Server;
  let base: string;
  let port: number;

  before(async () => {
    t = makeService();
    server = createServer(createHandler(t.store, t.service, {
      allowedHosts: ['*'],
      rateLimit: 1000,
      wallet: async () => ({ balance: '0', displayValue: 'DEMO' }),
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;
    base = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    t.close();
  });

  async function call(
    path: string,
    init: { method?: string; token?: string; json?: unknown; raw?: string } = {},
  ) {
    const headers: Record<string, string> = {};
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    if (init.json !== undefined || (init.raw !== undefined && init.method === 'POST')) {
      headers['Content-Type'] = 'application/json';
    }
    const body = init.json !== undefined ? JSON.stringify(init.json) : init.raw;
    const res = await fetch(base + path, {
      method: init.method ?? (body === undefined ? 'GET' : 'POST'),
      headers,
      body,
    });
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as Json) : {} };
  }

  function raw(
    path: string,
    init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  ) {
    return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; text: string }>(
      (resolve, reject) => {
        const req = request(
          { host: '127.0.0.1', port, path, method: init.method ?? 'GET', headers: init.headers },
          (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', (c) => (text += c));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text }));
          },
        );
        req.on('error', reject);
        if (init.body) req.write(init.body);
        req.end();
      },
    );
  }

  async function authenticate(): Promise<string> {
    const ch = await call('/v1/auth/challenge', { method: 'POST', json: {} });
    assert.equal(ch.status, 200);
    const sig = await account.signMessage({ message: String(ch.body.message) });
    const ok = await call('/v1/auth/verify', {
      method: 'POST',
      json: { id: String(ch.body.id), signature: sig, chainId: CHAIN },
    });
    assert.equal(ok.status, 200);
    return String(ok.body.token);
  }

  test('GET /health reports demo mode and chain id', async () => {
    const { status, body } = await call('/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.chainId, CHAIN);
  });

  test('GET /approval serves the HTML page with CSP', async () => {
    const res = await fetch(base + '/approval');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html');
    assert.match(String(res.headers.get('content-security-policy')), /frame-ancestors 'none'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('GET /approval.js serves the client script', async () => {
    const res = await fetch(base + '/approval.js');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/javascript');
  });

  test('unknown path is a JSON 404', async () => {
    const token = await authenticate();
    const { status, body } = await call('/nope', { token });
    assert.equal(status, 404);
    assert.equal(body.error, 'NOT_FOUND');
  });

  test('POST to an unknown path is a 404 even when authenticated', async () => {
    const token = await authenticate();
    const { status, body } = await call('/nope', { method: 'POST', token, json: {} });
    assert.equal(status, 404);
    assert.equal(body.error, 'NOT_FOUND');
  });

  test('host is validated against the allowlist', async () => {
    const hit = (st: Server) => async (host: string) =>
      await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const p = (st.address() as { port: number }).port;
        const r = request(
          { host: '127.0.0.1', port: p, path: '/health', headers: { Host: host } },
          (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
          },
        );
        r.on('error', reject);
        r.end();
      });
    const allow = createHandler(t.store, t.service, {
      allowedHosts: ['demo.kora.local:4001', 'localhost:4001'],
    });
    const s = createServer(allow);
    await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve));
    try {
      const good = await hit(s)('demo.kora.local:4001');
      assert.equal(good.status, 200);
      const evil = await hit(s)('evil.example:4001');
      assert.equal(evil.status, 400);
      assert.equal(JSON.parse(evil.body).error, 'INVALID_HOST');
    } finally {
      await new Promise<void>((resolve) => s.close(() => resolve()));
    }
  });

  test('cross-origin requests are rejected; allowed origins are reflected', async () => {
    const blocked = await raw('/health', { headers: { Origin: 'http://evil.example' } });
    assert.equal(blocked.status, 400);
    assert.equal(JSON.parse(blocked.text as string).error, 'INVALID_ORIGIN');
    const ok = await raw('/health', { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  test('OPTIONS preflight returns CORS headers', async () => {
    const pre = await raw('/v1/runs', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization',
      },
    });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(pre.headers['access-control-allow-methods'], 'GET, POST');
  });

  test('rate limiting trips after the per-window budget', async () => {
    const s = createServer(createHandler(t.store, t.service, { allowedHosts: ['*'], rateLimit: 2 }));
    await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve));
    try {
      const p = (s.address() as { port: number }).port;
      const hit = async () =>
        await new Promise<number>((resolve, reject) => {
          const r = request({ host: '127.0.0.1', port: p, path: '/health' }, (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode ?? 0));
          });
          r.on('error', reject);
          r.end();
        });
      assert.equal(await hit(), 200);
      assert.equal(await hit(), 200);
      assert.equal(await hit(), 400);
    } finally {
      await new Promise<void>((resolve) => s.close(() => resolve()));
    }
  });

  test('POST without a JSON content type is rejected', async () => {
    const res = await fetch(base + '/v1/runs', { method: 'POST' });
    const body = (await res.json()) as Json;
    assert.equal(res.status, 400);
    assert.equal(body.error, 'JSON_REQUIRED');
  });

  test('malformed JSON is rejected', async () => {
    const { status, body } = await call('/v1/runs', { method: 'POST', raw: '{"broken' });
    assert.equal(status, 400);
    assert.equal(body.error, 'INVALID_JSON');
  });

  test('oversized bodies are rejected', async () => {
    const { status, body } = await call('/v1/runs', { method: 'POST', raw: JSON.stringify({ a: 'x'.repeat(17000) }) });
    assert.equal(status, 400);
    assert.equal(body.error, 'BODY_TOO_LARGE');
  });

  test('protected routes require a valid session', async () => {
    const none = await call('/v1/graph');
    assert.equal(none.status, 401);
    assert.equal(none.body.error, 'UNAUTHORIZED');
    const bad = await call('/v1/graph', { token: 'deadbeef' });
    assert.equal(bad.status, 401);
  });

  test('challenge + verify authenticates the owner and mints a token', async () => {
    const token = await authenticate();
    assert.ok(token.length > 20);
    const graph = await call('/v1/graph', { token });
    assert.equal(graph.status, 200);
    assert.equal(graph.body.id, 'adas-pharmacy');
  });

  test('verify rejects the wrong chain', async () => {
    const ch = await call('/v1/auth/challenge', { method: 'POST', json: {} });
    const sig = await account.signMessage({ message: String(ch.body.message) });
    const bad = await call('/v1/auth/verify', {
      method: 'POST',
      json: { id: String(ch.body.id), signature: sig, chainId: 31337 },
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, 'WRONG_CHAIN');
  });

  test('verify rejects a challenge signed by a different wallet', async () => {
    const ch = await call('/v1/auth/challenge', { method: 'POST', json: {} });
    const { accountOther } = await import('./test-helpers.ts');
    const sig = await accountOther.signMessage({ message: String(ch.body.message) });
    const bad = await call('/v1/auth/verify', {
      method: 'POST',
      json: { id: String(ch.body.id), signature: sig, chainId: CHAIN },
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, 'WRONG_WALLET_OR_SIGNATURE');
  });

  test('challenges are single use', async () => {
    const ch = await call('/v1/auth/challenge', { method: 'POST', json: {} });
    const sig = await account.signMessage({ message: String(ch.body.message) });
    const payload = { id: String(ch.body.id), signature: sig, chainId: CHAIN };
    assert.equal((await call('/v1/auth/verify', { method: 'POST', json: payload })).status, 200);
    const replay = await call('/v1/auth/verify', { method: 'POST', json: payload });
    assert.equal(replay.status, 400);
    assert.equal(replay.body.error, 'INVALID_CHALLENGE');
  });

  test('skills and config endpoints list the demo surface', async () => {
    const token = await authenticate();
    const skills = await call('/v1/skills', { token });
    assert.equal(skills.status, 200);
    assert.equal((skills.body as unknown as Array<{ name: string }>).length, 12);
    const config = await call('/v1/config', { token });
    assert.equal(config.status, 200);
    assert.equal(config.body.chainId, CHAIN);
    assert.equal(config.body.mode, 'DEMO_BUSINESS_REAL_TESTNET_SETTLEMENT');
  });

  test('run + offer round trip through /v1/runs and /v1/offers', async () => {
    const token = await authenticate();
    const run = await call('/v1/runs', { method: 'POST', token, json: QUESTION });
    assert.equal(run.status, 200);
    const runId = String(run.body.id);
    const runList = await call('/v1/runs', { token });
    assert.equal((runList.body as unknown as unknown[]).length, 1);

    const offer = await call('/v1/offers', { method: 'POST', token, json: { runId } });
    assert.equal(offer.status, 200);
    assert.equal(offer.body.status, 'PROPOSED');
    const offerId = String(offer.body.id);
    const offerList = await call('/v1/offers', { token });
    assert.equal((offerList.body as unknown as unknown[]).length, 1);

    const approval = await call(`/v1/offers/${offerId}/approval`, { method: 'POST', token, json: {} });
    assert.equal(approval.status, 400);
    assert.equal(approval.body.error, 'DEPLOYMENT_REQUIRED');
    const prepare = await call(`/v1/offers/${offerId}/prepare`, {
      method: 'POST',
      token,
      json: { action: 'register' },
    });
    assert.equal(prepare.status, 400);
    assert.equal(prepare.body.error, 'HUMAN_APPROVAL_REQUIRED');
  });

  test('deployment prepare returns encoded deployment data', async () => {
    const token = await authenticate();
    const prep = await call('/v1/deployment/prepare', { method: 'POST', token, json: {} });
    assert.equal(prep.status, 200);
    assert.ok(String(prep.body.from).startsWith('0x'));
    assert.ok(String(prep.body.data).startsWith('0x'));
  });

  test('wallet and audit back the token session', async () => {
    const token = await authenticate();
    const wallet = await call('/v1/wallet', { token });
    assert.equal(wallet.status, 200);
    assert.equal(wallet.body.balance, '0');
    const audit = await call('/v1/audit', { token });
    assert.equal(audit.status, 200);
    assert.match(String(audit.body.verifiedHead), /^0x[a-f0-9]{64}$/);
    const receipts = await call('/v1/receipts', { token });
    assert.equal(receipts.status, 200);
    assert.equal((receipts.body as unknown as unknown[]).length, 0);
  });
});