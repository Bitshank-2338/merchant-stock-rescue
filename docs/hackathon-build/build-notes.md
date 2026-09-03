# Build Notes

## Ideate

- Participant began without a project idea and described themselves as new to coding but experienced with Claude and Codex.
- The participant then supplied a complete build brief and actively replaced the initial brainstorm with **Merchant Stock Rescue**.
- Core decision: an agent performs discovery and operational labor; a human merchant exclusively authorizes consequential stock-transfer commits.
- Guided planning stages are being compressed because the supplied brief already specifies the problem, architecture, tools, milestones, security boundary, tests, and submission assets.

## Architecture Decisions

- React + TypeScript + Vite, browser-local deterministic data, no backend.
- One shared external store drives the human UI and all WebMCP tools.
- Exactly five WebMCP inventory tools use the imperative browser API.
- Transfer flow is `pending -> approved|rejected -> committed`; commit requires UI-recorded human approval.
- Routine implementation is delegated to lower-cost workers; senior work is limited to architecture, integration, WebMCP correctness, security review, and final verification.
