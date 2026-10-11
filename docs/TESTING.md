# How to Test Kora

This guide provides concrete, step-by-step instructions for hackathon judges, developers, and reviewers to test Kora beyond the public web demo.

---

## Testing Methods Summary

| Method | Audience | What It Tests | Command |
|---|---|---|---|
| **1. Full End-to-End Testnet Demo** | **Judges & Evaluators** | **Full lifecycle: Mono Open Banking + 12 skills + Base Sepolia onchain escrow + Kotani Pay NGN payout** | `npm run testnet-demo` |
| **2. Interactive CLI Test-Drive** | Evaluators / Reviewers | 6-stage end-to-end deterministic underwriting walkthrough with live RPC queries | `npm run test-drive` |
| **3. Browser Testnet Console** | Judges with MetaMask | Live onchain Base Sepolia wallet interactions, escrow, draw, and repayment | `npm run console` |
| **4. Command-Line Custom Scenarios** | Financial Analysts | Custom questions, arbitrary sales drops, and delayed invoice simulations | `npm run cli -- <cmd>` |
| **5. Autonomous Agent SDK** | AI / Web3 Developers | Programmatic integration of Kora's 12 skills into autonomous LLM agent loops | `node --experimental-transform-types examples/agent-underwriting.ts` |
| **6. Full Verification Suite** | Engineers & Auditors | 102 automated unit, integration, and adversarial tests | `npm test` |

---

## Method 1: Full End-to-End Testnet Demo (One Command)

Run the full end-to-end African SME financing lifecycle connecting real Base Sepolia RPC and sandbox banking/fiat payout infrastructure:

```bash
npm run testnet-demo
```

### What This Demonstrates & Verifies:
1. **Open Banking Ingestion**: Authenticates with Mono Sandbox and ingests 41 statement rows from Ada's GTBank account (`0123456789`), generating canonical SHA-256 evidence hashes.
2. **Deterministic Underwriting**: Runs 12 financial skills to stress-test liquidity under -20% sales drop and 7-day payment delay.
3. **Commitment Binding & Approval**: Salted commitments (`business`, `obligation`, `evidence`) and EIP-191 human approval message.
4. **Live Base Sepolia Querying**: Connects to Base Sepolia RPC (84532), checks live wallet balances (0.21 ETH, 20 USDC), and verifies the deployed `KoraFacility` contract at `0xad177afed1593291d872cfe2b3ac984f9cc3febb`.
5. **Fiat Off-Ramp Disbursement**: Kotani Pay Sandbox executes real-time FX quote and dispatches an instant NIP transfer to the merchant's GTBank account with verifiable session ID and HMAC-SHA256 webhook callback.
6. **Repayment & Graph Reconciliation**: Verifies onchain repayment receipt on BaseScan and updates the Business Financial Twin with verified credit history.

---

## Method 2: Interactive Browser Testnet Console (MetaMask + Base Sepolia)

The repository includes a dedicated engineering approval and escrow console that connects directly to MetaMask and the Base Sepolia testnet.

### Steps:

1. **Start the Console Server**:
   ```bash
   npm run console
   ```
   *(Server starts at `http://localhost:4001`)*

2. **Open the Console**:
   Navigate to [http://localhost:4001/approval](http://localhost:4001/approval) in your browser.

3. **Connect Your Wallet**:
   - Ensure MetaMask is switched to **Base Sepolia (Chain ID 84532)**.
   - Click **"1. Connect wallet and sign in"** and sign the EIP-191 sign-in challenge.

4. **Execute the Underwriting & Onchain Escrow Flow**:
   - Click **"2. Analyze Ada’s restock"**: Deterministically runs the 12 financial skills on the ledger.
   - Click **"4. Create proposed offer"**: Generates blinded cryptographic commitments (`business`, `obligation`, `evidence`).
   - Click **"5. Approve exact terms"**: Signs a human approval message containing exact terms and digests.
   - Click **"6. Approve exact USDC allowance"**: Submits an ERC-20 `approve` transaction to the Base Sepolia USDC contract (`0x036cbd53842c5426634e7929541ec2318f3dcf7e`).
   - Click **"7. Fund agreement escrow"**: Submits a `register` transaction to the `KoraFacility` contract (`0xad177afed1593291d872cfe2b3ac984f9cc3febb`).
   - Click **"8. Draw facility"**: Calls `draw()` to release the USDC principal.
   - Click **"9. Repay"**: Calls `repay()` with testnet USDC + 1% flat protocol fee.
   - Click **"Refresh evidence"**: Observes reconciled onchain receipts linked into the Business Graph.

---

## Method 2: One-Command CLI Test-Drive

Run a guided, interactive terminal walkthrough with zero wallet or setup required:

```bash
npm run test-drive
```

### What You Will See:
- **Step 1/6**: Ingestion of Ada's Pharmacy records with SHA-256 row hash integrity checks.
- **Step 2/6**: Deterministic integer cash-flow analysis (Opening cash, 35-day projected sales, receivables, obligations).
- **Step 3/6**: Adverse economic sensitivity matrix (sales -20%, invoice payment delay +7d, combined adverse).
- **Step 4/6**: Working capital sizing (liquidity deficit calculation, ₦100,000 safety reserve buffer, recommended facility limit).
- **Step 5/6**: Salted blinded cryptographic commitments generated for onchain privacy.
- **Step 6/6**: Live Base Sepolia RPC query verifying deployer balances and preparing encoded contract transactions.

---

## Method 3: Command-Line Custom Scenarios

Use the Kora CLI to test custom economic conditions and arbitrary questions:

### 1. Test Custom Underwriting Questions:
```bash
npm run cli -- analyze "Can I afford to order ₦1.4M medicine inventory?"
```

### 2. Simulate Custom Economic Scenarios:
Test what happens if customer payments are delayed by 14 days and sales fall by 30%:
```bash
npm run cli -- forecast --sales-drop 30 --delay 14
```

### 3. Inspect Live Base Sepolia Wallets:
Query live ETH gas and USDC balances on Base Sepolia:
```bash
npm run cli -- inspect-wallet 0xF6D3809d67238EC39a6350b2D7445B53Ab896BBb
```

---

## Method 4: Developer Kit & Autonomous Agent Testing

Test how an autonomous AI agent uses Kora's developer kit to perform credit underwriting and encode transactions without math hallucinations:

```bash
node --experimental-transform-types examples/agent-underwriting.ts
```

### What This Verifies:
- Import of `@kora/sdk` (`KoraSDK`, `createDemoFixture`, `createSalt`, `encodeTransaction`).
- Agent tool execution (`kora_analyze_cash_flow`, `kora_stress_test`, `kora_full_underwriting_run`).
- JSON Schema compatibility for OpenAI Function Calling and Anthropic Claude Tool Use.
- Deterministic output generation with zero LLM arithmetic drift.

---

## Method 5: Automated Test Suite & Formal Verification

Run the comprehensive test suite verifying the entire codebase:

```bash
# Run all 97 unit, integration & adversarial tests
npm test

# Run strict linter (oxlint)
npm run lint

# Run full TypeScript typecheck
npm run typecheck
```

### Verifications Completed:
- `backend/adversarial.test.ts`: 28 adversarial attack vectors including reentrancy, unauthorized caller bypass, reorg detection, duplicate obligation, excessive repayment, and idempotent reconciliation.
- `backend/chain.evm.test.ts`: Spins up an in-memory EVM chain, compiles `KoraFacility.sol`, and runs the full register/draw/repay lifecycle with receipts.
- `backend/store.test.ts`: Verifies AES-256-GCM encryption at rest and SQLite tamper-evident hash chain audits.
- `backend/skills.test.ts`: Tests all 12 financial skills against strict arithmetic invariants.
- `sdk/sdk.test.ts`: Verifies SDK isolation, commitment generators, and agent tool schemas.
