import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import HomeScreen from "./components/editorial/HomeScreen";
import LoadingScreen from "./components/editorial/LoadingScreen";
import WorkspaceScreen from "./components/editorial/WorkspaceScreen";

const ForensicsApp = lazy(() => import("./ForensicsApp"));
export function routeForLocation(location) {
  const namedRoute = {
    "#home": "home",
    "#workspace": "workspace",
    "#review": "review",
  }[location.hash];
  if (namedRoute) return namedRoute;
  // Let the existing Supabase client consume sign-in callbacks before changing the URL.
  if (
    /^#(?:access_token|refresh_token|error)=/.test(location.hash) ||
    new URLSearchParams(location.search).has("code")
  )
    return "review";
  return "home";
}
const currentRoute = () => routeForLocation(window.location);

export default function App() {
  const [screen, setScreen] = useState(() =>
    currentRoute() !== "home" || window.location.hash
      ? currentRoute()
      : "loading",
  );
  const [destination, setDestination] = useState("home");

  const navigate = useCallback((next) => {
    window.location.hash =
      next === "home" ? "home" : next === "review" ? "review" : "workspace";
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const syncRoute = () => setScreen(currentRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  const start = useCallback(() => {
    setDestination("workspace");
    setScreen("loading");
  }, []);
  const finishLoading = useCallback(
    () => navigate(destination),
    [destination, navigate],
  );

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
          onClick={() => navigate("workspace")}
        >
          <ArrowLeft size={16} /> Back to shortlist
        </button>
      </div>
      <Suspense
        fallback={
          <p className="p-8 text-center" role="status">
            Opening your review workspace…
          </p>
        }
      >
        <ForensicsApp />
      </Suspense>
    </div>
  );
}
