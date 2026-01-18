import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build bump to force a new preview bundle after secrets/config changes.
// NOTE: Safe to keep; does not affect runtime behavior.
const BUILD_ID = "2026-01-18T02:46:00Z" as const;

const isDebug = (() => {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("debug");
    return sp.has("debug") && (v === null || v === "" || v === "1" || v === "true");
  } catch {
    return false;
  }
})();

if (isDebug) {
  // eslint-disable-next-line no-console
  console.log("[debug] build", BUILD_ID, "mode", import.meta.env.MODE, "DEV", import.meta.env.DEV);
  // eslint-disable-next-line no-console
  console.log(
    "[debug] VITE keys",
    Object.keys(import.meta.env).filter((k) => k.startsWith("VITE_"))
  );
}

createRoot(document.getElementById("root")!).render(<App />);
