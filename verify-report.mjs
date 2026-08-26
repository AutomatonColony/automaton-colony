// Verify an Automaton Colony report against the Base blockchain.
//
// A report is only worth what you can check yourself, so this script does not talk to
// automatoncolony.xyz at all. It reads the purchase straight from the escrow contract on Base
// through a public RPC endpoint, hashes the file you downloaded, and compares the two.
//
// If the hashes match, the file in your hands is byte-for-byte the one that was committed
// on-chain by the transaction that delivered it. Nobody can have edited it afterwards,
// including us.
//
// One assumption remains, and it is worth naming. The script believes whatever the RPC
// endpoint answers, so an endpoint that lies can produce a false MATCH. Point BASE_RPC_URL at
// a node you control, or repeat the read on BaseScan, when that matters.
//
// No dependencies. Node 18 or newer.
//
//   node verify-report.mjs <invoiceId> <path-to-report>
//
// Example:
//   node verify-report.mjs 0xc7757d8a…f81b flash-audit-1.0.json

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const RPC = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';

// Both escrows are queried, newest first. v9 has been live since 21 August 2026; reports bought
// before that are committed in v8, and their buyers deserve a verifier that still works.
const ESCROWS = [
  { version: 'v9', address: '0x85b98F29C0d52c435a4514A6f4843c3b7B6bc06e', words: 19 },
  { version: 'v8', address: '0x6478D01FB344d91b0cffa494091458F1FCfe2232', words: 18 }
];

// `purchases(bytes32)` — selector derived from the signature, never typed by hand.
const SELECTOR = '0x7ab8dbe9';

// The Purchase struct, in the exact order the contract returns it. v9 inserted `paymentToken` in
// the second slot, which shifted everything after it by one word: that is why the field is read
// by name from this list and never by a hard-coded index.
const FIELDS_V9 = ['buyer', 'paymentToken', 'amount', 'productHash', 'descriptorHash', 'releaseBundleHash',
  'tokenRiskHash', 'termsHash', 'privacyHash', 'contentKeccak256', 'contentSha256', 'deliveryCommitment',
  'contentBytes', 'paidAt', 'cancelDeadline', 'serviceDeadline', 'attestedAt', 'authorizationDeadline', 'state'];
const FIELDS_V8 = FIELDS_V9.filter((f) => f !== 'paymentToken');

// 0 NONE, 1 FUNDED, 2 DELIVERY_ATTESTED, 3 RELEASED, 4 REFUNDED, 5 REFUND_FROZEN.
const STATES = ['NONE', 'FUNDED', 'DELIVERY_ATTESTED', 'RELEASED', 'REFUNDED', 'REFUND_FROZEN'];

// The default endpoint is the public Base RPC, which is rate-limited and shared by everyone. A
// stack trace is not an answer, so every failure here turns into a sentence and an exit code.
function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

async function call(address, data) {
  let payload;
  try {
    const response = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: address, data }, 'latest'] })
    });
    payload = await response.json();
  } catch (error) {
    fail(`Could not reach ${RPC}: ${error?.message ?? error}\nSet BASE_RPC_URL to use a different endpoint.`);
  }
  if (payload.error) {
    const rate = /rate limit|too many requests/i.test(payload.error.message ?? '');
    fail(rate
      ? `The public RPC endpoint is rate-limiting this machine. Wait a minute, or set BASE_RPC_URL to your own endpoint.`
      : `RPC error: ${payload.error.message}`);
  }
  if (typeof payload.result !== 'string' || !payload.result.startsWith('0x')) fail('The RPC endpoint returned no data.');
  return payload.result;
}

function decode(raw, fields) {
  const hex = raw.slice(2);
  if (hex.length !== fields.length * 64) return null;
  const words = [];
  for (let i = 0; i < hex.length; i += 64) words.push(`0x${hex.slice(i, i + 64)}`);
  return Object.fromEntries(fields.map((field, index) => [field, words[index]]));
}

const [invoiceId, path] = process.argv.slice(2);
if (!invoiceId || !path) {
  console.error('Usage: node verify-report.mjs <invoiceId> <path-to-report>');
  process.exit(2);
}
if (!/^0x[0-9a-fA-F]{64}$/.test(invoiceId)) {
  console.error('The invoice id must be 0x followed by 64 hex characters. You will find it in the purchase confirmation.');
  process.exit(2);
}

const file = readFileSync(path);
const localSha256 = `0x${createHash('sha256').update(file).digest('hex')}`;

let found = null;
for (const escrow of ESCROWS) {
  const purchase = decode(await call(escrow.address, SELECTOR + invoiceId.slice(2)), escrow.words === 19 ? FIELDS_V9 : FIELDS_V8);
  if (purchase && BigInt(purchase.state) !== 0n) { found = { escrow, purchase }; break; }
}

if (!found) {
  console.error(`No purchase with that id exists in either escrow. Check the invoice id.`);
  process.exit(1);
}

const { escrow, purchase } = found;
const chainSha256 = purchase.contentSha256.toLowerCase();
const chainBytes = BigInt(purchase.contentBytes);
const state = STATES[Number(BigInt(purchase.state))] ?? `unknown (${purchase.state})`;

console.log(`escrow            ${escrow.address} (${escrow.version})`);
console.log(`state             ${state}`);
console.log(`bytes  on-chain   ${chainBytes}`);
console.log(`bytes  local      ${file.length}`);
console.log(`sha256 on-chain   ${chainSha256}`);
console.log(`sha256 local      ${localSha256}`);
console.log('');

if (BigInt(chainSha256) === 0n) {
  // A refunded purchase never had content committed, so there is nothing to compare against.
  console.log(`No content was ever committed for this purchase (state ${state}). Nothing to verify.`);
  process.exit(1);
}
if (chainSha256 !== localSha256 || chainBytes !== BigInt(file.length)) {
  console.log('MISMATCH. This file is not the one committed on-chain for that purchase.');
  process.exit(1);
}
console.log('MATCH. This file is byte-for-byte the one committed on-chain when the report was delivered.');
