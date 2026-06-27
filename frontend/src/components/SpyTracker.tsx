"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function SpyTracker() {
  const pathname = usePathname();
  const trackedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // Only track once per path load to prevent spam
    if (!pathname || trackedRef.current[pathname]) return;

    trackedRef.current[pathname] = true;

    // Extract identity from token if exists
    let identity = "Anonymous";
    try {
      const token = localStorage.getItem("mandorhub_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        identity = `${payload.role || "user"}:${payload.sub || payload.phone || "unknown"}`;
      }
    } catch (e) {
      // Ignore token parsing errors
    }

    // Send silent tracking request
    const userAgent = `[${identity}] ${navigator.userAgent}`;
    fetchApi("/spy/track", {
      method: "POST",
      body: JSON.stringify({
        path: pathname,
        user_agent: userAgent
      })
    }).catch(() => {
      // Ignore errors silently (spy shouldn't break the app)
    });
  }, [pathname]);

  return null; // Invisible component
}
