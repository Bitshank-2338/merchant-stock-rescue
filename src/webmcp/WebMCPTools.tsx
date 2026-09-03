import { useEffect } from "react";
import { appStore } from "../store/app-store";
import type { ToolResult } from "../types";

export type WebMCPStatus = "registering" | "ready" | "unavailable" | "error";

const stringField = (description: string, maxLength = 128) => ({
  type: "string", description, minLength: 1, maxLength,
}) as const;
const quantityField = {
  type: "integer", description: "Number of units; must be a positive whole number.", minimum: 1, maximum: 10000,
} as const;
const schema = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object", properties, required, additionalProperties: false,
});
const invalid = (message: string): ToolResult<never> => ({
  ok: false, error: { code: "INVALID_INPUT", message },
});

function validString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 128;
}
function validQuantity(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10000;
}

export function createInventoryTools(): WebMCPToolDefinition[] {
  return [
    {
      name: "inventory.search_network_stock",
      title: "Search network stock",
      description: "Find nearby merchants with enough available inventory for a product and quantity. Returns deterministic candidates ranked by price, distance, pickup time, and reliability.",
      inputSchema: schema({
        query: stringField("Product name, partial name, or exact product ID.", 100),
        quantity: quantityField,
      }, ["query", "quantity"]),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input: unknown) => {
        const values = input as { query?: unknown; quantity?: unknown };
        return validString(values?.query) && validQuantity(values?.quantity)
          ? appStore.searchNetworkStock(values.query, values.quantity)
          : invalid("Provide a non-empty query and a positive integer quantity.");
      },
    },
    {
      name: "inventory.get_source_details",
      title: "Get source details",
      description: "Inspect current stock, price, pickup time, distance, and reliability for one merchant-product source before preparing a transfer.",
      inputSchema: schema({
        merchantId: stringField("Source merchant ID from a network stock result."),
        productId: stringField("Product ID from a network stock result."),
      }, ["merchantId", "productId"]),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input: unknown) => {
        const values = input as { merchantId?: unknown; productId?: unknown };
        return validString(values?.merchantId) && validString(values?.productId)
          ? appStore.getSourceDetails(values.merchantId, values.productId)
          : invalid("Provide valid merchantId and productId strings.");
      },
    },
    {
      name: "inventory.prepare_transfer",
      title: "Prepare inventory transfer",
      description: "Create a pending transfer proposal for the visible merchant UI. This does not reserve or change inventory; a human must approve before commit.",
      inputSchema: schema({
        sourceMerchantId: stringField("Merchant supplying the inventory."),
        destinationMerchantId: stringField("Merchant receiving the inventory."),
        productId: stringField("Product to transfer."),
        quantity: quantityField,
      }, ["sourceMerchantId", "destinationMerchantId", "productId", "quantity"]),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        const values = input as Record<string, unknown>;
        return validString(values?.sourceMerchantId) && validString(values?.destinationMerchantId) &&
          validString(values?.productId) && validQuantity(values?.quantity)
          ? appStore.prepareTransfer(values.sourceMerchantId, values.destinationMerchantId, values.productId, values.quantity)
          : invalid("Provide valid source, destination, product, and quantity fields.");
      },
    },
    {
      name: "inventory.commit_transfer",
      title: "Commit inventory transfer",
      description: "Commit a transfer only after its matching visible proposal was explicitly approved by a human. Decrements source stock once and returns an audit receipt.",
      inputSchema: schema({ transferId: stringField("Approved transfer ID returned by prepare_transfer.") }, ["transferId"]),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        const values = input as { transferId?: unknown };
        return validString(values?.transferId) ? appStore.commitTransfer(values.transferId) : invalid("Provide a valid transferId string.");
      },
    },
    {
      name: "inventory.get_transfer_status",
      title: "Get transfer status",
      description: "Read a transfer's product, source, destination, quantity, approval flag, current state, and transaction ID when committed.",
      inputSchema: schema({ transferId: stringField("Transfer ID to verify.") }, ["transferId"]),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input: unknown) => {
        const values = input as { transferId?: unknown };
        return validString(values?.transferId) ? appStore.getTransferStatus(values.transferId) : invalid("Provide a valid transferId string.");
      },
    },
  ];
}

export function WebMCPTools({ onStatus }: { onStatus?: (status: WebMCPStatus) => void }) {
  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) {
      onStatus?.("unavailable");
      return;
    }
    const controller = new AbortController();
    onStatus?.("registering");
    void Promise.all(createInventoryTools().map((tool) => modelContext.registerTool(tool, { signal: controller.signal })))
      .then(() => { if (!controller.signal.aborted) onStatus?.("ready"); })
      .catch(() => { if (!controller.signal.aborted) onStatus?.("error"); });
    return () => controller.abort();
  }, [onStatus]);
  return null;
}

export default WebMCPTools;
