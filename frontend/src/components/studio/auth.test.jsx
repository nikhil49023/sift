// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AuthScreen from "./AuthScreen";
import RoleScreen from "./RoleScreen";

const state = vi.hoisted(() => ({ auth: null }));
vi.mock("../../auth/AuthProvider", () => ({ useAuth: () => state.auth }));
beforeEach(() => {
  state.auth = {
    identity: null,
    loading: false,
    error: "",
    config: null,
    enterDemo: vi.fn(),
    enterLocal: vi.fn(),
    retry: vi.fn(),
    client: {
      auth: {
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        signUp: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  };
});
afterEach(cleanup);
const access = (props = {}) =>
  render(<AuthScreen onAuthenticated={vi.fn()} onHome={vi.fn()} {...props} />);
const credentials = () => {
  fireEvent.change(screen.getByLabelText("Work email"), {
    target: { value: "reviewer@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "a-valid-password" },
  });
};

describe("account access", () => {
  it("uses the real password sign-in API and never navigates on a failed login", async () => {
    const onAuthenticated = vi.fn();
    state.auth.client.auth.signInWithPassword.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });
    access({ onAuthenticated });
    credentials();
    fireEvent.click(
      screen.getByRole("button", { name: /Log in to your workspace/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid login credentials",
      ),
    );
    expect(state.auth.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "reviewer@example.com",
      password: "a-valid-password",
    });
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
  it("keeps unconfirmed sign-ups on the confirmation screen", async () => {
    const onAuthenticated = vi.fn();
    access({ onAuthenticated });
    fireEvent.click(screen.getByRole("tab", { name: "Sign up" }));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "SIFT Reviewer" },
    });
    credentials();
    fireEvent.click(
      screen.getByRole("button", { name: "Create your account" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Check your email"),
    );
    expect(state.auth.client.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: { full_name: "SIFT Reviewer" },
        }),
      }),
    );
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
  it("calls Google OAuth with an application callback", async () => {
    access();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    await waitFor(() =>
      expect(state.auth.client.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      }),
    );
  });
  it("explains missing auth configuration and keeps demo entry explicit", async () => {
    state.auth.client = null;
    const onAuthenticated = vi.fn();
    access({ onAuthenticated });
    credentials();
    fireEvent.click(
      screen.getByRole("button", { name: /Log in to your workspace/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "connected SIFT authentication service",
      ),
    );
    expect(onAuthenticated).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /Explore the interactive demo/ }),
    );
    expect(state.auth.enterDemo).toHaveBeenCalledOnce();
  });
  it("moves to role selection only after an authenticated identity exists", () => {
    const onAuthenticated = vi.fn();
    const view = access({ onAuthenticated });
    expect(onAuthenticated).not.toHaveBeenCalled();
    state.auth.identity = { mode: "live", name: "Reviewer" };
    view.rerender(
      <AuthScreen onAuthenticated={onAuthenticated} onHome={vi.fn()} />,
    );
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });
});
describe("workspace choice", () => {
  it("requires a role and sends the selected workflow", () => {
    const onSelect = vi.fn();
    render(
      <RoleScreen
        identity={{ mode: "demo", name: "Explorer" }}
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Continue to your workspace/ }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Hackathon organizer/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to hackathon/ }),
    );
    expect(onSelect).toHaveBeenCalledWith("hackathon");
  });
});
