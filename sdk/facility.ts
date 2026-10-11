import {
  createPublicClient,
  http,
  encodeFunctionData,
  encodeDeployData,
  decodeEventLog,
  decodeFunctionData,
  erc20Abi,
} from 'viem';
import type { Address, Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  ensure,
  DEFAULT_CHAIN,
  DEFAULT_USDC,
  DEFAULT_FACILITY,
} from './crypto.ts';
import type {
  Offer,
  OnchainTerms,
  FacilityReceiptVerification,
} from './types.ts';

export const KORA_FACILITY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'authority', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'Cancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'address', name: 'borrower', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Drawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: true, internalType: 'bytes32', name: 'evidence', type: 'bytes32' },
      { indexed: false, internalType: 'address', name: 'borrower', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'principal', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'dueAt', type: 'uint256' },
    ],
    name: 'Registered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'address', name: 'borrower', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'total', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'complete', type: 'bool' },
    ],
    name: 'Repaid',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'activeBusiness',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'cancelExpired',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'chain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'draw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'get',
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: 'bytes32', name: 'id', type: 'bytes32' },
              { internalType: 'bytes32', name: 'business', type: 'bytes32' },
              { internalType: 'bytes32', name: 'obligation', type: 'bytes32' },
              { internalType: 'bytes32', name: 'evidence', type: 'bytes32' },
              { internalType: 'address', name: 'borrower', type: 'address' },
              { internalType: 'uint256', name: 'principal', type: 'uint256' },
              { internalType: 'uint256', name: 'fee', type: 'uint256' },
              { internalType: 'uint256', name: 'dueAt', type: 'uint256' },
              { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
            ],
            internalType: 'struct KoraFacility.Terms',
            name: 'terms',
            type: 'tuple',
          },
          { internalType: 'uint256', name: 'repaid', type: 'uint256' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
        ],
        internalType: 'struct KoraFacility.Agreement',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lender',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'bytes32', name: 'business', type: 'bytes32' },
          { internalType: 'bytes32', name: 'obligation', type: 'bytes32' },
          { internalType: 'bytes32', name: 'evidence', type: 'bytes32' },
          { internalType: 'address', name: 'borrower', type: 'address' },
          { internalType: 'uint256', name: 'principal', type: 'uint256' },
          { internalType: 'uint256', name: 'fee', type: 'uint256' },
          { internalType: 'uint256', name: 'dueAt', type: 'uint256' },
          { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
        ],
        internalType: 'struct KoraFacility.Terms',
        name: 't',
        type: 'tuple',
      },
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'repay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'usdc',
    outputs: [{ internalType: 'contract Token', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'usedObligation',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function terms(o: Offer): OnchainTerms {
  return {
    id: o.id as `0x${string}`,
    business: o.businessCommitment as `0x${string}`,
    obligation: o.obligationCommitment as `0x${string}`,
    evidence: o.evidenceCommitment as `0x${string}`,
    borrower: o.borrower as Address,
    principal: BigInt(o.principal),
    fee: BigInt(o.fee),
    dueAt: BigInt(o.dueAt),
    expiresAt: BigInt(o.expiresAt),
  };
}

export function encodeDeployment(owner: string, bytecode: Hex, usdcAddress = DEFAULT_USDC) {
  return {
    from: owner,
    chainId: DEFAULT_CHAIN,
    data: encodeDeployData({
      abi: KORA_FACILITY_ABI,
      bytecode,
      args: [usdcAddress as Address, owner as Address],
    }),
    value: '0x0' as const,
    purpose: 'Deploy testnet Kora facility on Base Sepolia',
  };
}

export function encodeTransaction(
  o: Offer,
  action: 'allowance' | 'register' | 'draw' | 'repay',
  amount?: string
) {
  ensure(o.contract, 'CONTRACT_NOT_DEPLOYED');
  let to = o.contract as Address;
  let data: Hex;
  const remaining = BigInt(o.principal) + BigInt(o.fee) - BigInt(o.repaid);

  if (action === 'allowance') {
    to = (o.token || DEFAULT_USDC) as Address;
    data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [o.contract as Address, o.status === 'DRAWN' ? remaining : BigInt(o.principal)],
    });
  } else if (action === 'register') {
    ensure(o.status === 'APPROVED', 'HUMAN_APPROVAL_REQUIRED');
    data = encodeFunctionData({
      abi: KORA_FACILITY_ABI,
      functionName: 'register',
      args: [terms(o)],
    });
  } else if (action === 'draw') {
    ensure(o.status === 'REGISTERED', 'INVALID_STATE');
    data = encodeFunctionData({
      abi: KORA_FACILITY_ABI,
      functionName: 'draw',
      args: [o.id as Hex],
    });
  } else {
    ensure(o.status === 'DRAWN', 'INVALID_STATE');
    ensure(typeof amount === 'string' && /^[1-9][0-9]*$/.test(amount), 'INVALID_AMOUNT');
    ensure(BigInt(amount) <= remaining, 'EXCESSIVE_REPAYMENT');
    data = encodeFunctionData({
      abi: KORA_FACILITY_ABI,
      functionName: 'repay',
      args: [o.id as Hex, BigInt(amount)],
    });
  }

  return {
    from: o.borrower,
    to,
    data,
    value: '0x0' as const,
    chainId: DEFAULT_CHAIN,
    action,
    offerId: o.id,
  };
}

function createKoraPublicClient(rpcUrl?: string) {
  return createPublicClient({
    chain: baseSepolia,
    cacheTime: 0,
    transport: http(
      rpcUrl ?? process.env.KORA_RPC_URL ?? 'https://base-sepolia-rpc.publicnode.com',
      {
        timeout: 15000,
        retryCount: 2,
      }
    ),
  });
}

export type KoraPublicClient = ReturnType<typeof createKoraPublicClient>;

export class KoraFacilityClient {
  public client: KoraPublicClient;
  public chainId: number;
  public defaultFacility: Address;
  public defaultUsdc: Address;

  constructor(opts?: {
    rpcUrl?: string;
    chainId?: number;
    facilityAddress?: string;
    usdcAddress?: string;
  }) {
    this.chainId = opts?.chainId ?? DEFAULT_CHAIN;
    this.defaultFacility = (opts?.facilityAddress ?? DEFAULT_FACILITY) as Address;
    this.defaultUsdc = (opts?.usdcAddress ?? DEFAULT_USDC) as Address;
    this.client = createKoraPublicClient(opts?.rpcUrl);
  }

  async verifyNetwork(): Promise<void> {
    const remoteChain = await this.client.getChainId();
    ensure(remoteChain === this.chainId, 'WRONG_CHAIN');
  }

  async inspectWallet(address: string, usdcAddress?: string) {
    await this.verifyNetwork();
    const token = (usdcAddress ?? this.defaultUsdc) as Address;
    const [gas, usdc] = await Promise.all([
      this.client.getBalance({ address: address as Address }),
      this.client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as Address],
      }),
    ]);
    return {
      chainId: this.chainId,
      wallet: address,
      gasWei: gas.toString(),
      usdcAtomic: usdc.toString(),
      token,
    };
  }

  async verifyDeployment(txHash: Hex, owner: string, bytecode: Hex) {
    const receipt = await this.client.getTransactionReceipt({ hash: txHash });
    ensure(receipt.status === 'success', 'TRANSACTION_FAILED');
    const tx = await this.client.getTransaction({ hash: txHash });
    const expectedData = encodeDeployment(owner, bytecode, this.defaultUsdc).data;

    ensure(
      tx.from.toLowerCase() === owner.toLowerCase() &&
        tx.to === null &&
        tx.input === expectedData,
      'INVALID_DEPLOYMENT'
    );
    ensure(receipt.contractAddress, 'MISSING_CONTRACT');
    const address = receipt.contractAddress;

    const lender = (await this.client.readContract({
      address,
      abi: KORA_FACILITY_ABI,
      functionName: 'lender',
      args: [],
    })) as string;

    const usdc = (await this.client.readContract({
      address,
      abi: KORA_FACILITY_ABI,
      functionName: 'usdc',
      args: [],
    })) as string;

    ensure(lender.toLowerCase() === owner.toLowerCase(), 'WRONG_LENDER');
    ensure(usdc.toLowerCase() === this.defaultUsdc.toLowerCase(), 'WRONG_TOKEN');

    return {
      chainId: this.chainId,
      address,
      transactionHash: txHash,
      blockNumber: receipt.blockNumber.toString(),
      blockHash: receipt.blockHash,
      explorer: 'https://sepolia.basescan.org/tx/' + txHash,
      status: 'REAL — TESTNET' as const,
    };
  }

  async verifyReceipt(o: Offer, txHash: Hex): Promise<FacilityReceiptVerification> {
    ensure(o.contract, 'MISSING_CONTRACT');
    const receipt = await this.client.getTransactionReceipt({ hash: txHash });
    ensure(receipt.status === 'success', 'TRANSACTION_FAILED');

    const latest = await this.client.getBlockNumber();
    ensure(latest >= receipt.blockNumber + 1n, 'INSUFFICIENT_CONFIRMATIONS');

    const block = await this.client.getBlock({ blockNumber: receipt.blockNumber });
    ensure(block.hash === receipt.blockHash, 'REORG_DETECTED');

    const tx = await this.client.getTransaction({ hash: txHash });
    ensure(
      tx.to?.toLowerCase() === o.contract.toLowerCase() &&
        tx.from.toLowerCase() === o.borrower.toLowerCase(),
      'WRONG_TRANSACTION'
    );

    const logs = receipt.logs
      .filter((l) => l.address.toLowerCase() === o.contract!.toLowerCase())
      .map((l) =>
        decodeEventLog({
          abi: KORA_FACILITY_ABI,
          data: l.data,
          topics: l.topics,
        })
      ) as unknown as { eventName: string; args: Record<string, unknown> }[];

    const log = logs.find(
      (l) => ['Registered', 'Drawn', 'Repaid'].includes(l.eventName) && l.args.id === o.id
    );
    ensure(log, 'UNSUPPORTED_RECEIPT');

    const decoded = decodeFunctionData({ abi: KORA_FACILITY_ABI, data: tx.input });

    if (log.eventName === 'Registered') {
      ensure(o.status === 'APPROVED', 'INVALID_STATE');
      ensure(tx.input === encodeTransaction(o, 'register').data, 'TERMS_MODIFIED');
      ensure(
        log.args.evidence === o.evidenceCommitment &&
          log.args.principal === BigInt(o.principal) &&
          log.args.fee === BigInt(o.fee),
        'TERMS_MODIFIED'
      );
    }

    if (log.eventName === 'Drawn') {
      ensure(o.status === 'REGISTERED', 'INVALID_STATE');
      ensure(
        tx.input === encodeTransaction(o, 'draw').data &&
          log.args.amount === BigInt(o.principal),
        'TERMS_MODIFIED'
      );
    }

    if (log.eventName === 'Repaid') {
      ensure(o.status === 'DRAWN' && decoded.functionName === 'repay', 'INVALID_STATE');
      const amount = log.args.amount as bigint;
      const total = log.args.total as bigint;
      ensure(
        amount > 0n &&
          total === BigInt(o.repaid) + amount &&
          total <= BigInt(o.principal) + BigInt(o.fee),
        'REPAYMENT_MISMATCH'
      );
    }

    const amount =
      typeof log.args.amount === 'bigint'
        ? log.args.amount
        : typeof log.args.principal === 'bigint'
        ? log.args.principal
        : 0n;
    const total = typeof log.args.total === 'bigint' ? log.args.total : 0n;

    return {
      id: this.chainId + ':' + txHash + ':' + log.eventName,
      offerId: o.id,
      event: log.eventName,
      amount: String(amount),
      total: String(total),
      complete: log.args.complete === true,
      transactionHash: txHash,
      blockNumber: receipt.blockNumber.toString(),
      blockHash: receipt.blockHash,
      chainId: this.chainId,
      contract: o.contract,
      token: o.token || this.defaultUsdc,
      timestamp: Number(block.timestamp),
      explorer: 'https://sepolia.basescan.org/tx/' + txHash,
      status: 'REAL — TESTNET' as const,
    };
  }
}
