"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SwipeBackProps, SnapshotItem } from "@/app/types/swipeback";

const STACK_KEY = "__swipeback_stack_v1__";
const STACK_LIMIT = 8;

function isTextInput(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return (el as HTMLElement).isContentEditable === true;
}

function byId(id?: string) {
  return id ? (document.getElementById(id) as HTMLElement | null) : null;
}

function safeReadStack(): SnapshotItem[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const arr = raw ? (JSON.parse(raw) as SnapshotItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function safeWriteStack(stack: SnapshotItem[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-STACK_LIMIT)));
  } catch {}
}

function peekStack(): SnapshotItem | null {
  const s = safeReadStack();
  return s.length ? s[s.length - 1] : null;
}

function pushStack(item: SnapshotItem) {
  const s = safeReadStack();
  const top = s[s.length - 1];
  if (top?.key === item.key) return;
  s.push(item);
  safeWriteStack(s);
}

function popIfTopMatches(key: string) {
  const s = safeReadStack();
  const top = s[s.length - 1];
  if (top?.key === key) {
    s.pop();
    safeWriteStack(s);
  }
}

function getRouteKey(pathname: string) {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return `${pathname}${search || ""}`;
}

function viewportWidthStable() {
  // ✅ นิ่งกว่า innerWidth ในมือถือ (address bar ยุบ/ขยาย)
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const w =
    vv?.width ??
    document.documentElement?.clientWidth ??
    window.innerWidth ??
    1;
  return Math.max(1, Math.round(w));
}

function ensureBackHTML(backEl: HTMLElement, snap: SnapshotItem | null, overlayMax: number) {
  if (!snap) {
    backEl.innerHTML = "";
    backEl.style.opacity = "0";
    return;
  }

  backEl.innerHTML = `
    <div data-swipeback-backcontent style="position:absolute; inset:0; will-change: transform;">
      ${snap.html}
    </div>
    <div data-swipeback-overlay style="position:absolute; inset:0; background: rgba(0,0,0,${overlayMax}); opacity: 1;"></div>
  `;
  backEl.style.opacity = "0";
}

export default function SwipeBack({
  disabled = false,
  edgePx = -1,

  minDistancePx = 70,
  maxVerticalPx = 35,
  maxTimeMs = 500,

  animDurationMs = 220,
  animEasing = "cubic-bezier(0.2, 0.8, 0.2, 1)",

  targetId = "swipeback-root",
  backId = "swipeback-back",

  backParallaxRatio = 0.3,
  backOverlayMaxOpacity = 0.12,
}: SwipeBackProps) {
  const router = useRouter();
  const pathname = usePathname();

  const routeKey = useMemo(() => getRouteKey(pathname), [pathname]);

  const routeKeyRef = useRef(routeKey);
  useEffect(() => {
    routeKeyRef.current = routeKey;
  }, [routeKey]);

  const stateRef = useRef({
    tracking: false,
    dragging: false,
    pointerId: -1,

    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startT: 0,

    // ✅ width ล็อคตอนเริ่ม gesture
    gestureW: 1,

    // ✅ velocity
    lastMoveT: 0,
    lastMoveX: 0,
    vX: 0, // px/ms

    raf: 0 as number | 0,
    queuedX: 0,

    snap: null as SnapshotItem | null,
    snapScrollY: 0,

    origTransform: "",
    origTransition: "",
    origWillChange: "",
  });

  const opts = useMemo(
    () => ({
      edgePx,
      minDistancePx,
      maxVerticalPx,
      maxTimeMs,
      animDurationMs,
      animEasing,
      targetId,
      backId,
      backParallaxRatio,
      backOverlayMaxOpacity,
    }),
    [
      edgePx,
      minDistancePx,
      maxVerticalPx,
      maxTimeMs,
      animDurationMs,
      animEasing,
      targetId,
      backId,
      backParallaxRatio,
      backOverlayMaxOpacity,
    ]
  );

  // ✅ sync stack / back template เมื่อ route เปลี่ยน
  useEffect(() => {
    const backEl = byId(opts.backId);
    if (!backEl) return;

    popIfTopMatches(routeKey);
    ensureBackHTML(backEl, peekStack(), opts.backOverlayMaxOpacity);
  }, [routeKey, opts.backId, opts.backOverlayMaxOpacity]);

  // ✅ capture snapshot ก่อน pushState (ตามของคุณ)
  useEffect(() => {
    const front = byId(opts.targetId);
    const backEl = byId(opts.backId);
    if (!front || !backEl) return;

    const origPush = history.pushState;

    const tryCapture = (urlLike: any) => {
      try {
        if (!urlLike) return;

        const curKey = routeKeyRef.current;
        const url =
          typeof urlLike === "string"
            ? new URL(urlLike, location.href)
            : new URL(String(urlLike), location.href);

        if (url.origin !== location.origin) return;

        const nextKey = `${url.pathname}${url.search}`;
        if (nextKey === curKey) return;

        pushStack({
          key: curKey,
          html: front.innerHTML,
          scrollY: window.scrollY || 0,
          ts: Date.now(),
        });

        ensureBackHTML(backEl, peekStack(), opts.backOverlayMaxOpacity);
      } catch {}
    };

    history.pushState = function (state: any, title: string, url?: string | URL | null) {
      tryCapture(url);
      // @ts-ignore
      return origPush.apply(this, arguments);
    } as any;

    return () => {
      history.pushState = origPush;
    };
  }, [opts.targetId, opts.backId, opts.backOverlayMaxOpacity]);

  // ✅ HARD RESET ทุกครั้งที่ pathname เปลี่ยน (กันค้าง/หลุดขอบ)
  useEffect(() => {
    const s = stateRef.current;
    const front = byId(opts.targetId);
    const backEl = byId(opts.backId);
    if (!front || !backEl) return;

    s.tracking = false;
    s.dragging = false;
    s.pointerId = -1;

    if (s.raf) cancelAnimationFrame(s.raf);
    s.raf = 0;

    front.style.transition = "none";
    front.style.transform = "translate3d(0,0,0)";
    front.style.willChange = "";

    backEl.style.opacity = "0";
    s.snap = null;
  }, [pathname, opts.targetId, opts.backId]);

  useEffect(() => {
    if (disabled) return;

    const s = stateRef.current;
    const front = byId(opts.targetId);
    const backEl = byId(opts.backId);
    if (!front || !backEl) return;

    s.origTransform = front.style.transform || "";
    s.origTransition = front.style.transition || "";
    s.origWillChange = front.style.willChange || "";

    const parts = () => ({
      content: backEl.querySelector("[data-swipeback-backcontent]") as HTMLElement | null,
      overlay: backEl.querySelector("[data-swipeback-overlay]") as HTMLElement | null,
    });

    const canSwipe = () => !!peekStack();

    const showBack = (snap: SnapshotItem) => {
      s.snap = snap;
      s.snapScrollY = snap.scrollY || 0;

      ensureBackHTML(backEl, snap, opts.backOverlayMaxOpacity);
      backEl.style.opacity = "1";

      const { content, overlay } = parts();
      if (content) {
        const x = -s.gestureW * opts.backParallaxRatio;
        content.style.transform = `translate3d(${x}px, ${-s.snapScrollY}px, 0)`;
      }
      if (overlay) overlay.style.opacity = "1";
    };

    const hideBack = () => {
      backEl.style.opacity = "0";
      s.snap = null;
    };

    const setProgress = (dx: number) => {
      const w = s.gestureW;

      // ✅ clamp แข็ง ไม่ให้หลุดขอบ
      const clamped = Math.max(0, Math.min(dx, w));
      const p = clamped / w;

      front.style.transition = "none";
      front.style.transform = `translate3d(${clamped}px, 0, 0)`;

      const { content, overlay } = parts();
      if (content) {
        const x = -w * opts.backParallaxRatio * (1 - p);
        content.style.transform = `translate3d(${x}px, ${-s.snapScrollY}px, 0)`;
      }
      if (overlay) overlay.style.opacity = String(1 - p);
    };

    const animateFrontTo = (x: number, onDone?: () => void) => {
      const w = s.gestureW;
      const clamped = Math.max(0, Math.min(x, w));
      front.style.transition = `transform ${opts.animDurationMs}ms ${opts.animEasing}`;
      front.style.transform = `translate3d(${clamped}px, 0, 0)`;

      if (!onDone) return;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        front.removeEventListener("transitionend", finish);
        onDone();
      };
      front.addEventListener("transitionend", finish, { once: true });
      window.setTimeout(finish, opts.animDurationMs + 60);
    };

    const resetToZero = () => {
      animateFrontTo(0, () => {
        front.style.transition = "none";
        front.style.willChange = "";
        hideBack();
      });
    };

    const commitBack = () => {
      animateFrontTo(s.gestureW, () => router.back());
    };

    const queue = (dx: number) => {
      s.queuedX = dx;
      if (s.raf) return;
      s.raf = requestAnimationFrame(() => {
        s.raf = 0;
        setProgress(s.queuedX);
      });
    };

    const cancel = () => {
      s.tracking = false;
      s.dragging = false;
      s.pointerId = -1;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      resetToZero();
    };

    const onDown = (e: PointerEvent) => {
      if (disabled) return;
      if (!e.isPrimary) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      if (!canSwipe()) return;
      if (opts.edgePx >= 0 && e.clientX > opts.edgePx) return;

      const targetEl = e.target as Element | null;
      if (isTextInput(targetEl)) return;
      if (targetEl?.closest?.("[data-no-swipeback]")) return;

      const snap = peekStack();
      if (!snap) return;

      // ✅ ล็อค width ตอนเริ่ม gesture
      s.gestureW = viewportWidthStable();

      s.tracking = true;
      s.dragging = false;
      s.pointerId = e.pointerId;

      s.startX = e.clientX;
      s.startY = e.clientY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;

      s.startT = performance.now();
      s.lastMoveT = s.startT;
      s.lastMoveX = e.clientX;
      s.vX = 0;

      front.style.willChange = "transform";
      front.style.transition = "none";
      front.style.transform = "translate3d(0,0,0)";

      showBack(snap);
    };

    const onMove = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const now = performance.now();

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      // velocity
      const dt = Math.max(1, now - s.lastMoveT);
      s.vX = (e.clientX - s.lastMoveX) / dt;
      s.lastMoveT = now;
      s.lastMoveX = e.clientX;

      s.lastX = e.clientX;
      s.lastY = e.clientY;

      if (Math.abs(dy) > opts.maxVerticalPx && Math.abs(dy) > Math.abs(dx)) {
        cancel();
        return;
      }
      if (dx < -10) {
        cancel();
        return;
      }

      // ✅ เริ่ม drag เมื่อชัดเจน + กัน accidental
      if (!s.dragging) {
        const SLOP = 10;
        if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy) * 1.2) s.dragging = true;
        else return;
      }

      e.preventDefault();
      queue(Math.max(0, dx));
    };

    const onUp = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const now = performance.now();
      const totalT = now - s.startT;

      const dx = s.lastX - s.startX;
      const dy = s.lastY - s.startY;

      s.tracking = false;

      if (!s.dragging) {
        resetToZero();
        return;
      }

      // ✅ ตัดสินใจแบบแม่น: ระยะถึง หรือ velocity สูง (flick)
      const okDistance = dx >= opts.minDistancePx && Math.abs(dy) <= opts.maxVerticalPx;
      const okFlick = totalT <= opts.maxTimeMs && s.vX > 0.7 && dx > 20;

      if (okDistance || okFlick) commitBack();
      else resetToZero();

      s.dragging = false;
      s.pointerId = -1;
    };

    const onCancel = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;
      cancel();
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove as any);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);

      front.style.transform = s.origTransform;
      front.style.transition = s.origTransition;
      front.style.willChange = s.origWillChange;

      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [router, disabled, opts, pathname]);

  return null;
}
