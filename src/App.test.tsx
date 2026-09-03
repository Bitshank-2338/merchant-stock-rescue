import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { appStore } from "./store/app-store";

describe("merchant dashboard", () => {
  beforeEach(() => appStore.reset());

  it("shows real WebMCP availability and keeps commit agent-only", () => {
    render(<App />);
    expect(screen.getByText("5 TOOLS • ENABLE FLAG")).toBeInTheDocument();
    expect(screen.getByText("Bosch GSB 600 Drill")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /propose transfer/i })[0]);
    expect(screen.getByText("TRANSFER PROPOSAL")).toBeInTheDocument();
    expect(screen.getByText("No inventory has moved. Review this proposal.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /commit/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve transfer/i }));
    expect(screen.getByText("Approved by you — waiting for the agent to commit.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /commit/i })).not.toBeInTheDocument();
    expect(appStore.getSnapshot().activeProposal?.approvedByHuman).toBe(true);
  });
});
