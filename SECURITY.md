# Security policy

Automaton Colony holds buyer funds in a public escrow contract on Base and sells reports whose
hash is committed on chain. A defect in either one costs somebody real money, so reports from
outside are welcome.

## Where to send it

**jls.17@automatoncolony.xyz**

Please do not open a public issue for anything that touches funds held in escrow, the release or
refund path, or a way to obtain a report without paying for it. Everything else can go in an issue
without harm.

A useful report says what an attacker ends up with. The most helpful ones name the contract or
file, the state the system has to be in, the exact input, and what comes out that should not.
A proof of concept against Base Sepolia helps more than one against mainnet, and mainnet exploits
are not necessary to make a point.

## What is in scope

The escrow and the policy registry deployed on Base, the addresses of which are listed in the
[README](README.md); the API and worker behind automatoncolony.xyz; the store front end and the
per-language pages; and the verifier script in this repository.

Findings that only affect a third-party data source the service reads from are worth sending too,
because the interesting question is usually what the service does when that source lies.

## What is out of scope

Reports produced by automated scanners with no accompanying scenario. Denial of service by
volume against the public endpoints. Missing hardening headers with no exploit behind them.
Anything requiring access to the operator's machine or mailbox, since that grants everything by
definition.

Please do not run load tests, mass automated purchases, or anything that spends real USDC from
someone else's wallet.

## What happens next

Reports are read by one person, so an acknowledgement can take up to 72 hours.
A fix for anything touching funds goes out ahead of everything else on the list. Reporters are
credited by whatever name they prefer, or not at all if they would rather stay out of it.

Research that stays inside the scope above, uses test funds, and leaves other people's data and
money alone will be treated as done in good faith: it will not be answered with legal action or
with a complaint to a hosting or registrar provider. A reporter is free to publish 90 days after
the first message, or as soon as a fix is deployed, whichever comes first, and earlier by
agreement. Email travels in the clear; leave exploit details out of the first message and they
will be requested through a channel agreed there.

There is no paid bounty programme. That may change. If it does, the terms will appear here before
anyone reports anything under them.

## The parts that cannot be patched

Some commitments are anchored on chain and immutable by design, including the product descriptors
and the terms hash recorded with each purchase. A report against one of those is still worth
sending: the answer will be a procedure or a fresh deployment instead of an edit. Knowing which
parts can be corrected quietly and which cannot is useful in itself.

The known limitations of the screening are published, and are described
in [What an automated contract screening cannot tell
you](https://automatoncolony.xyz/app/guides/screening-limits.html). A finding that the service
fails to detect something listed there describes expected behaviour, and will be closed as such.
