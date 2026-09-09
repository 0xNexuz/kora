# Threat model

## Objective

Protect funds, wallet authority, private business evidence, policy integrity, receipt truth, and repayment history from unauthorized or fabricated changes.

## Assets and actors

| Asset | Impact |
|---|---|
| Wallet authority and USDC | Unauthorized loss or agreement |
| Business Graph | False decision or privacy breach |
| Policy/run artifacts | Unjustified financing |
| Base receipts/history | False performance record |
| Local encryption key | Disclosure of prototype data |

Threat actors: malicious user, compromised wallet/frontend/API, malicious or hallucinating agent, replay attacker, and dishonest evidence source.

## Trust assumptions

- Demo fixture and operator are trusted to represent fictional input faithfully.
- The configured RPC and Base consensus are trusted for public network state.
- The lender/operator is trusted in the current self-funded demo.
- Local disk key storage is not production key management.

## Defenses

- Frontend: no private key input, exact wallet and chain checks, explicit demo labels.
- API: host/origin allowlist, JSON/body limits, rate limits, expiring one-use challenge, bearer sessions.
- Evidence: record hashes, freshness, supported sources/kinds, unique invoice/external IDs, audit hash chain.
- Policy: recomputation, graph/run binding, expiry, amount cap, duplicate financing prevention, human approval.
- Contract: lender/borrower roles, active business/obligation uniqueness, escrow, state machine, exact repayment bound, reentrancy guard.
- Receipts: confirmations, canonical block hash, sender/to/calldata/event/amount verification.
- Agent: allowlisted typed skills; financial arithmetic is outside prompts; no direct wallet authority.

## Abuse cases

| Attack | Defense | Test | Status |
|---|---|---|---|
| Duplicate invoice | Graph uniqueness | `domain.test.ts` | VERIFIED |
| Modified/stale evidence | Hash/freshness gates | `domain.test.ts` | VERIFIED |
| Duplicate financing | Atomic offer/obligation gates | `service.test.ts` | VERIFIED |
| Replay/wrong signer/chain | One-use challenge and signature checks | `server.test.ts`, `service.test.ts` | VERIFIED |
| Policy bypass/unauthorized action | Approval and state gates | `service.test.ts`, `chain.test.ts` | VERIFIED |
| Excessive repayment | Backend and contract bounds | `chain.test.ts`, `chain.evm.test.ts` | VERIFIED — LOCAL |
| Fabricated testnet receipt | RPC/receipt verifier | Unit coverage exists; public receipt absent | PARTIAL |

## Non-guarantees and residual risk

No production lending compliance, custody, oracle, FX/off-ramp, managed secrets, third-party data authenticity, audited contract, or model-accuracy guarantee exists. Compromised frontend/API and operator trust remain material risks. Testnet self-repayment does not prove creditworthiness.
