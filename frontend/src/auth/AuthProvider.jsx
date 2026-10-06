import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { request } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const readMode = () => {
  try {
    return sessionStorage.getItem("sift.studio.mode");
  } catch {
    return null;
  }
};
const saveMode = (mode) => {
  try {
    mode
      ? sessionStorage.setItem("sift.studio.mode", mode)
      : sessionStorage.removeItem("sift.studio.mode");
  } catch {
    /* Session state remains available. */
  }
};

export default function AuthProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState(readMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true,
      subscription;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setLoading(true);
    setError("");
    request("/api/config", { signal: controller.signal })
      .then(async (settings) => {
        if (!alive) return;
        setConfig(settings);
        if (
          settings.authMode === "supabase" &&
          settings.supabaseUrl &&
          settings.supabaseAnonKey
        ) {
          const authClient = createClient(
            settings.supabaseUrl,
            settings.supabaseAnonKey,
          );
          setClient(authClient);
          subscription = authClient.auth.onAuthStateChange((_event, next) => {
            if (!alive) return;
            setSession(next);
            if (next) {
              setMode(null);
              saveMode(null);
            }
          }).data.subscription;
          const { data, error: sessionError } =
            await authClient.auth.getSession();
          if (sessionError) throw sessionError;
          if (alive) setSession(data.session);
        }
      })
      .catch((reason) => {
        if (alive)
          setError(
            reason.name === "AbortError"
              ? "The connection timed out. Try again when your SIFT service is available."
              : "Your sign-in service is unavailable. Retry the connection or explore the demo.",
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
      subscription?.unsubscribe();
    };
  }, [attempt]);
  const enterDemo = useCallback(() => {
    setMode("demo");
    saveMode("demo");
  }, []);
  const enterLocal = useCallback(() => {
    if (config?.authMode === "local") {
      setMode("local");
      saveMode("local");
    }
  }, [config]);
  const signOut = useCallback(async () => {
    if (session && client) {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
    }
    setSession(null);
    setMode(null);
    saveMode(null);
  }, [session, client]);
  const identity = session
    ? {
        mode: "live",
        name:
          session.user?.user_metadata?.full_name ||
          session.user?.email?.split("@")[0] ||
          "Your workspace",
        email: session.user?.email,
      }
    : mode === "demo"
      ? { mode: "demo", name: "Demo explorer" }
      : mode === "local" && config?.authMode === "local"
        ? { mode: "local", name: "Local reviewer" }
        : null;
  return (
    <AuthContext.Provider
      value={{
        config,
        client,
        session,
        identity,
        loading,
        error,
        enterDemo,
        enterLocal,
        signOut,
        retry: () => setAttempt((current) => current + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
