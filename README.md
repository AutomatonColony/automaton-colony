# Automaton Colony

An independent verifier for [automatoncolony.xyz](https://automatoncolony.xyz), a contract
screening service running on Base.

Every report bought through the store has its SHA-256 written into a public escrow contract by
the transaction that delivers it. The script in this repository reads that hash straight from the
chain and compares it with the file on your disk. It never contacts automatoncolony.xyz. A buyer
who has to ask the seller whether the report was edited has no answer worth having.

## Verify a report

Node 18 or newer. There are no dependencies and nothing to install.

```bash
node verify-report.mjs <invoiceId> <path-to-report>
```

The invoice id is the `0x` value shown in the purchase confirmation, 64 hexadecimal characters. The
path is the report file exactly as it was downloaded, with no reformatting: a single added newline
changes the hash.

```
escrow            0x85b98F29C0d52c435a4514A6f4843c3b7B6bc06e (v9)
state             RELEASED
bytes  on-chain   6367
bytes  local      6367
sha256 on-chain   0xe7914e36629ba27cec2906d0513bf2b9bc9507d91934ebcfe09b3782c6077edb
sha256 local      0xe7914e36629ba27cec2906d0513bf2b9bc9507d91934ebcfe09b3782c6077edb

MATCH. This file is byte-for-byte the one committed on-chain when the report was delivered.
```

There are four possible endings. `MATCH` means the file has not been altered since it was
delivered. `MISMATCH` means the file differs from what the chain recorded, whether by an edit or
by a truncated download. An invoice id that exists in neither escrow gets its own message, which
is also what a mistyped id produces. And a purchase that exists with no content committed, which
is the case after a refund and also while a delivery is still pending, ends with a line saying
so, because there is nothing to compare the file against.

Exit codes are `0` for a match, `2` for a usage error, and `1` for everything else, so the script
can be used from another program.

One limit is worth knowing before relying on the check. The escrow records one delivery per
purchase, so the reports generated afterwards with Sniper Pass credits are not anchored
separately: their fingerprint travels inside the report itself, and this script cannot check
them. Verifying a credit report against the pass's invoice id produces a MISMATCH that means
nothing.

Queries go to `https://mainnet.base.org` by default. That endpoint is shared and rate limited; set
`BASE_RPC_URL` to use your own.

```bash
BASE_RPC_URL=https://your-endpoint node verify-report.mjs 0x… report.json
```

### What the check still assumes

The script makes one kind of network call, an `eth_call` to the RPC endpoint, and believes the
answer. An endpoint that lies can produce a false MATCH. When that assumption matters, point
`BASE_RPC_URL` at a node under your own control, or repeat the read on BaseScan and compare the
two results. The hashing of the local file happens offline, with Node's own crypto module.

## Contracts

The script queries the two escrows and nothing else. The other two rows are here because they
appear inside every purchase: USDC is the token the payment is denominated in, and the policy
registry holds the product descriptor, terms and privacy hashes that were in force when the
purchase was paid.

| Contract | Address | Read by the script |
|---|---|---|
| Escrow v9 | [`0x85b98F29C0d52c435a4514A6f4843c3b7B6bc06e`](https://basescan.org/address/0x85b98F29C0d52c435a4514A6f4843c3b7B6bc06e) | yes |
| Escrow v8 | [`0x6478D01FB344d91b0cffa494091458F1FCfe2232`](https://basescan.org/address/0x6478D01FB344d91b0cffa494091458F1FCfe2232) | yes |
| Policy registry (v9) | [`0xC9c131BA2D0d4F0feD26763cd7200dce74924d72`](https://basescan.org/address/0xC9c131BA2D0d4F0feD26763cd7200dce74924d72) | no |
| USDC (payment token) | [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | no |

Both escrows are queried, newest first. v9 has been live since 21 August 2026, and reports bought
before that date are committed in v8, whose buyers deserve a verifier that still works.

The two versions return the same struct with one difference: v9 inserted `paymentToken` in the
second slot, which shifted every field after it by one word. The script reads fields by name from
a per-version list. A hard-coded index is what broke the first client that met v9.

Escrow v9 and the policy registry are verified on BaseScan, so the source behind those addresses
can be read there.

## Doing it by hand

Nothing here depends on the script. The same check runs on BaseScan with no code at all:
read `purchases(invoiceId)` on the escrow, take the `contentSha256` field, and compare it with
`sha256sum` of your file. The walkthrough is in
[How to verify a security report was not edited afterwards](https://automatoncolony.xyz/app/guides/verify-report-hash.html).

## Guides

Written for the person about to spend the money, and kept on the site so there is one copy of
each. The index is in [`guides/`](guides/).

## Reporting a problem

Security issues go to the address in [SECURITY.md](SECURITY.md). Please do not open a public issue
for anything that touches funds in escrow.

## Licence

The verifier is published under the [MIT licence](LICENSE), so it can be read, run, copied and
adapted by anyone. A verifier nobody is allowed to reuse would not be much of a verifier.

