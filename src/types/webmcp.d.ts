declare global {
  interface WebMCPToolDefinition {
    name: string;
    title?: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
    execute: (input: unknown, context?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
  }

  interface ModelContext {
    registerTool(tool: WebMCPToolDefinition, options?: { signal?: AbortSignal }): Promise<void>;
  }

  interface Document { modelContext?: ModelContext }
}

export {};
