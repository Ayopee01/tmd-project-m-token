"use client";

import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
};

export function useParallaxVars<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: Options = {}
) {
  const { enabled = true } = options;

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
    sy: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // ลด motion หากผู้ใช้ตั้งค่า reduce motion
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const apply = () => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;

      const mx = ((lastRef.current.x / w) - 0.5) * 2; // -1..1
      const my = ((lastRef.current.y / h) - 0.5) * 2; // -1..1
      const sy = lastRef.current.sy;

      el.style.setProperty("--mx", reduceMotion ? "0" : mx.toFixed(4));
      el.style.setProperty("--my", reduceMotion ? "0" : my.toFixed(4));
      el.style.setProperty("--sy", `${sy}px`);
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        apply();
      });
    };

    const onScroll = () => {
      lastRef.current.sy = window.scrollY || 0;
      schedule();
    };

    const onMove = (e: PointerEvent) => {
      lastRef.current.x = e.clientX;
      lastRef.current.y = e.clientY;
      schedule();
    };

    // init
    lastRef.current.sy = window.scrollY || 0;
    apply();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [ref, enabled]);
}
