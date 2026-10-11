# SDK Extraction & Developer Kit (`@kora/sdk`)

## Status: Extracted & Verified

The Kora Developer Kit has been decoupled into `sdk/` as a modular, framework-agnostic TypeScript toolkit for autonomous AI agents, credit underwriters, and Web3 developers.

## Extracted Primitives

| Primitive | Implementation | Value | Test Coverage |
|---|---|---|---|
| **Typed Financial Skills** | `sdk/skills.ts` | 12 deterministic cash-flow/forecast/scenario analysis skills with zero LLM arithmetic hallucinations | `sdk/sdk.test.ts` (100% passing) |
| **Inspectable Evidence & Output** | `sdk/types.ts`, `sdk/crypto.ts` | Canonical JSON hashing, row hashing, blinded commitments (`business`, `obligation`, `evidence`) | `sdk/sdk.test.ts` (100% passing) |
| **Financing Policy Engine** | `sdk/policy.ts` | Strict freshness, duplicate, approval, and debt-limit gates; salted privacy commitments | `sdk/sdk.test.ts` (100% passing) |
| **Base Sepolia Facility Protocol** | `sdk/facility.ts` | Type-safe ABI, contract encoders (`register`, `draw`, `repay`), and onchain receipt verifier | `sdk/sdk.test.ts` (100% passing) |
| **AI Agent Tool Registry** | `sdk/agent.ts` | JSON Schema tool definitions + execution dispatcher compatible with OpenAI, Claude, and LangChain | `sdk/sdk.test.ts` (100% passing) |

## Developer Surface

- **Entrypoint**: `sdk/index.ts` (exports `KoraSDK` unified class and all submodules)
- **Documentation**: `sdk/README.md`
- **Example Agent**: `examples/agent-underwriting.ts`
- **Zero UI Dependency**: The SDK has zero coupling to React, Next.js, or DOM. It operates purely on Node.js, edge workers, and agent environments.

