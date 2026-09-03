# Demo script (≤3 minutes)

Rendered deliverable: `output/video/merchant-stock-rescue-demo.mp4` (2:24, 1920×1080, H.264 video + AAC narration). The full narration is in `video-narration.txt`.

**0:00–0:20 — Frame the problem.** “A merchant is short on a product. The agent can do the searching and coordination, but the merchant—not the agent—authorizes moving stock.”

**0:20–0:55 — Show discovery.** Open the app and point out the seeded request, ranked nearby sources, and WebMCP status. Call `inventory.search_network_stock`, then `inventory.get_source_details` for the selected source.

**0:55–1:25 — Prepare, don’t commit.** Call `inventory.prepare_transfer`. Show the visible pending proposal and timeline entry stating inventory is unchanged. Immediately call `inventory.commit_transfer`; pause on the structured `HUMAN_APPROVAL_REQUIRED` refusal.

**1:25–1:55 — Human approval.** Click **Approve transfer** in the merchant UI. Point out the human actor and approved state in the timeline. Emphasize that there is no agent-side approval tool.

**1:55–2:25 — Commit and verify.** Call `inventory.commit_transfer` with the proposal ID. Show the transaction receipt, decremented source stock, and committed timeline event. Call `inventory.get_transfer_status` and show `approvedByHuman: true`.

**2:25–2:50 — Close on safety.** Reset the demo if desired and mention deterministic local data, structured failures, and that real deployments would add authenticated inventory and fulfillment services. End with repository/live-demo/video URLs on screen.
