// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App, { routeForLocation } from "../../App";
import WorkspaceScreen from "./WorkspaceScreen";
import LoadingScreen from "./LoadingScreen";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/#home");
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn(() => ({ matches: false }));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const workspace = () =>
  render(<WorkspaceScreen onBack={vi.fn()} onOpenForensics={vi.fn()} />);
const main = () => within(document.querySelector(".workspace-main"));

describe("editorial navigation", () => {
  it("preserves sign-in callbacks for the existing authenticated review", () => {
    expect(
      routeForLocation({ hash: "#access_token=demo_callback", search: "" }),
    ).toBe("review");
    expect(routeForLocation({ hash: "", search: "?code=demo_callback" })).toBe(
      "review",
    );
    expect(routeForLocation({ hash: "#workspace", search: "" })).toBe(
      "workspace",
    );
    expect(routeForLocation({ hash: "#unknown", search: "" })).toBe("home");
  });

  it("opens the workspace from home through the dossier transition and returns home", () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: /Start your shortlist/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Your next chapter." }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", { name: "A closer look." }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("#workspace");
    fireEvent.click(screen.getByRole("button", { name: "Back to SIFT home" }));
    expect(
      screen.getByRole("heading", { name: /The right people/ }),
    ).toBeInTheDocument();
  });

  it("restores the correct screen for browser history navigation", () => {
    render(<App />);
    window.history.replaceState({}, "", "/#workspace");
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(
      screen.getByRole("heading", { name: "A closer look." }),
    ).toBeInTheDocument();
    window.history.replaceState({}, "", "/#home");
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(
      screen.getByRole("heading", { name: /The right people/ }),
    ).toBeInTheDocument();
  });

  it("cancels the opening transition when unmounted", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const { unmount } = render(<LoadingScreen onComplete={onComplete} />);
    unmount();
    vi.advanceTimersByTime(2500);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe("illustrative shortlist workspace", () => {
  it("supports keyboard navigation between dossier tabs", () => {
    workspace();
    const overview = screen.getByRole("tab", { name: "Overview" });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    const evidence = screen.getByRole("tab", { name: /Evidence & notes/ });
    expect(evidence).toHaveFocus();
    expect(evidence).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByLabelText("Your private review notes"),
    ).toBeInTheDocument();
    fireEvent.keyDown(evidence, { key: "Home" });
    expect(overview).toHaveFocus();
    expect(overview).toHaveAttribute("aria-selected", "true");
  });

  it("searches skills, handles no matches, and opens a matching dossier", () => {
    workspace();
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "fintech" } });
    expect(main().getByText("Meera Iyer")).toBeInTheDocument();
    expect(main().queryByText("Rhea Menon")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "no matching person" } });
    expect(
      main().getByRole("heading", { name: "No profiles found, yet." }),
    ).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "fintech" } });
    fireEvent.click(
      main().getByRole("button", { name: /^Product Lead Meera Iyer/ }),
    );
    expect(
      main().getByRole("heading", { name: "Meera Iyer" }),
    ).toBeInTheDocument();
    expect(search).toHaveValue("");
  });

  it("persists shortlist changes and compares only shortlisted profiles", () => {
    workspace();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Arjun Khanna from shortlist",
      }),
    );
    expect(
      screen
        .getAllByRole("button", { name: /Compare shortlist/ })
        .every((button) => button.disabled),
    ).toBe(true);
    expect(JSON.parse(localStorage.getItem("sift.demo.shortlist"))).toEqual([
      "cand-rhea",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Next candidate" }));
    fireEvent.click(main().getByRole("button", { name: "Add to shortlist" }));
    fireEvent.click(main().getByRole("button", { name: /Compare shortlist/ }));
    const dialog = within(screen.getByRole("dialog"));
    expect(
      dialog.getByRole("heading", { name: "Rhea Menon" }),
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("heading", { name: "Arjun Khanna" }),
    ).toBeInTheDocument();
    expect(
      dialog.queryByRole("heading", { name: "Meera Iyer" }),
    ).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps notes separate per candidate and restores them after reopening", () => {
    workspace();
    fireEvent.click(main().getByRole("button", { name: "Add a note" }));
    fireEvent.change(screen.getByLabelText("Your private review notes"), {
      target: { value: "Ask about the activation experiment." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next candidate" }));
    fireEvent.click(main().getByRole("button", { name: "Add a note" }));
    expect(screen.getByLabelText("Your private review notes")).toHaveValue("");
    cleanup();
    workspace();
    fireEvent.click(main().getByRole("button", { name: "Add a note" }));
    expect(screen.getByLabelText("Your private review notes")).toHaveValue(
      "Ask about the activation experiment.",
    );
  });

  it("recovers from corrupted browser preferences", () => {
    localStorage.setItem("sift.demo.shortlist", '{"bad":"value"}');
    localStorage.setItem("sift.demo.notes", "invalid-json");
    localStorage.setItem("sift.demo.role", "[]");
    workspace();
    expect(
      main().getByRole("heading", { name: "Rhea Menon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Remove Arjun Khanna from shortlist",
      }),
    ).toBeInTheDocument();
    fireEvent.click(main().getByRole("button", { name: "Add a note" }));
    expect(screen.getByLabelText("Your private review notes")).toHaveValue("");
  });

  it("saves the role brief and rejects whitespace-only titles", () => {
    workspace();
    fireEvent.click(screen.getByRole("button", { name: "Workspace settings" }));
    fireEvent.change(screen.getByLabelText("Role title"), {
      target: { value: "  " },
    });
    expect(screen.getByRole("button", { name: /Save brief/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Role title"), {
      target: { value: "Frontend Engineer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save brief/ }));
    expect(JSON.parse(localStorage.getItem("sift.demo.role")).title).toBe(
      "Frontend Engineer",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your search brief has been saved.",
    );
  });

  it("shows an empty shortlist and keeps comparison unavailable", () => {
    localStorage.setItem("sift.demo.shortlist", "[]");
    workspace();
    fireEvent.click(screen.getByRole("button", { name: /My shortlist/ }));
    expect(
      main().getByRole("heading", {
        name: "Your next great hire starts here.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Compare shortlist/ }),
    ).toBeDisabled();
  });
});
