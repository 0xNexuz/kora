# SDK extraction

## Candidate primitives

| Primitive | Value | Priority |
|---|---|---|
| Typed financial skills | Reproducible SME cash-flow/scenario analysis | P1 |
| Recommendation/evidence schema | Inspectable agent output contract | P1 |
| Financing policy engine | Freshness, duplicate, approval and amount gates | P1 |
| Base receipt verifier | Confirms calldata/events/amounts before history updates | P1 |

Do not extract packages yet. The current modules contain Ada-specific assumptions and should first complete a real testnet run and remove product-specific constants. The UI, local store, and demo fixture should remain application code.
