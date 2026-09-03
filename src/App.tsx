import { useMemo, useState, useSyncExternalStore } from "react";
import { ActivityTimeline, CandidateCard, ProposalCard, RequestPanel } from "./components/Dashboard";
import { appStore } from "./store/app-store";
import type { InventoryCandidate } from "./types";
import WebMCPTools, { type WebMCPStatus } from "./webmcp/WebMCPTools";

const statusLabels: Record<WebMCPStatus, string> = {
  registering: "CONNECTING",
  ready: "5 TOOLS READY",
  unavailable: "5 TOOLS • ENABLE FLAG",
  error: "REGISTRATION ERROR",
};

export default function App() {
  const snapshot = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getSnapshot);
  const [webMCPStatus, setWebMCPStatus] = useState<WebMCPStatus>(
    typeof document.modelContext?.registerTool === "function" ? "registering" : "unavailable",
  );
  const request = snapshot.request;

  const proposal = snapshot.activeProposal;
  const destination = useMemo(
    () => snapshot.merchants.find((merchant) => merchant.id === request.destinationMerchantId),
    [snapshot.merchants, request.destinationMerchantId],
  );
  const proposalCandidate = useMemo(
    () => proposal && snapshot.searchResults.find((candidate) => candidate.merchantId === proposal.sourceMerchantId),
    [snapshot.searchResults, proposal],
  );

  return (
    <>
      <WebMCPTools onStatus={setWebMCPStatus} />
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">⌁</span>
            <div>
              <div className="brand-name">Merchant Stock Rescue</div>
              <div className="tagline">The agent gets the labor. The merchant keeps the authority.</div>
            </div>
          </div>
          <div className={`status status-${webMCPStatus}`} title="WebMCP availability in this browser">
            <span className="status-dot" /> WebMCP
            <span className="status-live">{statusLabels[webMCPStatus]}</span>
          </div>
        </header>
        <main className="main">
          <div className="eyebrow">OPERATIONS CONSOLE <span>•</span> LIVE DEMO</div>
          <div className="title-row">
            <div>
              <h1>Recover a sale, together.</h1>
              <p className="subtitle">Intelligent inventory routing for independent merchants.</p>
            </div>
            <button className="reset" onClick={() => appStore.reset()}>↻ Reset demo</button>
          </div>
          <div className="grid">
            <section className="left">
              <RequestPanel request={request} destination={destination} />
              <div className="section-heading">
                <div>
                  <h2>Nearby inventory</h2>
                  <p>Ranked by availability, distance, price, and reliability</p>
                </div>
                <span className="count">{snapshot.searchResults.length} SOURCES</span>
              </div>
              <div className="candidates">
                {snapshot.searchResults.length ? snapshot.searchResults.map((candidate: InventoryCandidate, index) => (
                  <CandidateCard
                    key={candidate.merchantId}
                    candidate={candidate}
                    rank={index + 1}
                    onSelect={() => appStore.prepareTransfer(
                      candidate.merchantId,
                      request.destinationMerchantId,
                      request.productId,
                      request.quantity,
                    )}
                  />
                )) : <div className="empty">No merchant can fulfill this request.</div>}
              </div>
              {proposal && (
                <ProposalCard
                  proposal={proposal}
                  candidate={proposalCandidate || undefined}
                  destination={destination?.name}
                  onReject={() => appStore.rejectTransfer(proposal.id)}
                  onApprove={() => appStore.approveTransfer(proposal.id)}
                />
              )}
            </section>
            <aside><ActivityTimeline events={snapshot.activity} /></aside>
          </div>
        </main>
        <footer><span>Protected by human approval</span><span>● All actions are auditable</span></footer>
      </div>
    </>
  );
}
