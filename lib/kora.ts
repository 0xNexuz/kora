const KORA_URL = (process.env.NEXT_PUBLIC_KORA_API_URL || 'http://127.0.0.1:4001').replace(/\/$/, '');
const KORA_OWNER = '0x7034af41397893321c4458abb3b98f6c67065fab';
const BASE_SEPOLIA_CHAIN = 84532;

export interface Session {
  token: string;
  address: string;
}

export interface ConnectedWallet {
  address: string;
  chainId: number;
}

export interface KoraAccount {
  address: string;
  business: string;
  graphId: string;
  graphVersion: number;
  graphAsOf: number;
  createdAt: number;
  lastSeenAt: number;
  runs: number;
  offers: number;
  receipts: number;
}

interface EthProvider {
  request(opts: {method: string; params?: unknown[]}): Promise<unknown>;
  on?(event: 'accountsChanged' | 'chainChanged', listener: (...args: unknown[]) => void): void;
  removeListener?(event: 'accountsChanged' | 'chainChanged', listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

async function api(path: string, token: string | undefined, init: {method: string; body?: unknown}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(KORA_URL + '/v1/' + path, {
      method: init.method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: 'Bearer ' + token} : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!res.ok) {
      const code = typeof json.error === 'string' ? json.error : 'HTTP_' + res.status;
      throw new Error(code);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export async function probe() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(KORA_URL + '/health', {signal: ctrl.signal});
    if (!res.ok) return {online: false as const};
    const json = (await res.json()) as {chainId?: number};
    return {online: true as const, chainId: json.chainId};
  } catch {
    return {online: false as const};
  } finally {
    clearTimeout(timer);
  }
}

function hexMessage(message: string) {
  const bytes = new TextEncoder().encode(message);
  return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function connectWallet(): Promise<ConnectedWallet> {
  const ethereum = window.ethereum;
  if (!ethereum) throw new Error('NO_WALLET');
  const accounts = (await ethereum.request({method: 'eth_requestAccounts'})) as string[];
  const address = accounts[0];
  if (!address) throw new Error('NO_ACCOUNT');
  const chain = await ethereum.request({method: 'eth_chainId'});
  return {address, chainId: Number(chain)};
}

export async function restoreWallet(): Promise<ConnectedWallet | null> {
  const ethereum = window.ethereum;
  if (!ethereum) return null;
  const accounts = (await ethereum.request({method: 'eth_accounts'})) as string[];
  const address = accounts[0];
  if (!address) return null;
  const chain = await ethereum.request({method: 'eth_chainId'});
  return {address, chainId: Number(chain)};
}

export async function signIn(): Promise<Session> {
  const ethereum = window.ethereum;
  if (!ethereum) throw new Error('NO_WALLET');
  const online = await probe();
  if (!online.online) throw new Error('BACKEND_OFFLINE');
  const challenge = await api('auth/challenge', undefined, {method: 'POST', body: {}});
  const expectedOwner =
    typeof challenge.owner === 'string' && challenge.owner ? challenge.owner : KORA_OWNER;
  const expectedChain = Number(challenge.chainId ?? BASE_SEPOLIA_CHAIN);
  const accounts = (await ethereum.request({method: 'eth_requestAccounts'})) as string[];
  const address = accounts[0];
  if (!address || address.toLowerCase() !== expectedOwner.toLowerCase()) {
    throw new Error('WRONG_WALLET:' + expectedOwner);
  }
  const chain = await ethereum.request({method: 'eth_chainId'});
  if (Number(chain) !== expectedChain) {
    throw new Error('WRONG_CHAIN');
  }
  const signature = (await ethereum.request({
    method: 'personal_sign',
    params: [hexMessage(String(challenge.message)), address],
  })) as string;
  const verified = await api('auth/verify', undefined, {
    method: 'POST',
    body: {id: challenge.id, signature, chainId: expectedChain},
  });
  return {token: String(verified.token), address};
}

export async function fetchAccount(token: string): Promise<KoraAccount> {
  return (await api('account', token, {method: 'GET'})) as unknown as KoraAccount;
}

export const KORA_OWNER_SHORT = KORA_OWNER.slice(0, 6) + '…' + KORA_OWNER.slice(-4);

export function shortAddress(address: string) {
  return address.slice(0, 6) + '…' + address.slice(-4);
}

export function friendlyError(code: string, online: boolean | null) {
  const first = code.split(':')[0];
  const expected = code.includes(':') ? code.split(':').slice(1).join(':') : undefined;
  const ownerShort = shortAddress(expected ?? KORA_OWNER);
  if (first === 'BACKEND_OFFLINE' || (online === false && first.startsWith('Failed'))) {
    return 'Backend offline at localhost:4001 — demo runs in your browser.';
  }
  const map: Record<string, string> = {
    NO_WALLET: 'No browser wallet was found. You can still use every part of the public demo.',
    NO_ACCOUNT: 'No wallet account was selected. The public demo still works without one.',
    WRONG_WALLET:
      'Connected wallet is not the demo owner (' + ownerShort + '). Use that wallet to sign.',
    WRONG_CHAIN: 'Switch your wallet to Base Sepolia (84532) and retry.',
    WRONG_WALLET_OR_SIGNATURE: 'Signature rejected by the Kora API.',
    INVALID_CHALLENGE: 'Sign-in challenge expired. Try again.',
    DEPENDENCY_UNAVAILABLE: 'Kora API not reachable right now.',
  };
  return map[first] ?? code;
}
