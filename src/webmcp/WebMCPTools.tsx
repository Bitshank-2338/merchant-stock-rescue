import { useEffect } from "react";
import { createInventoryTools } from "./inventory-tools";

export type WebMCPStatus = "registering" | "ready" | "unavailable" | "error";

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
