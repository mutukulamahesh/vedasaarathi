"use client";

// Registers the offline service worker (public/sw.js) once the page has
// loaded. Kept tiny and side-effect-only. The SW itself decides what to cache;
// see public/sw.js for the offline behaviour contract.

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Only the Vite dev server hot-reloads modules; a SW there gets in the way.
    // The @vite/client script is present ONLY in dev. In a production build
    // (`vinext start` / deployed) the SW registers even on localhost, so the
    // offline flow is testable end to end.
    const isViteDev =
      typeof document !== "undefined" &&
      document.querySelector('script[src*="/@vite/client"], script[src*="@vite/client"]') !== null;
    if (isViteDev) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is an enhancement; never block the app on it */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
