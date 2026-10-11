export type Mode = 'DEMO' | 'REAL';

export type Kind =
  | 'opening-cash'
  | 'sale'
  | 'receivable'
  | 'payroll'
  | 'expense'
  | 'debt'
  | 'inventory'
  | 'repayment';

export interface RecordRow {
  id: string;
  businessId: string;
  sourceId: string;
  externalId: string;
  kind: Kind;
  amount: number;
  day: number;
  counterparty: string;
  mode: Mode;
  recordedAt: number;
  evidenceHash: string;
  status: 'expected' | 'observed';
}

export interface Performance {
  agreementId: string;
  receiptId: string;
  principalUSDC: string;
  repaidUSDC: string;
  amountNGN: number;
  onTime: boolean;
  blockNumber: string;
  transactionHash: string;
  chainId: number;
  mode: 'REAL — TESTNET';
}

export interface Graph {
  id: string;
  name: string;
  mode: Mode;
  asOf: number;
  version: number;
  records: RecordRow[];
  history: Performance[];
}

export interface Question {
  question: string;
  purchaseId: string;
  horizonDays: number;
}

export interface Scenario {
  name: string;
  salesBps: number;
  invoiceDelayDays: number;
  purchaseBps: number;
  purchaseDelayDays: number;
  facility: number;
  repay: number;
  repayDay: number;
}

export interface DailyForecast {
  day: number;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  evidenceRefs: string[];
}

export interface Forecast {
  name: string;
  daily: DailyForecast[];
  minimum: number;
  deficit: number;
  firstDeficitDay: number | null;
  ending: number;
}

export interface SkillContext {
  graph: Graph;
  question: Question;
  now: number;
}

export interface SkillResult<T = unknown> {
  skill: string;
  version: string;
  status: 'REAL — LOCAL';
  dataMode: Mode;
  evidenceRefs: string[];
  assumptions: string[];
  calculations: string[];
  output: T;
}

export interface Recommendation {
  recommendation: string;
  reason: string;
  inputsUsed: Question;
  evidenceRefs: string[];
  assumptions: string[];
  calculations: string[];
  scenarioResults: Forecast[];
  riskFlags: string[];
  confidence: {
    level: 'conditional';
    basis: string;
  };
  policyVersion: string;
  recommendedAction: 'REVIEW_FINANCING' | 'REDUCE_ORDER' | 'NO_FINANCING';
  requiresHumanApproval: true;
}

export interface Run {
  id: string;
  graphHash: string;
  graphVersion: number;
  createdAt: number;
  question: Question;
  skills: SkillResult[];
  recommendation: Recommendation;
  facilityNGN: number;
  ownCashNGN: number;
  runHash: string;
}

export interface Offer {
  id: string;
  runId: string;
  runHash: string;
  graphHash: string;
  policyVersion: string;
  businessCommitment: string;
  obligationCommitment: string;
  evidenceCommitment: string;
  borrower: string;
  lender: string;
  chainId: number;
  token: string;
  principal: string;
  fee: string;
  dueAt: number;
  expiresAt: number;
  facilityNGN: number;
  fx: {
    nairaPerUSDC: number;
    mode: 'DEMO';
    conversionExecuted: false;
  };
  status: 'PROPOSED' | 'APPROVED' | 'REGISTERED' | 'DRAWN' | 'REPAID';
  contract: string | null;
  repaid: string;
}

export interface OnchainTerms {
  id: `0x${string}`;
  business: `0x${string}`;
  obligation: `0x${string}`;
  evidence: `0x${string}`;
  borrower: `0x${string}`;
  principal: bigint;
  fee: bigint;
  dueAt: bigint;
  expiresAt: bigint;
}

export interface FacilityReceiptVerification {
  id: string;
  offerId: string;
  event: string;
  amount: string;
  total: string;
  complete: boolean;
  transactionHash: string;
  blockNumber: string;
  blockHash: string;
  chainId: number;
  contract: string;
  token: string;
  timestamp: number;
  explorer: string;
  status: 'REAL — TESTNET';
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}
