# Title

Merchant Stock Rescue

## One-line Summary

An agent finds nearby stock and prepares the transfer; the merchant keeps authority over whether inventory actually moves.

## Problem

Independent merchants lose same-day sales when their own shelf is empty even though a nearby shop has the requested item. Calling stores, checking quantities, comparing pickup options, and coordinating a transfer is repetitive work. But silently moving another merchant's stock is consequential and should not be delegated without a clear human decision.

## Solution

Merchant Stock Rescue is a WebMCP-powered inventory network demo. A browser agent can search nearby merchants, inspect a source, and prepare a transfer proposal. The proposal immediately appears in the merchant's dashboard with the product, source, destination, quantity, value, and pickup ETA. Preparing a proposal never reserves or changes inventory.

The agent's commit call is refused with `HUMAN_APPROVAL_REQUIRED` until the merchant clicks **Approve transfer** in the visible UI. There is deliberately no agent-facing approval tool. Once approved, the agent can commit exactly once, receive a transaction receipt, and verify the final state. The activity timeline distinguishes agent work, human authority, and system events.

## Why This Matters

WebMCP is a strong fit because the workflow combines structured agent labor with live page state and a consequential human decision. DOM automation would have to infer product cards, ranking, transfer IDs, and approval state from presentation markup. The five declared tools give the agent narrow, typed operations while the human works in the same interface.

This creates a better experience than either extreme: the merchant does not perform repetitive inventory research, and the agent cannot quietly authorize an inventory movement. It demonstrates a practical model for the open agentic web: automate the labor, preserve human authority.

## How We Used AI

The product exposes exactly five imperative WebMCP tools through `document.modelContext.registerTool`:

1. `inventory.search_network_stock` finds deterministic candidates ranked by price, distance, pickup time, and reliability.
2. `inventory.get_source_details` returns current source stock and merchant details.
3. `inventory.prepare_transfer` creates a pending proposal without reserving or mutating inventory.
4. `inventory.commit_transfer` requires the matching `approvedByHuman` state, decrements source stock once, and returns a receipt.
5. `inventory.get_transfer_status` returns enriched product, source, destination, approval, status, and transaction details.

The app itself does not send merchant data to a model or require an AI backend. It supplies secure, structured browser tools that a compatible agent can discover and execute. Read-only annotations, bounded input schemas, concise outputs, explicit error codes, and same-origin exposure keep the contract legible.

## How We Used Codex

OpenAI Codex acted as the build orchestrator. It converted the supplied concept into a shared-state architecture, delegated bounded data/store, UI, and WebMCP work packages to focused workers, then performed senior integration and security review. Codex found and fixed immutable-snapshot re-rendering, reset-state, stale UI inventory, asynchronous registration, and approval-boundary issues. It added eleven automated checks, drove a real Chromium browser through the complete refusal/approval/commit flow, captured responsive screenshots, deployed the app, and prepared the public repository and this draft.

## Key Features

- Exactly five non-trivial WebMCP tools with bounded JSON Schemas and structured results.
- Deterministic seed data for 8 merchants, 20 products, and a repeatable `Bosch GSB 600 Drill × 2` scenario.
- Ranked sources showing quantity, price, distance, pickup ETA, and reliability.
- Visible pending proposal with no inventory mutation during preparation.
- Human-only Approve/Reject controls; no tool can set approval.
- Pre-approval commit refusal, rejection protection, stale-stock detection, and duplicate-commit protection.
- Transaction receipt, updated source availability, and actor-labeled audit timeline.
- Responsive desktop/mobile dashboard and one-click Reset Demo.

## Architecture

React 19 + TypeScript + Vite render one responsive operations console. A single browser-local `AppStore` owns merchants, products, inventory, proposals, receipts, and activity. React subscribes with `useSyncExternalStore`; all five WebMCP handlers call that exact same store, so UI approval is the authoritative gate. `WebMCPTools.tsx` registers the imperative tools on mount and unregisters them with an `AbortSignal`. Vercel serves the static build over HTTPS with `Origin-Agent-Cluster: ?1`. There is no backend, database, authentication, or external inventory side effect.

## Testing Instructions

Automated verification:

```bash
npm install
npm test
npm run build
```

Expected result: 3 test files and 11 tests pass, followed by a successful Vite production build.

Manual judge flow:

1. Open https://merchant-stock-rescue.vercel.app in a compatible Chrome build.
2. If needed, enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome.
3. Confirm the dashboard reports `5 TOOLS READY` when `document.modelContext` is available.
4. Call `inventory.search_network_stock` with `{ "query": "Bosch GSB 600 Drill", "quantity": 2 }`.
5. Call `inventory.get_source_details` for `m-bosch` and `p-gsb600`.
6. Call `inventory.prepare_transfer` with source `m-bosch`, destination `m-ace`, product `p-gsb600`, quantity `2`.
7. Call `inventory.commit_transfer` with `tr-0001` before clicking approval. Expect `HUMAN_APPROVAL_REQUIRED` and unchanged inventory.
8. Click **Approve transfer** in the visible dashboard.
9. Call commit again. Expect receipt `txn-tr-0001` and source availability to change from 8 to 6.
10. Call `inventory.get_transfer_status` and verify `status: committed` and `approvedByHuman: true`.

No credentials are required. **Testing disclosure:** the current build was tested with Vitest and a real Playwright Chromium session using an API-compatible in-page ModelContext registration/execution harness. It was not manually tested with the Chrome Model Context Tool Inspector.

## Public Demo Link

https://merchant-stock-rescue.vercel.app

## Public Repository Link

https://github.com/Bitshank-2338/merchant-stock-rescue

## Demo Video

The narrated 2:24 MP4 is rendered at `output/video/merchant-stock-rescue-demo.mp4`. **TODO — required:** upload it to YouTube as a public video and add the URL here.

## Screenshot Shot List

- Pending proposal and human controls: `output/playwright/merchant-stock-rescue-proposal.png`
- Approved proposal waiting for agent commit: `output/playwright/merchant-stock-rescue-approved.png`
- Committed receipt, updated source stock, and audit timeline: `output/playwright/merchant-stock-rescue-committed.png`
- Responsive mobile dashboard: `output/playwright/merchant-stock-rescue-mobile.png`

## Submission Readiness Notes

- Live HTTPS demo: ready and verified HTTP 200.
- Public source repository: ready; MIT license visible at repository root.
- Automated test/build proof: ready; 11/11 tests pass.
- Desktop/mobile screenshots: ready.
- Narrated 2:24 video: rendered and verified as 1080p H.264 with AAC audio; public YouTube URL still required.
- Optional final confidence step: run the same five-tool flow in Chrome with the official Model Context Tool Inspector before recording.

## Known Limitations

- All data and transactions are browser-local and reset on refresh.
- There is no authentication, durable database, real merchant API, payment, or fulfillment integration.
- Candidate distances and reliability values are deterministic demo data, not live measurements.
- WebMCP availability depends on a compatible browser/flag; the human dashboard still works without it.

## TODO Official Form Fields

Proposed answers based on the current project; confirm personal facts before final submission:

- **28249 — Submitter Type:** Individual
- **28250 — Country of residence:** India
- **28251 — Organization name:** Not applicable
- **28252 — App Status:** New
- **28253 — Existing-project update:** Not applicable; this app was built during the event.
- **28254 — Live URL:** https://merchant-stock-rescue.vercel.app
- **28255 — Testing instructions:** Use the ten-step manual judge flow above; no credentials required.
- **28256 — Public code repository:** https://github.com/Bitshank-2338/merchant-stock-rescue
- **28257 — Agent/client testing:** Playwright Chromium with an API-compatible in-page ModelContext registration/execution harness; Vitest contract tests. Not manually tested with the Chrome Inspector.
- **28258 — AI tools leveraged:** OpenAI Codex for architecture, delegated implementation, integration, testing, browser QA, deployment, and submission preparation.
- **28259 — Learning derived:** Significant
- **28260 — Career AI value:** Yes

No Codex session ID is requested by the official form.

## Judging-Criteria Fit

- **WebMCP Leverage:** five interdependent tools share live UI state and execute a complete, guarded workflow.
- **Execution:** deployed, responsive product experience with deterministic data, reset, errors, receipts, and tests.
- **Potential Impact:** addresses same-day lost sales for independent merchants without removing their authority.
- **Creativity & Ambition:** demonstrates an agent/human separation-of-duties pattern for consequential web actions.
