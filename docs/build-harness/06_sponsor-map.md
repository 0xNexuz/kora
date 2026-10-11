# Sponsor map

## Program

- Hackathon: Colosseum: Crypto World's Fair (Sep 14 – Oct 12, 2026).
- Track: Base Sponsor Track / Payments & Commerce / AI Solutions.
- Official source: https://colosseum.com/
- Accelerator: Winning entries evaluated for the $250K Colosseum Accelerator.

## Integration

| Ecosystem | Primitive | Load-bearing | Status | Evidence |
|---|---|---:|---|---|
| Base | Sepolia chain 84532 and RPC receipt verification | Yes | VERIFIED TESTNET | `0xad177afed1593291d872cfe2b3ac984f9cc3febb` (`evidence/transactions/base-sepolia-deployment.json`) |
| Circle | Base Sepolia test USDC address | Yes for target settlement | VERIFIED TESTNET | `0x036cbd53842c5426634e7929541ec2318f3dcf7e` (`evidence/transactions/base-sepolia-lifecycle.json`) |
| EVM | KoraFacility agreement lifecycle | Yes | REAL — LOCAL | `chain.evm.test.ts` |

Removing Base would remove the target public agreement, settlement, receipt, and repayment evidence layer. Wallet connectivity alone is not counted as the integration.

## Proof checklist

- [x] Core contract and verifier exist.
- [x] Failure behavior and local tests exist.
- [x] UI/docs distinguish demo from network execution.
- [x] Real Base Sepolia deployment address and explorer receipt (`0xad177afed1593291d872cfe2b3ac984f9cc3febb`).
- [x] Real register, draw, repay transactions and reconciled graph version (`evidence/transactions/base-sepolia-lifecycle.json`).
