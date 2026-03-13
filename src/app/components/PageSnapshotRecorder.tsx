"use client";

import { useEffect, useRef, type RefObject } from "react";
import html2canvas from "html2canvas";
import { setPageSnapshot } from "@/app/lib/page-snapshot-store";

type PageSnapshotRecorderProps = {
  pathname: string;
  targetRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  delay?: number;
};

export default function PageSnapshotRecorder({
  pathname,
  targetRef,
  enabled = true,
  delay = 250,
}: PageSnapshotRecorderProps) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (cancelled || runningRef.current) return;

      const el = targetRef.current;
      if (!el) return;

      runningRef.current = true;

      try {
        const canvas = await html2canvas(el, {
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scale: Math.min(window.devicePixelRatio || 1, 1.5),
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: window.innerHeight,
          scrollX: 0,
          scrollY: -window.scrollY,
          ignoreElements: (node) =>
            node instanceof HTMLElement &&
            node.hasAttribute("data-snapshot-ignore"),
        });

        if (cancelled) return;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
        setPageSnapshot(pathname, dataUrl);
      } catch {
        // ignore
      } finally {
        runningRef.current = false;
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, targetRef, enabled, delay]);

  return null;
}