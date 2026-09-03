import { beforeEach, describe, expect, it } from "vitest";
import { appStore } from "../store/app-store";
import { createInventoryTools } from "./WebMCPTools";

const expectedNames = [
  "inventory.search_network_stock",
  "inventory.get_source_details",
  "inventory.prepare_transfer",
  "inventory.commit_transfer",
  "inventory.get_transfer_status",
];

describe("WebMCP tool contracts", () => {
  beforeEach(() => appStore.reset());

  it("exports exactly the five challenge tools with bounded schemas", () => {
    const tools = createInventoryTools();
    expect(tools.map((tool) => tool.name)).toEqual(expectedNames);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(5);
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toEqual(expect.objectContaining({ type: "object", additionalProperties: false }));
      expect(tool.annotations?.untrustedContentHint).toBe(false);
    }
  });

  it("returns structured invalid-input failures instead of throwing", async () => {
    for (const tool of createInventoryTools()) {
      expect(await tool.execute({})).toEqual({ ok: false, error: expect.objectContaining({ code: "INVALID_INPUT" }) });
    }
  });

  it("uses the shared UI state for the approval gate", async () => {
    const tools = createInventoryTools();
    const prepare = tools.find((tool) => tool.name === "inventory.prepare_transfer")!;
    const commit = tools.find((tool) => tool.name === "inventory.commit_transfer")!;
    const prepared = await prepare.execute({ sourceMerchantId: "m-bosch", destinationMerchantId: "m-ace", productId: "p-gsb600", quantity: 2 }) as ReturnType<typeof appStore.prepareTransfer>;
    const transferId = prepared.ok ? prepared.data.id : "";
    expect(await commit.execute({ transferId })).toEqual({ ok: false, error: expect.objectContaining({ code: "HUMAN_APPROVAL_REQUIRED" }) });
    appStore.approveTransfer(transferId);
    expect(await commit.execute({ transferId })).toEqual({ ok: true, data: expect.objectContaining({ transferId, status: "committed" }) });
  });
});
