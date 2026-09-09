"use client";

// Registers the offline service worker (public/sw.js) once the page has
// loaded. Kept tiny and side-effect-only. The SW itself decides what to cache;
// see public/sw.js for the offline behaviour contract.

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Dev servers hot-reload modules; a SW there only gets in the way.
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;

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
