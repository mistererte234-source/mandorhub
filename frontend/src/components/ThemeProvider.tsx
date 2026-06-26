"use client";

import { useEffect, useState } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("mandorhub-theme") || "theme-default";
    document.documentElement.className = savedTheme;
  }, []);

  if (!mounted) {
    // To prevent hydration mismatch, we can just return children, 
    // but the theme class won't be there on first paint. That's fine for this app.
    return <>{children}</>;
  }

  return <>{children}</>;
}
