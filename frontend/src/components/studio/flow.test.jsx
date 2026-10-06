// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "../../App";
import StudioFlow from "./StudioFlow";
import ResultsScreen from "./ResultsScreen";
const state = vi.hoisted(() => ({ auth: null }));
const request = vi.hoisted(() => vi.fn());
vi.mock("../../auth/AuthProvider", () => ({
  default: ({ children }) => children,
  useAuth: () => state.auth,
}));
vi.mock("../../api", () => ({ request }));
beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/#roles");
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  state.auth = {
    identity: { mode: "demo", name: "Explorer" },
    session: null,
    signOut: vi.fn(),
    loading: false,
    error: "",
    config: null,
  };
  request.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("Decision Studio journey", () => {
  it("includes a scored but flagged assessment in Needs review", () => {
    render(
      <ResultsScreen
        run={{
          workflow: "recruiting",
          status: "results",
          brief: { title: "Frontend" },
          rankingsEnabled: false,
          items: [
            {
              id: "flagged",
              input: {
                candidateName: "Flagged entry",
                repositories: ["sift/ui"],
              },
              status: "completed",
              assessment: { overallScore: 88, riskLevel: "FLAGGED" },
            },
            {
              id: "clear",
              input: {
                candidateName: "Clear entry",
                repositories: ["sift/api"],
              },
              status: "completed",
              assessment: { overallScore: 90, riskLevel: "NO_FLAGS_OBSERVED" },
            },
          ],
        }}
        identity={{ mode: "local" }}
        canWrite={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Needs review" }));
    expect(
      screen.getByRole("button", { name: "Review Flagged entry" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Review Clear entry" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("flagged", { selector: ".evidence-chip" }),
    ).toHaveClass("review");
  });
  it("takes a recruiter through intake, processing, selection, and browser-session recovery", async () => {
    vi.useFakeTimers();
    const view = render(<App />);
    fireEvent.click(screen.getByRole("radio", { name: /Recruiter/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to recruiting/ }),
    );
    expect(
      screen.getByRole("heading", { name: /Bring the possibilities/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Job description · optional"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Try four sample submissions/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Process 4 submissions/ }),
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(
      screen.getByRole("heading", { name: /A clearer shortlist/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Demo score" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review Avery Patel" }));
    fireEvent.change(screen.getByLabelText("Your decision"), {
      target: { value: "advance" },
    });
    fireEvent.change(screen.getByLabelText("Why this decision?"), {
      target: { value: "Strong sample architecture and useful test coverage." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save demo decision" }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: /^Selected/ }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole("button", { name: "Review Noor Williams" }),
    ).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    view.unmount();
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Review Avery Patel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selected", { selector: ".decision-chip" }),
    ).toBeInTheDocument();
  });
  it("offers hackathon sprint and team fields and preserves a direct entry", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("radio", { name: /Hackathon organizer/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to hackathon/ }),
    );
    fireEvent.change(screen.getByLabelText("Hackathon / judging round"), {
      target: { value: "Build round" },
    });
    fireEvent.change(screen.getByLabelText("Team / submission name"), {
      target: { value: "Orbit" },
    });
    fireEvent.change(screen.getByLabelText("Project repository"), {
      target: { value: "https://github.com/sift/orbit" },
    });
    fireEvent.change(screen.getByLabelText("Declared team members"), {
      target: { value: "Alex, Noor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add submission" }));
    expect(screen.getByRole("heading", { name: "Orbit" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Process 1 submission/ }),
    ).toBeEnabled();
    expect(
      screen.getByLabelText("Sprint start · optional"),
    ).toBeInTheDocument();
  });
  it("guards result deep links until an identity exists", () => {
    state.auth = { ...state.auth, identity: null, client: null };
    window.history.replaceState({}, "", "/#results");
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Welcome to SIFT." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("prevents a viewer from submitting an evaluation", async () => {
    state.auth.identity = { mode: "local", name: "Viewer" };
    request.mockResolvedValue([
      { id: "org", name: "SIFT team", role: "viewer" },
    ]);
    render(
      <StudioFlow
        workflow="recruiting"
        screen="intake"
        navigate={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("Role / evaluation name"), {
      target: { value: "Frontend Engineer" },
    });
    fireEvent.change(screen.getByLabelText("Candidate name"), {
      target: { value: "Alex" },
    });
    fireEvent.change(screen.getByLabelText("GitHub repositories"), {
      target: { value: "sift/ui" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add candidate" }));
    expect(
      screen.getByRole("button", { name: /Process 1 submission/ }),
    ).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
