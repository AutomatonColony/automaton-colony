---
name: automaton-colony
description: Screen a smart contract or B20 native token on Base before trusting it. Free on-chain check with no wallet; paid Flash Audit (USDC over x402) delivered as JSON with an anchored hash. Use when a user asks whether a Base token or contract is safe, who controls it, or wants a risk report.
---

# Automaton Colony

Automated security screening of smart contracts and B20 native tokens on Base (eip155:8453).
Every report states what it could **not** verify, as open items with the reason. The hash of each
paid report is anchored on Base at purchase, so the copy you hold can be checked against the chain.

Not a professional audit and not financial advice: the absence of a signal means it was not
observed, never that the risk is absent.

## When to use

- The user pastes a Base address and asks whether it is safe, a honeypot, upgradeable, or who can
  mint, pause, seize or change it.
- The user wants a written risk report for a token, a DeFi protocol, a DAO or an L2 contract.
- You need observed facts (verified source, proxy pattern, admin selectors, holder concentration,
  B20 issuer powers) before recommending an interaction.

## Fastest path: the MCP server

Endpoint: `https://automatoncolony.xyz/mcp` (Streamable HTTP, JSON-RPC 2.0 by POST, no auth).

| Tool | What it does | Cost |
|---|---|---|
| `check_contract_free` | Observed on-chain facts about an address, no verdict | Free |
| `flash_audit_terms` | The x402 `PaymentRequired` for the paid report (amount, network, asset, payTo) | Free |
| `buy_flash_audit` | Buys the Flash Audit over x402 inside the tool | What the 402 states |
| `collect_flash_audit` | Order status, then the report JSON when DELIVERED | Free |

Add it in Claude Code:

```
claude mcp add --transport http automaton-colony https://automatoncolony.xyz/mcp
```

Paying inside MCP follows the official `@x402/mcp` convention: call `buy_flash_audit` without a
payment to receive the `PaymentRequired` (returned as `isError` with `structuredContent`), sign an
EIP-3009 `transferWithAuthorization` on Base USDC for exactly that amount and `payTo`, and call again
with the `PaymentPayload` in `params._meta["x402/payment"]`. You get an `orderKey`; poll
`collect_flash_audit` every 10-15 seconds. The delivered result carries the settlement in
`_meta["x402/payment-response"]`.

## Plain HTTP

- Free check: `GET https://automatoncolony.xyz/api/v1/free-check/<address>` → JSON, no verdict.
- Paid Flash Audit: `POST https://automatoncolony.xyz/api/v1/x402/flash-audit` with body
  `{"targetAddress":"0x…","language":"en"}`. Without a payment header it answers HTTP 402 with the
  x402 v2 `PaymentRequired` (also base64 in the `PAYMENT-REQUIRED` header). Retry with the
  `PAYMENT-SIGNATURE` header (base64 of the `PaymentPayload`) to receive HTTP 202 with an
  `orderKey`, then `GET /api/v1/x402/orders/<orderKey>` until DELIVERED.
- Machine-readable descriptions: `https://automatoncolony.xyz/openapi.json` (OpenAPI 3.1 with
  `x-payment-info`), `https://automatoncolony.xyz/.well-known/api-catalog` (RFC 9727),
  `https://automatoncolony.xyz/llms.txt`.

## Reading a report

The JSON carries `report.verdict` (`no-critical`, `caution`, `high-caution`, `avoid`,
`insufficient-evidence`), `report.riskScore` (0-100), `report.criticalFlags[]` with the evidence
source of each, `deterministicBaseline` (a floor computed from observed facts only),
`report.limitations[]` and `evidenceLimitations[]`. Quote the limitations to the user together with
the verdict: they are part of the answer, not a footnote.

For B20 native tokens, `nativeToken` lists the issuer powers actually configured (supply cap,
pause, transfer policies with their class: blocklist or allowlist), the role holders and who
controls the minting proxy. A B20 has no EVM bytecode by design; "unverified, no admin functions"
from a generic scanner is not a finding.

## Verifying a delivered report

For reports bought through the web store's escrow, `verify-report.mjs` in this repository reads the
purchase from the escrow contract on Base through a public RPC, hashes the file and compares the
two. No account and no contact with automatoncolony.xyz are needed:

```
node verify-report.mjs <invoiceId> <path-to-report.json>
```

Reports bought over x402 carry their SHA-256 inside the JSON and the settlement transaction in the
`PAYMENT-RESPONSE` header (or `_meta["x402/payment-response"]` over MCP); keep both together.

## Identity

ERC-8004 agent 84609 on Base (`https://automatoncolony.xyz/.well-known/agent-registration.json`),
owned by the treasury that receives the payments. Contact: `jls.17@automatoncolony.xyz`.
