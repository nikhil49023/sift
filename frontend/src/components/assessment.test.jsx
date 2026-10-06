// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import RadarScorecard from "./RadarScorecard";
import AuditInput from "./AuditInput";
import { cadence } from "./CommitVelocityChart";
import DecisionReview from "./DecisionReview";
afterEach(cleanup);
describe("evidence presentation", () => {
  it("distinguishes Groq-only assessments from probabilistic TypeSafe Jev review", () => {
    const view = render(
      <DecisionReview verification={{ status: "disabled" }} />,
    );
    expect(
      screen.getByText(/TypeSafe Jev review was not requested/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("TypeSafe Jev evidence review"),
    ).not.toBeInTheDocument();
    view.rerender(
      <DecisionReview
        verification={{
          status: "review_required",
          model: "jev-synthetic-version",
          threshold: 0.8,
          checks: { systemsRigor_support: 0.65 },
          reason: "Human review needed",
        }}
      />,
    );
    expect(screen.getByText("65.0%")).toBeInTheDocument();
    expect(screen.getByText(/model estimates/)).toBeInTheDocument();
    expect(screen.getByText("Human review needed")).toBeInTheDocument();
  });
  it("keeps unknown dimensions unscored and disables incomplete exports", () => {
    render(
      <RadarScorecard
        audit={{ status: "running" }}
        decisions={[]}
        canWrite={true}
        workflow="hackathon"
      />,
    );
    expect(screen.getAllByText("Unscored").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Download evidence dossier" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Unknown dimensions are not zero/),
    ).toBeInTheDocument();
  });
  it("groups real captured dates without generating synthetic cadence", () => {
    expect(
      cadence([
        { commitDate: "2026-01-02T12:00:00Z" },
        { commitDate: "2026-01-01T12:00:00Z" },
        { commitDate: "2026-01-02T13:00:00Z" },
      ]),
    ).toEqual([
      { day: "2026-01-01", commits: 1 },
      { day: "2026-01-02", commits: 2 },
    ]);
    expect(cadence([])).toEqual([]);
  });
  it("submits hackathon repository and team context", () => {
    const onSubmit = vi.fn();
    render(
      <AuditInput workflow="hackathon" onSubmit={onSubmit} disabled={false} />,
    );
    fireEvent.change(screen.getByLabelText("Team / submission name"), {
      target: { value: "Synthetic UI fixture" },
    });
    fireEvent.change(
      screen.getByLabelText("Repository URL or owner/repository"),
      { target: { value: "test/repo" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Collect & evaluate evidence" }),
    );
    expect(onSubmit).toHaveBeenCalledWith({
      candidateName: "Synthetic UI fixture",
      repositories: ["test/repo"],
      team: [],
    });
  });
});
