import type {
  ActivityEvent,
  CustomerRequest,
  InventoryCandidate,
  Merchant,
  TransferProposal,
} from "../types";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const time = (timestamp: string) => new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
}).format(new Date(timestamp));

export function RequestPanel({ request, destination }: { request: CustomerRequest; destination?: Merchant }) {
  return (
    <div className="request panel">
      <div className="panel-label">CUSTOMER REQUEST <span className="urgent">● TODAY</span></div>
      <div className="request-body">
        <div className="product-icon" aria-hidden="true">⚒</div>
        <div><h2>{request.productName}</h2><p>Qty <b>{request.quantity}</b> <span className="muted">·</span> {destination?.name || "Destination store"}</p></div>
        <span className="stock-pill">OUT OF STOCK</span>
      </div>
    </div>
  );
}

export function CandidateCard({ candidate, rank, onSelect }: {
  candidate: InventoryCandidate;
  rank: number;
  onSelect: () => void;
}) {
  return (
    <article className="candidate panel">
      <div className="rank">{String(rank).padStart(2, "0")}</div>
      <div className="candidate-main">
        <div className="candidate-title"><h3>{candidate.merchantName}</h3><span className="available">{candidate.availableQuantity} available</span></div>
        <p className="area">{candidate.area} <span>·</span> {candidate.distanceKm.toFixed(1)} km away</p>
        <div className="metrics"><span>↗ {candidate.reliability}% reliable</span><span>◷ {candidate.pickupMinutes} min pickup</span><span>{money(candidate.unitPrice)} / unit</span></div>
      </div>
      <button className="select" onClick={onSelect}>Propose transfer <span>→</span></button>
    </article>
  );
}

export function ProposalCard({ proposal, candidate, destination, onReject, onApprove }: {
  proposal: TransferProposal;
  candidate?: InventoryCandidate;
  destination?: string;
  onReject: () => void;
  onApprove: () => void;
}) {
  const pending = proposal.status === "pending";
  const message = pending
    ? "No inventory has moved. Review this proposal."
    : proposal.status === "approved"
      ? "Approved by you — waiting for the agent to commit."
      : proposal.status === "committed"
        ? `Committed · ${proposal.transactionId}`
        : "Rejected — inventory remains unchanged.";

  return (
    <section className="proposal" aria-live="polite">
      <div className="panel-label">TRANSFER PROPOSAL <span className={`proposal-status ${proposal.status}`}>{proposal.status.toUpperCase()}</span></div>
      <div className="route"><strong>{candidate?.merchantName || proposal.sourceMerchantId}</strong><span className="route-line">→</span><strong>{destination || proposal.destinationMerchantId}</strong></div>
      <div className="proposal-facts">
        <span><small>PRODUCT</small>{candidate?.productName || proposal.productId}</span>
        <span><small>QUANTITY</small>{proposal.quantity} units</span>
        <span><small>VALUE</small>{candidate ? money(candidate.unitPrice * proposal.quantity) : "—"}</span>
        <span><small>PICKUP ETA</small>{candidate ? `${candidate.pickupMinutes} min` : "—"}</span>
      </div>
      <p>{message}</p>
      {pending && <div className="actions"><button className="reject" onClick={onReject}>Reject</button><button className="approve" onClick={onApprove}>Approve transfer <span>→</span></button></div>}
    </section>
  );
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="activity panel">
      <div className="panel-label">ACTIVITY <span className="live-label">LIVE</span></div>
      {events.length ? (
        <div className="timeline">
          {events.slice().reverse().map((event) => (
            <div className="event" key={event.id}>
              <span className={`actor ${event.actor}`} aria-hidden="true">{event.actor === "agent" ? "✦" : event.actor === "human" ? "●" : "◇"}</span>
              <div>
                <div className="event-head"><b>{event.actor === "agent" ? "Agent" : event.actor === "human" ? "You" : "System"}</b><time dateTime={event.timestamp}>{time(event.timestamp)}</time></div>
                <div>{event.action}</div><small>{event.detail}</small>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">No activity yet.</div>}
    </div>
  );
}
