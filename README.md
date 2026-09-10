# Kora

> **From fragments to flow.**  
> The AI financial operating system for African businesses, built toward settlement on Base.

[Open the live demo](https://kora-weld-two.vercel.app) · [Explore the evidence harness](./docs/build-harness/00_README.md) · [Review the smart contract](./contracts/KoraFacility.sol)

Kora turns fragmented bank inflows, POS activity, invoices, supplier obligations, expenses, stablecoin payments and repayment history into traceable financial intelligence, safer operations and contextual access to working capital.

Kora is not a generic accounting dashboard, trading product or AI loan generator. Its core is a permissioned **Business Financial Graph** and a continuously updated **Financial Twin**.

## The proof loop

```text
Business Data
    ↓
Understand
    ↓
Simulate
    ↓
Decide
    ↓
Finance
    ↓
Base Settlement
    ↓
Repay
    ↓
Updated Business History
```

The initial scenario follows the fictional **Ada's Pharmacy**:

1. Kora observes cash, invoices, supplier payments and upcoming obligations.
2. Deterministic financial skills identify a temporary liquidity gap.
3. Baseline and adverse scenarios test late receivables and weaker sales.
4. Kora recommends using existing cash plus a smaller facility.
5. Policy checks decide whether the action is eligible and whether approval is required.
6. The contract interface prepares Base Sepolia settlement.
7. Repayment is verified and reconciled.
8. Verified performance updates the Business Graph.

## Try the public demo

Open [kora-weld-two.vercel.app](https://kora-weld-two.vercel.app).

- No account, backend or wallet is required.
- Open **Workspace** to inspect Ada's fictional business state.
- Ask Kora whether the inventory order is affordable.
- Review assumptions, calculations, scenarios, evidence references and policy status.
- Mark the demo invoice paid and observe the receivables/history update.
- Optionally connect any injected browser wallet. The public demo only reads its public address and chain ID—it does not request a signature, submit a transaction or move funds.

Demo changes are browser-session state and do not represent a real customer or traction.

## What is real?

| Capability | Status | Meaning |
|---|---|---|
| Landing page and animated Kora hero | **REAL** | Production frontend deployed on Vercel |
| Public financial workspace | **DEMO** | Fully interactive, browser-local experience |
| Ada's Pharmacy records and projections | **SIMULATED** | Fictional Nigerian SME data |
| Business Graph and Financial Twin model | **REAL — LOCAL** | Implemented with an encrypted local SQLite store |
| Twelve typed financial skills | **REAL — LOCAL** | Deterministic tools with structured evidence |
| Policy, approval and authorization controls | **REAL — LOCAL** | Implemented and adversarially tested |
| KoraFacility Solidity contract | **IMPLEMENTED** | Compiled and exercised on a private local EVM |
| Base Sepolia lifecycle | **PLANNED EVIDENCE** | Code exists; public RPC-derived receipts are not yet claimed |
| Live accounting/payment connectors | **PLANNED** | Not represented as available |

A verified Base Sepolia claim requires the real chain ID, contract address, transaction hashes, block numbers, explorer links and reconciled repayment receipt. Kora does not use placeholders as blockchain evidence.

## Architecture

```text
Private business records
        ↓
Kora Business Graph
        ↓
Financial skills + orchestration
        ↓
Scenario engine
        ↓
Evidence-backed recommendation
        ↓
Policy and human approval
        ↓
KoraFacility on Base
        ↓
Verified settlement receipt
        ↓
Graph history update
```

Sensitive bank, POS, invoice, supplier and underwriting data stays offchain. Base is reserved for programmable agreement state, USDC settlement, drawdowns, repayments and appropriate cryptographic commitments.

The control boundary is explicit:

```text
AI interprets
→ deterministic engines calculate
→ policies authorize
→ humans approve sensitive actions
→ the system executes
→ evidence is stored
```

## Financial skills

Kora currently implements isolated, typed capabilities for:

- cash-flow analysis
- cash-flow forecasting
- scenario analysis
- receivables analysis
- invoice analysis
- supplier analysis
- reconciliation
- working-capital analysis
- treasury monitoring
- obligation analysis
- repayment analysis
- financial reporting

The agent orchestrates these skills. Financial values are calculated by deterministic code, not invented inside an LLM prompt.

## Verification

Kora uses Node.js 24.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:vercel
```

Verified on **2026-09-10**:

- lint passed
- typecheck passed
- **82 tests passed**
- Vercel production build passed

Every Vercel deployment runs the same release gate through `vercel-build` and fails closed if a check fails.

Coverage includes duplicate financing, duplicate invoices, invoice modification, stale or unsupported evidence, replay attacks, expired offers, unauthorized execution, wrong wallet, wrong chain, signature modification, excessive or duplicate repayment, policy bypass, agent authorization boundaries and tampered evidence.

## Local development

```sh
npm ci
npm run dev
```

Frontend: `http://localhost:3000`

To run the experimental local API and operator console:

```sh
node scripts/compile-contracts.mjs
node --experimental-transform-types backend/server.ts
```

Operator console: `http://localhost:4001/approval`

The operator flow requires a browser wallet on Base Sepolia (chain ID `84532`). Never paste a seed phrase or private key into Kora, and never use mainnet funds for the demo.

## Repository map

| Path | Purpose |
|---|---|
| `app/`, `components/`, `public/` | Product frontend, workspace and visual system |
| `backend/` | Graph, skills, simulations, evidence, policy, approval and reconciliation |
| `contracts/` | KoraFacility and local TestUSDC test double |
| `demo/` | Fictional Ada's Pharmacy scenario |
| `docs/build-harness/` | Threat model, invariants, evidence truth table and submission audit |
| `evidence/tests/` | Generated local verification artifacts |
| `design/mascot-concepts/` | Archived Kora mascot concepts |
| `scripts/` | Contract compilation and supporting utilities |

## Deployment

Import [github.com/0xNexuz/kora](https://github.com/0xNexuz/kora) into Vercel and keep the detected Next.js settings.

The public browser demo needs no environment variables. Only set `NEXT_PUBLIC_KORA_API_URL` when a separately hosted and allowlisted Kora API exists. Never configure a public deployment to call `localhost`.

## Security and evidence

- Private business data and detailed underwriting inputs remain offchain.
- Sensitive financial actions require policy authorization and human approval.
- Runtime data and encryption keys live under `.local/`, which is Git-ignored.
- No seed phrases, private keys or customer records belong in this repository.
- Demo values are clearly labeled.
- Transaction hashes must come from verified receipts.
- The local same-wallet facility flow demonstrates mechanics, not third-party financing.

See the [threat model](./docs/build-harness/04_threat-model.md), [real-versus-simulated register](./docs/build-harness/07_real-vs-simulated.md), [test plan](./docs/build-harness/08_test-plan.md) and [submission map](./docs/build-harness/12_submission-map.md).

## Current readiness

- **Public demo and repository:** ready to submit
- **Production financial service:** not claimed
- **Fully verified Base loop:** pending a signed Base Sepolia deployment, draw, repayment and RPC-derived evidence

Kora's thesis is simple: understand how a business is performing, help it make and execute better financial decisions, and turn verified performance into access to capital.
