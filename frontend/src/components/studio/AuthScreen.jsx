import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Sparkles,
  Check,
  Fingerprint,
  FileText,
  Users,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { StudioHeader, StudioFooter } from "./StudioChrome";

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32 14.9l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.9A12 12 0 0 1 32 14.9l5.7-5.7A20 20 0 0 0 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.2-5.3A12 12 0 0 1 12.7 28L6.1 33A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.3 5.3A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
    </svg>
  );
}

export default function AuthScreen({ onAuthenticated, onHome }) {
  const auth = useAuth();
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (auth.identity) onAuthenticated();
  }, [auth.identity?.mode, onAuthenticated]);
  const perform = async (action) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (!auth.client)
        throw new Error(
          auth.loading
            ? "Connecting to your sign-in service. Please try again in a moment."
            : "Sign-in needs your connected SIFT authentication service. Retry the connection or explore the interactive demo.",
        );
      await action(auth.client);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (event) => {
    event.preventDefault();
    perform(async (client) => {
      const result =
        tab === "signup"
          ? await client.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: { full_name: name.trim() },
                emailRedirectTo:
                  window.location.origin + window.location.pathname,
              },
            })
          : await client.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
      if (result.error) throw result.error;
      if (tab === "signup" && !result.data.session)
        setMessage(
          "Check your email to confirm your account, then come back to sign in.",
        );
    });
  };
  return (
    <div className="studio auth-screen">
      <StudioHeader onHome={onHome} />
      <main className="auth-layout">
        <section className="auth-story">
          <div className="story-caption">
            <span className="studio-kicker">
              FOR THE PEOPLE WHO SEE POTENTIAL
            </span>
            <span className="story-edition">S / 001</span>
          </div>
          <h1>
            Good people.
            <br />
            Bold ideas.
            <br />
            <em>A clearer view.</em>
          </h1>
          <p>
            Find the builders behind the résumé.
            <br />
            The thinking behind the project.
            <br />
            And the evidence behind your next yes.
          </p>
          <div className="signal-art" aria-hidden="true">
            <div className="signal-orbit outer" />
            <div className="signal-orbit inner" />
            <div className="art-core">
              <Fingerprint size={45} strokeWidth={1} />
              <span>HUMAN POTENTIAL</span>
            </div>
            <div className="orbit-note note-work">
              <FileText size={16} />
              <div>
                <strong>The work</strong>
                <span>Connect the evidence</span>
              </div>
              <i />
            </div>
            <div className="orbit-note note-person">
              <Users size={16} />
              <div>
                <strong>The people</strong>
                <span>Find the possibility</span>
              </div>
              <i />
            </div>
            <div className="orbit-note note-decision">
              <Sparkles size={16} />
              <div>
                <strong>Your next yes</strong>
                <span>Make it a considered one</span>
              </div>
              <i />
            </div>
            <span className="orbit-asterisk">✳</span>
          </div>
          <div className="story-bottom">
            <span>
              <Check size={13} /> Evidence-led evaluation
            </span>
            <span>
              <Check size={13} /> Human-led decisions
            </span>
          </div>
        </section>
        <section className="auth-form-side" aria-label="Account access">
          <div className="auth-form-wrap">
            <span className="studio-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>
              {tab === "login"
                ? "Welcome to SIFT."
                : "Make room for possibility."}
            </h2>
            <p>
              {tab === "login"
                ? "Sign in. See the whole story. Choose with confidence."
                : "Create your account and build a better way to choose."}
            </p>
            <div
              className="auth-tabs"
              role="tablist"
              aria-label="Account access mode"
            >
              <button
                role="tab"
                aria-selected={tab === "login"}
                onClick={() => {
                  setTab("login");
                  setError("");
                  setMessage("");
                }}
              >
                Log in
              </button>
              <button
                role="tab"
                aria-selected={tab === "signup"}
                onClick={() => {
                  setTab("signup");
                  setError("");
                  setMessage("");
                }}
              >
                Sign up
              </button>
            </div>
            <form onSubmit={submit}>
              {tab === "signup" && (
                <label className="studio-field">
                  Full name
                  <input
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="What should we call you?"
                  />
                </label>
              )}
              <label className="studio-field">
                Work email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@yourteam.com"
                />
              </label>
              <label className="studio-field">
                Password
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={tab === "signup" ? 8 : 1}
                    maxLength={200}
                    autoComplete={
                      tab === "signup" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      tab === "signup"
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {error && (
                <p className="studio-error" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="studio-success" role="status">
                  {message}
                </p>
              )}
              <button
                className="studio-button primary auth-submit"
                disabled={busy || (tab === "signup" && !name.trim())}
              >
                {busy ? (
                  <LoaderCircle className="studio-spin" size={17} />
                ) : null}
                {busy
                  ? "One moment…"
                  : tab === "login"
                    ? "Log in to your workspace"
                    : "Create your account"}
                <ArrowRight size={17} />
              </button>
            </form>
            <div className="auth-divider">
              <span />
              or continue with
              <span />
            </div>
            <button
              className="studio-button google-button"
              disabled={busy}
              onClick={() =>
                perform(async (client) => {
                  const { error: googleError } =
                    await client.auth.signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo:
                          window.location.origin + window.location.pathname,
                      },
                    });
                  if (googleError) throw googleError;
                })
              }
            >
              <GoogleMark />
              {tab === "signup"
                ? "Sign up with Google"
                : "Continue with Google"}
              <ArrowUpRight size={15} />
            </button>
            <p className="auth-security">
              <LockKeyhole size={12} /> A private space for considered
              decisions.
            </p>
            {auth.error && (
              <div className="auth-connection">
                <span>{auth.error}</span>
                <button onClick={auth.retry}>
                  <RefreshCw size={12} />
                  Retry connection
                </button>
              </div>
            )}
            {auth.config?.authMode === "local" && (
              <button className="local-access" onClick={auth.enterLocal}>
                Open local development workspace <ArrowRight size={13} />
              </button>
            )}
            <div className="auth-demo">
              <span>Want to take a look first?</span>
              <button onClick={auth.enterDemo}>
                Explore the interactive demo <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>
      <StudioFooter />
    </div>
  );
}
