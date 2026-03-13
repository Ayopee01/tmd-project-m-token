"use client";

import { useEffect, useState } from "react";

export default function useCanGoBack() {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const update = () => {
      setCanGoBack(window.history.length > 1);
    };

    update();
    window.addEventListener("popstate", update);

    return () => window.removeEventListener("popstate", update);
  }, []);

  return canGoBack;
}