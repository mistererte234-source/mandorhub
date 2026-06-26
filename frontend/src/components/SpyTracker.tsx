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

    // Send silent tracking request
    const userAgent = navigator.userAgent;
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
