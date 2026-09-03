# Devpost draft

## Title

Merchant Stock Rescue

## Tagline

An agent finds the stock. A merchant keeps the authority.

## Story / problem

Independent merchants lose sales when a nearby shop has the item but their own shelf is empty. Finding a source, checking details, and coordinating a transfer is repetitive operational work, but silently moving stock is a consequential action that should remain under merchant control.

## Solution

Merchant Stock Rescue exposes five WebMCP tools for discovery, source inspection, transfer preparation, commit, and status verification. The agent can do the research and prepare a proposal in the visible console. The proposal remains pending until a merchant explicitly approves it in the UI; only then can the agent commit it. Every transition appears in an audit timeline and the commit returns a transaction receipt.

## How it was built

Built with React, TypeScript, and Vite. A deterministic browser-local external store is shared by the UI and WebMCP handlers. Candidate ranking uses price, distance, pickup time, and reliability. The tests cover tool contracts and the pending → approved/rejected → committed state machine. The project includes a real-browser registration harness; Chrome Inspector/WebMCP manual testing is not claimed.

## Challenges

The central challenge was designing a useful agent workflow without allowing an agent to bypass human authorization. The approval bit is recorded by the UI in shared state, and commit rejects every proposal that is not both approved and in the approved state. Repeatable seed data and structured error codes make the safety boundary easy to demonstrate.

## Accomplishments

- Exactly five narrowly scoped WebMCP tools.
- A visible, deterministic approval gate that blocks pre-approval commit.
- Idempotency and stale-stock protections for commit.
- An auditable activity timeline and receipt after commit.
- A polished, repeatable demo with unit coverage.

## What we learned

Tool descriptions and schemas are part of the product contract, not incidental glue. Separating preparation from authorization makes an agent useful while keeping high-impact authority legible to a human. A shared state model also makes UI behavior and tool behavior testable together.

## What’s next

Connect authenticated merchant inventory APIs, add durable transfer records and multi-merchant permissions, and integrate fulfillment/payment workflows while preserving explicit approval and auditability.

## Testing instructions

```bash
npm install
npm test
npm run build
```

For the demo, run `npm run dev`, use a compatible Chrome WebMCP flag in a secure context, prepare a proposal, attempt commit before approval (expect `HUMAN_APPROVAL_REQUIRED`), approve in the UI, then commit and verify the receipt.

## URLs and media

- Source repository: https://github.com/Bitshank-2338/merchant-stock-rescue
- Live demo (HTTPS): https://merchant-stock-rescue.vercel.app
- Demo video (≤3 minutes): **TODO**
- Screenshots: `output/playwright/merchant-stock-rescue-proposal.png`, `merchant-stock-rescue-approved.png`, `merchant-stock-rescue-committed.png`
