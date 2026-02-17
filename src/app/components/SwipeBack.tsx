"use client";

import { useEffect, useMemo, useRef } from "react";
import { ReadonlyURLSearchParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SwipeBackProps, SnapshotItem } from "@/app/types/swipeback";

const STACK_KEY = "__swipeback_stack_v1__";
const STACK_LIMIT = 10;

function isTextInput(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return (el as HTMLElement).isContentEditable === true;
}

function getElById(id?: string) {
  if (!id) return null;
  return document.getElementById(id) as HTMLElement | null;
}

function readStack(): SnapshotItem[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const arr = raw ? (JSON.parse(raw) as SnapshotItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeStack(stack: SnapshotItem[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-STACK_LIMIT)));
  } catch {
    // ignore
  }
}

function peekStack(): SnapshotItem | null {
  const s = readStack();
  return s.length ? s[s.length - 1] : null;
}

function pushStack(item: SnapshotItem) {
  const s = readStack();
  // กัน push ซ้ำ ๆ ถ้าหน้าเดิมเหมือนกัน
  const top = s[s.length - 1];
  if (top?.key === item.key) return;
  s.push(item);
  writeStack(s);
}

function popIfTopMatches(key: string) {
  const s = readStack();
  const top = s[s.length - 1];
  if (top?.key === key) {
    s.pop();
    writeStack(s);
  }
}

function buildRouteKey(pathname: string, searchParams: ReadonlyURLSearchParams | null) {
  const q = searchParams?.toString();
  return q ? `${pathname}?${q}` : pathname;
}

function renderBackLayer(backEl: HTMLElement, snap: SnapshotItem | null) {
  if (!snap) {
    backEl.innerHTML = "";
    backEl.style.opacity = "0";
    return;
  }

  // content + overlay (ไว้ทำ dim fade)
  backEl.innerHTML = `
    <div data-swipeback-backcontent style="position:absolute; inset:0; will-change: transform;">
      ${snap.html}
    </div>
    <div data-swipeback-overlay style="position:absolute; inset:0;"></div>
  `;
  backEl.style.opacity = "0"; // ซ่อนไว้ก่อน เรียกตอนเริ่มปัดค่อยโชว์
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
  stageId = "swipeback-stage",

  backParallaxRatio = 0.3,
  backOverlayMaxOpacity = 0.12,
}: SwipeBackProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeKey = useMemo(() => buildRouteKey(pathname, searchParams), [pathname, searchParams]);

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

    raf: 0 as number | 0,
    queuedX: 0,

    backSnap: null as SnapshotItem | null,

    origFrontTransform: "",
    origFrontTransition: "",
    origFrontWillChange: "",

    // คุม back layer
    backScrollY: 0,
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
      stageId,
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
      stageId,
      backParallaxRatio,
      backOverlayMaxOpacity,
    ]
  );

  // ✅ sync back layer ทุกครั้งที่ route เปลี่ยน
  useEffect(() => {
    const backEl = getElById(opts.backId);
    if (!backEl) return;

    // ถ้ากลับมาหน้าเดิมที่ snapshot.top ตรงกัน => pop (ใช้กับ back/gesture)
    popIfTopMatches(routeKey);

    const snap = peekStack();
    renderBackLayer(backEl, snap);
  }, [routeKey, opts.backId]);

  // ✅ patch history.pushState เพื่อ capture snapshot ก่อน “ไปหน้าใหม่”
  useEffect(() => {
    const front = getElById(opts.targetId);
    if (!front) return;

    const stage = getElById(opts.stageId);
    const backEl = getElById(opts.backId);
    if (!stage || !backEl) return;

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    const tryCapture = (urlLike: any) => {
      try {
        const curKey = routeKeyRef.current;

        if (!urlLike) return;
        const url = typeof urlLike === "string" ? new URL(urlLike, location.href) : new URL(String(urlLike), location.href);
        if (url.origin !== location.origin) return;

        const nextKey = url.pathname + url.search;
        if (nextKey === curKey) return;

        // เก็บ snapshot ของ “หน้าปัจจุบัน” ไว้เป็น back ของหน้าถัดไป
        const snap: SnapshotItem = {
          key: curKey,
          html: front.innerHTML,
          scrollY: window.scrollY || 0,
          ts: Date.now(),
        };
        pushStack(snap);

        // preload back layer ให้พร้อม (optional)
        renderBackLayer(backEl, peekStack());
      } catch {
        // ignore
      }
    };

    history.pushState = function (state: any, title: string, url?: string | URL | null) {
      tryCapture(url);
      // @ts-ignore
      return origPush.apply(this, arguments);
    } as any;

    history.replaceState = function (state: any, title: string, url?: string | URL | null) {
      // โดยมาก replaceState คือปรับ url แบบ shallow ไม่อยาก push snapshot
      // ถ้าอยากให้ replace ก็ capture ให้เปลี่ยนเป็น tryCapture(url)
      // @ts-ignore
      return origReplace.apply(this, arguments);
    } as any;

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, [opts.targetId, opts.backId, opts.stageId]);

  useEffect(() => {
    if (disabled) return;

    const s = stateRef.current;
    const front = getElById(opts.targetId);
    const backEl = getElById(opts.backId);
    if (!front || !backEl) return;

    s.origFrontTransform = front.style.transform || "";
    s.origFrontTransition = front.style.transition || "";
    s.origFrontWillChange = front.style.willChange || "";

    const width = () => Math.max(1, window.innerWidth || 1);

    const getBackParts = () => {
      const content = backEl.querySelector("[data-swipeback-backcontent]") as HTMLElement | null;
      const overlay = backEl.querySelector("[data-swipeback-overlay]") as HTMLElement | null;
      return { content, overlay };
    };

    const showBackLayer = (snap: SnapshotItem) => {
      s.backSnap = snap;
      s.backScrollY = snap.scrollY || 0;

      backEl.style.opacity = "1";
      const { content, overlay } = getBackParts();
      if (content) {
        // เริ่มต้นให้หน้าเก่าอยู่ “เยื้องซ้าย” นิดๆ
        const x = -width() * opts.backParallaxRatio;
        content.style.transform = `translate3d(${x}px, ${-s.backScrollY}px, 0)`;
      }
      if (overlay) {
        overlay.style.background = `rgba(0,0,0,${opts.backOverlayMaxOpacity})`;
        overlay.style.opacity = "1";
      }
    };

    const hideBackLayer = () => {
      backEl.style.opacity = "0";
      s.backSnap = null;
    };

    const setProgress = (dx: number) => {
      const w = width();
      const p = Math.max(0, Math.min(1, dx / w));

      // front ตามนิ้ว
      const clamped = Math.max(0, Math.min(dx, w));
      front.style.transition = "none";
      front.style.transform = `translate3d(${clamped}px, 0, 0)`;

      // back ค่อยๆ เลื่อนเข้ามา + overlay fade out
      const { content, overlay } = getBackParts();
      if (content) {
        const x = -w * opts.backParallaxRatio * (1 - p);
        content.style.transform = `translate3d(${x}px, ${-s.backScrollY}px, 0)`;
      }
      if (overlay) {
        overlay.style.opacity = String(1 - p);
      }
    };

    const animateFrontTo = (x: number, onDone?: () => void) => {
      const w = width();
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

    const animateBackToRest = (rest: boolean) => {
      const w = width();
      const { content, overlay } = getBackParts();
      if (content) {
        const x = rest ? -w * opts.backParallaxRatio : 0;
        content.style.transition = `transform ${opts.animDurationMs}ms ${opts.animEasing}`;
        content.style.transform = `translate3d(${x}px, ${-s.backScrollY}px, 0)`;
        window.setTimeout(() => (content.style.transition = "none"), opts.animDurationMs + 10);
      }
      if (overlay) {
        overlay.style.transition = `opacity ${opts.animDurationMs}ms ${opts.animEasing}`;
        overlay.style.opacity = rest ? "1" : "0";
        window.setTimeout(() => (overlay.style.transition = "none"), opts.animDurationMs + 10);
      }
    };

    const queueProgress = (dx: number) => {
      s.queuedX = dx;
      if (s.raf) return;
      s.raf = window.requestAnimationFrame(() => {
        s.raf = 0;
        setProgress(s.queuedX);
      });
    };

    const resetToZero = () => {
      animateFrontTo(0, () => {
        front.style.transition = "none";
        front.style.willChange = "";
        hideBackLayer();
      });
      animateBackToRest(true);
    };

    const commitBack = () => {
      const outX = width();
      animateBackToRest(false);
      animateFrontTo(outX, () => {
        router.back();
      });
    };

    const cancelTracking = () => {
      s.tracking = false;
      s.dragging = false;
      s.pointerId = -1;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      resetToZero();
    };

    const canSwipeBackNow = () => {
      const snap = peekStack();
      return !!snap;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (disabled) return;
      if (!e.isPrimary) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      // ✅ ล็อค: ถ้าไม่มีหน้าให้ย้อน (ไม่มี snapshot) => ไม่ให้เริ่ม gesture
      if (!canSwipeBackNow()) return;

      // edge mode (ถ้าต้องการบังคับขอบซ้าย)
      if (opts.edgePx >= 0 && e.clientX > opts.edgePx) return;

      const targetEl = e.target as Element | null;
      if (isTextInput(targetEl)) return;
      if (targetEl?.closest?.("[data-no-swipeback]")) return;

      const snap = peekStack();
      if (!snap) return;

      s.tracking = true;
      s.dragging = false;
      s.pointerId = e.pointerId;

      s.startX = e.clientX;
      s.startY = e.clientY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.startT = performance.now();

      front.style.willChange = "transform";
      front.style.transition = "none";

      // ✅ โชว์หน้าเก่าไว้ข้างหลังทันที
      showBackLayer(snap);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      s.lastX = e.clientX;
      s.lastY = e.clientY;

      if (Math.abs(dy) > opts.maxVerticalPx && Math.abs(dy) > Math.abs(dx)) {
        cancelTracking();
        return;
      }
      if (dx < -10) {
        cancelTracking();
        return;
      }

      if (!s.dragging) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) s.dragging = true;
        else return;
      }

      e.preventDefault();
      queueProgress(Math.max(0, dx));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const dt = performance.now() - s.startT;
      const dx = s.lastX - s.startX;
      const dy = s.lastY - s.startY;

      s.tracking = false;

      if (!s.dragging) {
        resetToZero();
        return;
      }

      if (dt <= opts.maxTimeMs && dx >= opts.minDistancePx && Math.abs(dy) <= opts.maxVerticalPx) {
        commitBack();
      } else {
        resetToZero();
      }

      s.dragging = false;
      s.pointerId = -1;
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;
      cancelTracking();
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);

      front.style.transform = s.origFrontTransform;
      front.style.transition = s.origFrontTransition;
      front.style.willChange = s.origFrontWillChange;

      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [router, disabled, opts]);

  return null;
}
