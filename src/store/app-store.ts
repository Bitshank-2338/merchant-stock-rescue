import type {
  ActivityActor,
  ActivityEvent,
  AppSnapshot,
  InventoryCandidate,
  ToolErrorCode,
  ToolResult,
  TransferProposal,
  TransferReceipt,
  TransferStatusDetails,
} from "../types";
import { inventory as seedInventory, merchants, products } from "../data";

const fail = <T>(code: ToolErrorCode, message: string): ToolResult<T> => ({
  ok: false,
  error: { code, message },
});

class AppStore {
  private listeners = new Set<() => void>();
  private tick = 0;
  private lastSearchKey = "";
  private state!: AppSnapshot;

  constructor() {
    this.reset();
  }

  private now() {
    return new Date(Date.UTC(2026, 0, 1, 9, 30, this.tick++)).toISOString();
  }

  private notify(next: AppSnapshot) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private event(actor: ActivityActor, action: string, detail: string): ActivityEvent {
    return {
      id: `evt-${this.tick + 1}`,
      actor,
      action,
      detail,
      timestamp: this.now(),
    };
  }

  private addActivity(actor: ActivityActor, action: string, detail: string) {
    this.notify({
      ...this.state,
      activity: [...this.state.activity, this.event(actor, action, detail)],
    });
  }

  private rankCandidates(productId: string, quantity: number): InventoryCandidate[] {
    const product = this.state.products.find((item) => item.id === productId);
    if (!product) return [];

    return this.state.inventory
      .filter((record) => record.productId === product.id && record.quantity >= quantity)
      .map((record) => {
        const merchant = this.state.merchants.find((item) => item.id === record.merchantId)!;
        return {
          merchantId: merchant.id,
          merchantName: merchant.name,
          area: merchant.area,
          productId: product.id,
          productName: product.name,
          availableQuantity: record.quantity,
          unitPrice: record.unitPrice,
          distanceKm: merchant.distanceKm,
          pickupMinutes: merchant.pickupMinutes,
          reliability: merchant.reliability,
        };
      })
      .sort((a, b) => {
        const score = (candidate: InventoryCandidate) =>
          candidate.unitPrice / 1000 +
          candidate.distanceKm * 0.3 +
          candidate.pickupMinutes / 100 -
          (candidate.reliability / 100) * 0.5;
        return score(a) - score(b);
      });
  }

  getSnapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.tick = 0;
    this.lastSearchKey = "";
    const product = products[0];
    this.notify({
      merchants: merchants.map((item) => ({ ...item })),
      products: products.map((item) => ({ ...item })),
      inventory: seedInventory.map((item) => ({ ...item })),
      request: {
        productId: product.id,
        productName: product.name,
        quantity: 2,
        urgency: "Today",
        destinationMerchantId: "m-ace",
      },
      searchResults: [],
      activeProposal: null,
      transfers: [],
      activity: [this.event("system", "Demo reset", "Seed inventory restored; no stock is reserved.")],
    });
    this.searchNetworkStock(product.id, 2);
  }

  searchNetworkStock(queryOrProductId: string, quantity: number): ToolResult<InventoryCandidate[]> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return fail("INVALID_QUANTITY", "Quantity must be a positive integer.");
    }
    const normalizedQuery = queryOrProductId.trim().toLowerCase();
    const product = this.state.products.find(
      (item) => item.id.toLowerCase() === normalizedQuery || item.name.toLowerCase().includes(normalizedQuery),
    );
    if (!product) return fail("PRODUCT_NOT_FOUND", "No product matched that query or product ID.");

    const rows = this.rankCandidates(product.id, quantity);
    if (rows.length === 0) {
      this.notify({
        ...this.state,
        searchResults: [],
        activity: [
          ...this.state.activity,
          this.event("agent", "Inventory search found no source", `${product.name} · quantity ${quantity}`),
        ],
      });
      return fail("INSUFFICIENT_QUANTITY", "No merchant has enough available stock for that quantity.");
    }

    const searchKey = `${product.id}:${quantity}`;
    if (this.lastSearchKey === searchKey && this.state.searchResults.length > 0) {
      return { ok: true, data: this.state.searchResults };
    }
    this.lastSearchKey = searchKey;
    this.notify({
      ...this.state,
      searchResults: rows,
      activity: [
        ...this.state.activity,
        this.event("agent", "Searched network inventory", `${rows.length} eligible sources for ${quantity} × ${product.name}`),
      ],
    });
    return { ok: true, data: rows };
  }

  getSourceDetails(merchantId: string, productId: string): ToolResult<InventoryCandidate> {
    const merchant = this.state.merchants.find((item) => item.id === merchantId);
    const product = this.state.products.find((item) => item.id === productId);
    const record = this.state.inventory.find(
      (item) => item.merchantId === merchantId && item.productId === productId,
    );
    if (!merchant) return fail("INVALID_MERCHANT", "The source merchant ID does not exist.");
    if (!product) return fail("PRODUCT_NOT_FOUND", "The product ID does not exist.");
    if (!record) return fail("PRODUCT_NOT_FOUND", "This merchant does not stock the requested product.");

    const details: InventoryCandidate = {
      merchantId: merchant.id,
      merchantName: merchant.name,
      area: merchant.area,
      productId: product.id,
      productName: product.name,
      availableQuantity: record.quantity,
      unitPrice: record.unitPrice,
      distanceKm: merchant.distanceKm,
      pickupMinutes: merchant.pickupMinutes,
      reliability: merchant.reliability,
    };
    this.addActivity("agent", "Inspected source details", `${merchant.name} has ${record.quantity} units available.`);
    return { ok: true, data: details };
  }

  prepareTransfer(
    sourceMerchantId: string,
    destinationMerchantId: string,
    productId: string,
    quantity: number,
  ): ToolResult<TransferProposal> {
    const source = this.state.merchants.find((item) => item.id === sourceMerchantId);
    const destination = this.state.merchants.find((item) => item.id === destinationMerchantId);
    const product = this.state.products.find((item) => item.id === productId);
    if (!source || !destination || source.id === destination.id) {
      return fail("INVALID_MERCHANT", "Source and destination must be different, valid merchants.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return fail("INVALID_QUANTITY", "Quantity must be a positive integer.");
    }
    if (!product) return fail("PRODUCT_NOT_FOUND", "The product ID does not exist.");

    const inventoryRecord = this.state.inventory.find(
      (item) => item.merchantId === sourceMerchantId && item.productId === productId,
    );
    if (!inventoryRecord || inventoryRecord.quantity < quantity) {
      return fail("INSUFFICIENT_QUANTITY", "The source merchant does not have enough stock.");
    }

    const transfer: TransferProposal = {
      id: `tr-${String(this.state.transfers.length + 1).padStart(4, "0")}`,
      sourceMerchantId,
      destinationMerchantId,
      productId,
      quantity,
      status: "pending",
      approvedByHuman: false,
      createdAt: this.now(),
    };
    this.notify({
      ...this.state,
      transfers: [...this.state.transfers, transfer],
      activeProposal: transfer,
      activity: [
        ...this.state.activity,
        this.event(
          "agent",
          "Prepared transfer proposal",
          `${transfer.id}: ${quantity} × ${product.name}; inventory unchanged.`,
        ),
      ],
    });
    return { ok: true, data: transfer };
  }

  private find(id: string) {
    return this.state.transfers.find((item) => item.id === id);
  }

  private replaceTransfer(
    transfer: TransferProposal,
    event: ActivityEvent,
    inventory = this.state.inventory,
    searchResults = this.state.searchResults,
  ) {
    this.notify({
      ...this.state,
      inventory,
      searchResults,
      transfers: this.state.transfers.map((item) => (item.id === transfer.id ? transfer : item)),
      activeProposal: this.state.activeProposal?.id === transfer.id ? transfer : this.state.activeProposal,
      activity: [...this.state.activity, event],
    });
  }

  approveTransfer(id: string): ToolResult<TransferProposal> {
    const existing = this.find(id);
    if (!existing) return fail("INVALID_TRANSFER_ID", "No transfer exists with that ID.");
    if (existing.status !== "pending") {
      return fail("INVALID_STATE_TRANSITION", "Only a pending transfer can be approved.");
    }
    const transfer: TransferProposal = { ...existing, status: "approved", approvedByHuman: true };
    this.replaceTransfer(
      transfer,
      this.event("human", "Approved transfer", `${id} may now be committed by the agent.`),
    );
    return { ok: true, data: transfer };
  }

  rejectTransfer(id: string): ToolResult<TransferProposal> {
    const existing = this.find(id);
    if (!existing) return fail("INVALID_TRANSFER_ID", "No transfer exists with that ID.");
    if (existing.status !== "pending") {
      return fail("INVALID_STATE_TRANSITION", "Only a pending transfer can be rejected.");
    }
    const transfer: TransferProposal = { ...existing, status: "rejected", approvedByHuman: false };
    this.replaceTransfer(transfer, this.event("human", "Rejected transfer", `${id} cannot be committed.`));
    return { ok: true, data: transfer };
  }

  commitTransfer(id: string): ToolResult<TransferReceipt> {
    const existing = this.find(id);
    if (!existing) return fail("INVALID_TRANSFER_ID", "No transfer exists with that ID.");
    if (existing.status === "committed") {
      this.addActivity("agent", "Duplicate commit blocked", `${id} was already committed; inventory was not changed again.`);
      return fail("ALREADY_COMMITTED", "This transfer was already committed.");
    }
    if (existing.status === "rejected") {
      this.addActivity("agent", "Commit blocked", `${id} was rejected by the merchant.`);
      return fail("PROPOSAL_REJECTED", "A rejected transfer cannot be committed.");
    }
    if (existing.status !== "approved" || !existing.approvedByHuman) {
      this.addActivity("agent", "Commit blocked by approval gate", `${id} still requires a visible merchant approval.`);
      return fail("HUMAN_APPROVAL_REQUIRED", "A merchant must approve this proposal in the visible UI first.");
    }

    const sourceRecord = this.state.inventory.find(
      (item) => item.merchantId === existing.sourceMerchantId && item.productId === existing.productId,
    );
    if (!sourceRecord || sourceRecord.quantity < existing.quantity) {
      this.addActivity("agent", "Commit blocked by stale stock", `${id} no longer has enough source inventory.`);
      return fail("INSUFFICIENT_QUANTITY", "This proposal is stale because source stock is now insufficient.");
    }

    const transactionId = `txn-${id}`;
    const transfer: TransferProposal = { ...existing, status: "committed", transactionId };
    const inventory = this.state.inventory.map((item) =>
      item.merchantId === existing.sourceMerchantId && item.productId === existing.productId
        ? { ...item, quantity: item.quantity - existing.quantity }
        : item,
    );
    const product = this.state.products.find((item) => item.id === existing.productId)!;
    const source = this.state.merchants.find((item) => item.id === existing.sourceMerchantId)!;
    const destination = this.state.merchants.find((item) => item.id === existing.destinationMerchantId)!;
    const remainingSourceStock = sourceRecord.quantity - existing.quantity;
    const searchResults = this.state.searchResults.map((candidate) =>
      candidate.merchantId === existing.sourceMerchantId && candidate.productId === existing.productId
        ? { ...candidate, availableQuantity: remainingSourceStock }
        : candidate,
    );
    this.replaceTransfer(
      transfer,
      this.event("agent", "Committed approved transfer", `${transactionId}: ${remainingSourceStock} units remain at source.`),
      inventory,
      searchResults,
    );
    return {
      ok: true,
      data: {
        transactionId,
        transferId: id,
        status: "committed",
        productName: product.name,
        quantity: existing.quantity,
        sourceName: source.name,
        destinationName: destination.name,
        remainingSourceStock,
      },
    };
  }

  getTransferStatus(id: string): ToolResult<TransferStatusDetails> {
    const transfer = this.find(id);
    if (!transfer) return fail("INVALID_TRANSFER_ID", "No transfer exists with that ID.");
    const product = this.state.products.find((item) => item.id === transfer.productId)!;
    const source = this.state.merchants.find((item) => item.id === transfer.sourceMerchantId)!;
    const destination = this.state.merchants.find((item) => item.id === transfer.destinationMerchantId)!;
    const details: TransferStatusDetails = {
      transferId: transfer.id,
      status: transfer.status,
      approvedByHuman: transfer.approvedByHuman,
      product: { id: product.id, name: product.name },
      quantity: transfer.quantity,
      source: { id: source.id, name: source.name },
      destination: { id: destination.id, name: destination.name },
      transactionId: transfer.transactionId,
    };
    this.addActivity("agent", "Verified transfer status", `${id} is ${transfer.status}.`);
    return { ok: true, data: details };
  }
}

export const appStore = new AppStore();
