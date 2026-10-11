# Kora Developer Kit (`@kora/sdk`)

Deterministic SME underwriting intelligence, cryptographic commitments, and onchain financing facility protocol for autonomous AI agents and web3 applications.

---

## Overview

Large language models (LLMs) hallucinate arithmetic, cannot guarantee reproducible financial logic, and cannot safely be trusted with balance sheet calculations or loan approvals.

**Kora** decouples the cognitive reasoning of AI agents from deterministic execution:
1. **Deterministic Skills Engine**: 12 pure, typed financial arithmetic skills (cash flow ladders, adverse stress testing, liquidity deficit evaluation, reserve buffers).
2. **Blinded Cryptographic Commitments**: Salting and SHA-256 commitment hashing binding onchain smart contracts to offchain verified evidence without exposing confidential balance sheet details.
3. **Onchain Base Sepolia Protocol**: Programmatic client for `KoraFacility.sol` on Base Sepolia (`0xad177afed1593291d872cfe2b3ac984f9cc3febb`) to register agreements, draw principal in USDC, and verify receipts.
4. **Agent Tool Registry**: Pre-configured JSON Schemas and execution adapters compatible with OpenAI Function Calling, Anthropic Claude Tool Use, LangChain, and Eliza.

---

## Installation

```bash
npm install @kora/sdk viem
```

---

## Quickstart

### 1. Ingest Financial Records & Run Underwriting

```typescript
import { KoraSDK, createDemoFixture, type Question } from '@kora/sdk';

const sdk = new KoraSDK();

// 1. Ingest SME ledger records (or load demo fixture)
const graph = createDemoFixture();

// 2. Formulate underwriting question
const question: Question = {
  question: 'Can the business afford the inventory restock?',
  purchaseId: 'restock-1',
  horizonDays: 35,
};

// 3. Execute deterministic underwriting
const run = sdk.analyze(graph, question);

console.log('Recommendation:', run.recommendation.recommendedAction); // REVIEW_FINANCING
console.log('Eligible Facility:', run.facilityNGN / 100, 'NGN');
console.log('Run Hash:', run.runHash);
```

### 2. Issue Policy Offer & Blinded Commitments

```typescript
import { createSalt } from '@kora/sdk';

const owner = '0x7034af41397893321c4458abb3b98f6c67065fab';
const salt = createSalt();

// Generates offer with exact USDC math and cryptographic commitments
const offer = sdk.issueOffer(graph, run, owner, salt);

console.log('Principal USDC units:', offer.principal); // e.g. 362500000 (362.5 USDC)
console.log('Evidence Commitment:', offer.evidenceCommitment);
console.log('Obligation Commitment:', offer.obligationCommitment);
```

### 3. Encode Base Sepolia Transactions

```typescript
import { encodeTransaction } from '@kora/sdk';

offer.contract = '0xad177afed1593291d872cfe2b3ac984f9cc3febb';
offer.status = 'APPROVED';

// Encode register calldata
const registerTx = encodeTransaction(offer, 'register');
console.log('To:', registerTx.to);
console.log('Calldata:', registerTx.data);
```

---

## AI Agent Integration

Expose Kora's deterministic arithmetic to LLMs via standard tool-calling formats:

```typescript
// Format tools for OpenAI API
const openaiTools = sdk.getAgentTools('openai');

// Format tools for Anthropic Claude API
const anthropicTools = sdk.getAgentTools('anthropic');

// Dispatch tool execution inside an agent loop
const result = sdk.executeTool('kora_evaluate_working_capital', {}, {
  graph,
  question,
  now: Date.now(),
});
```

### Available Agent Tools

| Tool | Purpose |
|---|---|
| `kora_analyze_cash_flow` | Evaluates opening cash, sales, receivables, and obligations. |
| `kora_forecast_cash` | Computes daily netted cash-flow ladder under custom parameters. |
| `kora_stress_test` | Runs 5-scenario adverse matrix (invoice delay, sales -20%, supplier delay). |
| `kora_evaluate_working_capital` | Calculates liquidity deficit, safety reserve, and maximum facility. |
| `kora_audit_invoices` | Verifies hash integrity and detects double-pledging. |
| `kora_full_underwriting_run` | Runs complete 12-skill pipeline producing a signed `Run` object. |

---

## 12 Typed Financial Skills

1. `cash-flow-analysis`: Current position and aggregate category totals.
2. `cash-flow-forecast`: Baseline daily netted projection over 30–35 day horizon.
3. `scenario-analysis`: Adverse multi-scenario sensitivity stress testing.
4. `receivablesAnalysis`: Analysis of expected customer receivables.
5. `invoiceAnalysis`: Hash verification and duplicate prevention on purchase orders.
6. `supplierAnalysis`: Inventory terms, supplier consent, and stockout risks.
7. `reconciliation`: Matching expected records against verified onchain receipts.
8. `working-capital`: Deficit calculation + safety reserve + facility eligibility.
9. `treasuryMonitor`: Currency balances and conversion readiness.
10. `obligationAnalysis`: Payables, payroll, rent, and debt service analysis.
11. `repaymentAnalysis`: On-time track record and historical performance.
12. `financialReport`: Comprehensive cash-basis management summary.

---

## Deployed Infrastructure

- **Network**: Base Sepolia (Chain ID `84532`)
- **Facility Contract**: [`0xad177afed1593291d872cfe2b3ac984f9cc3febb`](https://sepolia.basescan.org/address/0xad177afed1593291d872cfe2b3ac984f9cc3febb)
- **Token**: Base Sepolia USDC (`0x036cbd53842c5426634e7929541ec2318f3dcf7e`)
