import {createServer} from 'node:http';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Store} from './store.ts';
import {Service} from './service.ts';
import {KoraError,ensure,OWNER,CHAIN} from './domain.ts';
import {SKILLS} from './skills.ts';
import {inspectWallet} from './chain.ts';
import type {Hex} from 'viem';

export interface HandlerOptions {
  allowedHosts?: string[];
  allowedOrigins?: string[];
  rateLimit?: number;
  wallet?: (address: string) => Promise<Record<string, unknown>>;
}

// Test seams: allowlist, origin policy, rate limit and wallet query are
// injectable so the HTTP layer can be exercised without a network or port.
export function createHandler(store: Store, service: Service, opts: HandlerOptions = {}) {
  const allowedHosts = opts.allowedHosts ?? ['localhost:4001', '127.0.0.1:4001'];
  const allowed = new Set(opts.allowedOrigins ?? ['http://localhost:3000', 'http://localhost:4001', 'http://127.0.0.1:4001', 'http://localhost:5173', 'http://127.0.0.1:5173']);
  const rateLimit = opts.rateLimit ?? 120;
  const wallet = opts.wallet ?? (async (address: string) => inspectWallet(address));
  const rate = new Map<string, { at: number; count: number }>();
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      ensure(allowedHosts.includes('*') || allowedHosts.includes(req.headers.host ?? ''), 'INVALID_HOST');
      ensure(!req.headers.origin || allowed.has(req.headers.origin), 'INVALID_ORIGIN');
      if (req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        res.writeHead(204);
        res.end();
        return;
      }
      const ip = req.socket.remoteAddress ?? 'local';
      const entry = rate.get(ip);
      if (!entry || Date.now() - entry.at > 60000) rate.set(ip, { at: Date.now(), count: 1 });
      else ensure(++entry.count <= rateLimit, 'RATE_LIMIT');
      const path = new URL(req.url ?? '/', 'http://localhost:4001').pathname;
      if (req.method === 'GET' && (path === '/approval' || path === '/approval.js')) {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html');
        res.end(readFileSync(new URL(path.endsWith('.js') ? './approval.js' : './approval.html', import.meta.url)));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      let body: Record<string, unknown> = {};
      if (req.method === 'POST') {
        ensure(req.headers['content-type']?.startsWith('application/json'), 'JSON_REQUIRED');
        let text = '';
        for await (const chunk of req) {
          text += chunk;
          ensure(Buffer.byteLength(text) <= 16384, 'BODY_TOO_LARGE');
        }
        try { body = JSON.parse(text || '{}'); } catch { throw new KoraError('INVALID_JSON'); }
        ensure(body && typeof body === 'object' && !Array.isArray(body), 'INVALID_JSON');
      }
      const send = (v: unknown) => res.end(JSON.stringify(v, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      if (path === '/health' && req.method === 'GET') return send({ status: 'ok', mode: 'REAL — LOCAL', data: 'DEMO', chainId: CHAIN });
      if (path === '/v1/auth/challenge' && req.method === 'POST') return send(service.challenge());
      if (path === '/v1/auth/verify' && req.method === 'POST') return send(await service.authenticate(String(body.id), String(body.signature) as Hex, Number(body.chainId)));
      const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
      service.session(token);
      if (path === '/v1/config' && req.method === 'GET') return send({ owner: OWNER, chainId: CHAIN, deployment: store.get('deployment', 'active'), mode: 'DEMO_BUSINESS_REAL_TESTNET_SETTLEMENT' });
      if (path === '/v1/graph' && req.method === 'GET') return send(service.graph());
      if (path === '/v1/account' && req.method === 'GET') return send(service.account());
      if (path === '/v1/skills' && req.method === 'GET') return send(Object.keys(SKILLS).map(name => ({ name, version: '1.0.0', readOnly: true, input: 'SkillContext', error: 'KoraError.code' })));
      if (path === '/v1/runs' && req.method === 'POST') return send(service.run(body));
      if (path === '/v1/runs' && req.method === 'GET') return send(store.list('run'));
      if (path === '/v1/offers' && req.method === 'POST') return send(service.offer(String(body.runId)));
      if (path === '/v1/offers' && req.method === 'GET') return send(store.list('offer'));
      if (path === '/v1/deployment/prepare' && req.method === 'POST') return send(service.deployment());
      if (path === '/v1/deployment/verify' && req.method === 'POST') return send(await service.registerDeployment(String(body.transactionHash) as Hex));
      if (path === '/v1/wallet' && req.method === 'GET') return send(await wallet(OWNER));
      if (path === '/v1/receipts' && req.method === 'GET') return send(store.list('receipt'));
      if (path === '/v1/audit' && req.method === 'GET') return send({ verifiedHead: store.verifyAudit() });
      const match = path.match(/^\/v1\/offers\/(0x[a-f0-9]{64})\/(approval|approve|prepare|reconcile)$/);
      if (match && req.method === 'POST') {
        const [, id, action] = match;
        if (action === 'approval') return send(service.approval(id));
        if (action === 'approve') return send(await service.approve(id, String(body.signature) as Hex, Number(body.chainId)));
        if (action === 'reconcile') return send(await service.reconcile(id, String(body.transactionHash) as Hex));
        ensure(['allowance', 'register', 'draw', 'repay'].includes(String(body.action)), 'UNSUPPORTED_ACTION');
        return send(service.prepare(id, body.action as 'allowance' | 'register' | 'draw' | 'repay', body.amount as string | undefined));
      }
      res.statusCode = 404;
      send({ error: 'NOT_FOUND' });
    } catch (e) {
      res.statusCode = e instanceof KoraError ? (e.code === 'UNAUTHORIZED' ? 401 : 400) : 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e instanceof KoraError ? e.code : 'DEPENDENCY_UNAVAILABLE', retryable: !(e instanceof KoraError) }));
    }
  };
}

export function createDefaultStore() {
  return new Store(fileURLToPath(new URL('../.local', import.meta.url)));
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const store = createDefaultStore();
  const owner = process.env.KORA_OWNER?.trim() || OWNER;
  const service = new Service(store, owner);
  const server = createServer(createHandler(store, service));
  server.listen(4001, '127.0.0.1', () => console.log('Kora private local API: http://localhost:4001/approval'));
}