import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import HomeScreen from "./components/editorial/HomeScreen";
import LoadingScreen from "./components/editorial/LoadingScreen";
import WorkspaceScreen from "./components/editorial/WorkspaceScreen";
import AuthProvider, { useAuth } from "./auth/AuthProvider";
import AuthScreen from "./components/studio/AuthScreen";
import RoleScreen from "./components/studio/RoleScreen";
import StudioFlow from "./components/studio/StudioFlow";

const ForensicsApp = lazy(() => import("./ForensicsApp"));
export function routeForLocation(location) {
  const namedRoute = {
    "#home": "home",
    "#login": "login",
    "#roles": "roles",
    "#intake": "intake",
    "#processing": "processing",
    "#results": "results",
    "#workspace": "workspace",
    "#review": "review",
  }[location.hash];
  if (namedRoute) return namedRoute;
  // Let the existing Supabase client consume sign-in callbacks before changing the URL.
  if (
    /^#(?:access_token|refresh_token|error)=/.test(location.hash) ||
    new URLSearchParams(location.search).has("code")
  )
    return "login";
  return "login";
}
const currentRoute = () => routeForLocation(window.location);

function AppContent() {
  const auth = useAuth();
  const [screen, setScreen] = useState(() =>
    window.location.hash || window.location.search ? currentRoute() : "loading",
  );
  const [destination, setDestination] = useState("login");
  const [workflow, setWorkflow] = useState(() => {
    try {
      return sessionStorage.getItem("sift.studio.workflow") === "recruiting"
        ? "recruiting"
        : "hackathon";
    } catch {
      return "hackathon";
    }
  });
  const [signOutError, setSignOutError] = useState("");

  const navigate = useCallback((next) => {
    window.location.hash = next;
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const syncRoute = () => setScreen(currentRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  const start = useCallback(() => {
    navigate("login");
  }, [navigate]);
  const finishLoading = useCallback(
    () => navigate(destination),
    [destination, navigate],
  );
  const authenticated = useCallback(
    () =>
      navigate(
        ["intake", "processing", "results", "review"].includes(screen)
          ? screen
          : "roles",
      ),
    [screen, navigate],
  );
  const signOut = async () => {
    try {
      await auth.signOut();
      setSignOutError("");
      navigate("login");
    } catch (error) {
      setSignOutError(error.message);
    }
  };

  if (screen === "loading")
    return (
      <LoadingScreen onComplete={finishLoading} destination={destination} />
    );
  if (screen === "home")
    return (
      <HomeScreen
        onStartShortlist={start}
        onOpenForensics={() => navigate("review")}
      />
    );
  if (
    screen === "login" ||
    (["roles", "review", "intake", "processing", "results"].includes(screen) &&
      !auth.identity)
  )
    return (
      <AuthScreen
        onAuthenticated={authenticated}
        onHome={() => navigate("home")}
      />
    );
  if (screen === "roles")
    return (
      <>
        <RoleScreen
          identity={auth.identity}
          onHome={() => navigate("home")}
          onSignOut={signOut}
          onSelect={(next) => {
            setWorkflow(next);
            try {
              sessionStorage.setItem("sift.studio.workflow", next);
            } catch {
              /* The current role still works without browser storage. */
            }
            navigate("intake");
          }}
        />
        {signOutError && <p role="alert">{signOutError}</p>}
      </>
    );
  if (["intake", "processing", "results"].includes(screen))
    return (
      <>
        <StudioFlow
          key={workflow + ":" + (auth.session?.user?.id || auth.identity.mode)}
          workflow={workflow}
          screen={screen}
          navigate={navigate}
          onSignOut={signOut}
        />
        {signOutError && <p role="alert">{signOutError}</p>}
      </>
    );
  if (screen === "workspace")
    return (
      <WorkspaceScreen
        onBack={() => navigate("home")}
        onOpenForensics={() => navigate("review")}
      />
    );

  return (
    <div className="live-review min-h-screen bg-[#0B0F17] text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <button
          className="flex items-center gap-2 text-sm text-slate-300"
          onClick={() => navigate("results")}
        >
          <ArrowLeft size={16} /> Back to evaluation
        </button>
      </div>
      <Suspense
        fallback={
          <p className="p-8 text-center" role="status">
            Opening your review workspace…
          </p>
        }
      >
        <ForensicsApp initialWorkflow={workflow} />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
