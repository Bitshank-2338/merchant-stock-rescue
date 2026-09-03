import { beforeEach, describe, expect, it } from "vitest";
import { appStore } from "./app-store";

const stock = (merchantId = "m-bosch") => appStore.getSnapshot().inventory.find(
  (item) => item.merchantId === merchantId && item.productId === "p-gsb600",
)!.quantity;

describe("merchant inventory store", () => {
  beforeEach(() => appStore.reset());

  it("ranks deterministic candidates and publishes an immutable snapshot", () => {
    const before = appStore.getSnapshot();
    const result = appStore.searchNetworkStock("Bosch GSB 600", 3);
    const after = appStore.getSnapshot();
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.map((item) => item.merchantId)).toEqual([
      "m-bosch", "m-build", "m-diy",
    ]);
    expect(after).not.toBe(before);
    expect(after.searchResults[0].reliability).toBe(99);
  });

  it("prepares without reserving stock and blocks commit before human approval", () => {
    const before = stock();
    const prepared = appStore.prepareTransfer("m-bosch", "m-ace", "p-gsb600", 2);
    expect(prepared.ok).toBe(true);
    expect(stock()).toBe(before);
    const commit = appStore.commitTransfer(prepared.ok ? prepared.data.id : "");
    expect(commit).toEqual({ ok: false, error: expect.objectContaining({ code: "HUMAN_APPROVAL_REQUIRED" }) });
    expect(stock()).toBe(before);
    expect(appStore.getSnapshot().activity.at(-1)?.action).toBe("Commit blocked by approval gate");
  });

  it("commits exactly once after approval and returns an audit receipt", () => {
    const before = stock();
    const prepared = appStore.prepareTransfer("m-bosch", "m-ace", "p-gsb600", 2);
    const id = prepared.ok ? prepared.data.id : "";
    expect(appStore.approveTransfer(id).ok).toBe(true);
    const commit = appStore.commitTransfer(id);
    expect(commit).toEqual({
      ok: true,
      data: expect.objectContaining({ transactionId: `txn-${id}`, transferId: id, status: "committed", remainingSourceStock: before - 2 }),
    });
    expect(stock()).toBe(before - 2);
    expect(appStore.getSnapshot().searchResults.find((item) => item.merchantId === "m-bosch")?.availableQuantity).toBe(before - 2);
    expect(appStore.commitTransfer(id)).toEqual({ ok: false, error: expect.objectContaining({ code: "ALREADY_COMMITTED" }) });
    const status = appStore.getTransferStatus(id);
    expect(status.ok && status.data).toEqual(expect.objectContaining({
      status: "committed",
      approvedByHuman: true,
      product: { id: "p-gsb600", name: "Bosch GSB 600 Drill" },
    }));
  });

  it("keeps inventory unchanged when the merchant rejects", () => {
    const before = stock();
    const prepared = appStore.prepareTransfer("m-bosch", "m-ace", "p-gsb600", 2);
    const id = prepared.ok ? prepared.data.id : "";
    expect(appStore.rejectTransfer(id).ok).toBe(true);
    expect(appStore.commitTransfer(id)).toEqual({ ok: false, error: expect.objectContaining({ code: "PROPOSAL_REJECTED" }) });
    expect(stock()).toBe(before);
  });

  it("detects a stale approved transfer after another transfer consumes stock", () => {
    const first = appStore.prepareTransfer("m-city", "m-ace", "p-gsb600", 2);
    const second = appStore.prepareTransfer("m-city", "m-build", "p-gsb600", 2);
    const firstId = first.ok ? first.data.id : "";
    const secondId = second.ok ? second.data.id : "";
    appStore.approveTransfer(firstId);
    appStore.approveTransfer(secondId);
    expect(appStore.commitTransfer(firstId).ok).toBe(true);
    expect(appStore.commitTransfer(secondId)).toEqual({ ok: false, error: expect.objectContaining({ code: "INSUFFICIENT_QUANTITY" }) });
  });

  it("returns structured errors for invalid products, merchants, quantities, and IDs", () => {
    expect(appStore.searchNetworkStock("unknown product", 1)).toEqual({ ok: false, error: expect.objectContaining({ code: "PRODUCT_NOT_FOUND" }) });
    expect(appStore.searchNetworkStock("p-gsb600", 0)).toEqual({ ok: false, error: expect.objectContaining({ code: "INVALID_QUANTITY" }) });
    expect(appStore.searchNetworkStock("p-gsb600", 100)).toEqual({ ok: false, error: expect.objectContaining({ code: "INSUFFICIENT_QUANTITY" }) });
    expect(appStore.prepareTransfer("missing", "m-ace", "p-gsb600", 1)).toEqual({ ok: false, error: expect.objectContaining({ code: "INVALID_MERCHANT" }) });
    expect(appStore.getTransferStatus("tr-missing")).toEqual({ ok: false, error: expect.objectContaining({ code: "INVALID_TRANSFER_ID" }) });
  });

  it("distinguishes system, agent, and human actions in the audit log", () => {
    appStore.searchNetworkStock("p-gsb600", 2);
    appStore.getSourceDetails("m-bosch", "p-gsb600");
    const prepared = appStore.prepareTransfer("m-bosch", "m-ace", "p-gsb600", 2);
    appStore.approveTransfer(prepared.ok ? prepared.data.id : "");
    const actors = new Set(appStore.getSnapshot().activity.map((event) => event.actor));
    expect(actors).toEqual(new Set(["system", "agent", "human"]));
  });
});
