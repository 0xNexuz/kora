# Sponsor map

## Program

- Program: Base Batches 004, Base Ecosystem Fund.
- Fit: early-stage Base-first financing/agent infrastructure.
- Official source: https://www.base.org/batches
- The program offers selected teams a $100K investment, not an automatic grant.

## Integration

| Ecosystem | Primitive | Load-bearing | Status | Evidence |
|---|---|---:|---|---|
| Base | Sepolia chain 84532 and RPC receipt verification | Yes | PARTIAL | `backend/chain.ts` |
| Circle | Base Sepolia test USDC address | Yes for target settlement | IMPLEMENTED, UNVERIFIED TESTNET | constants and contract constructor |
| EVM | KoraFacility agreement lifecycle | Yes | REAL — LOCAL | `chain.evm.test.ts` |

Removing Base would remove the target public agreement, settlement, receipt, and repayment evidence layer. Wallet connectivity alone is not counted as the integration.

## Proof checklist

- [x] Core contract and verifier exist.
- [x] Failure behavior and local tests exist.
- [x] UI/docs distinguish demo from network execution.
- [ ] Real Base Sepolia deployment address and explorer receipt.
- [ ] Real register, draw, repay transactions and reconciled graph version.
