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
  if (top?.key === item.key) return; // กันซ้ำ
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

function hasBrowserBack() {
  // Next มักใส่ idx ใน history.state
  const st: any = typeof window !== "undefined" ? window.history.state : null;
  if (typeof st?.idx === "number") return st.idx > 0;
  // fallback
  return typeof window !== "undefined" ? window.history.length > 1 : false;
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
  backEl.style.opacity = "0"; // เริ่มซ่อน
}

export default function SwipeBack({
  disabled = false,

  // -1 = ปัดได้ทั้งจอ
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

  // ✅ sync stack/pop + render back template เมื่อ route เปลี่ยน
  useEffect(() => {
    const backEl = byId(opts.backId);
    if (!backEl) return;

    // ถ้าเพิ่ง back มาถึงหน้าเดิม -> pop snapshot
    popIfTopMatches(routeKey);

    const top = peekStack();
    ensureBackHTML(backEl, top, opts.backOverlayMaxOpacity);
  }, [routeKey, opts.backId, opts.backOverlayMaxOpacity]);

  // ✅ เติม snapshot stack: ดัก pushState + replaceState + click <a>
  useEffect(() => {
    const front = byId(opts.targetId);
    const backEl = byId(opts.backId);
    if (!front || !backEl) return;

    const captureNow = () => {
      const key = routeKeyRef.current;
      const snap: SnapshotItem = {
        key,
        html: front.innerHTML,
        scrollY: window.scrollY || 0,
        ts: Date.now(),
      };
      pushStack(snap);
      // เตรียม back layer ให้พร้อม
      ensureBackHTML(backEl, peekStack(), opts.backOverlayMaxOpacity);
    };

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (state: any, title: string, url?: string | URL | null) {
      // เก็บ snapshot “ก่อน” เปลี่ยนหน้า
      captureNow();
      // @ts-ignore
      return origPush.apply(this, arguments);
    } as any;

    history.replaceState = function (state: any, title: string, url?: string | URL | null) {
      // บางกรณี Next ใช้ replaceState ตอนนำทาง/เปลี่ยนเส้นทาง
      captureNow();
      // @ts-ignore
      return origReplace.apply(this, arguments);
    } as any;

    const onDocClickCapture = (e: MouseEvent) => {
      const el = e.target as Element | null;
      const a = el?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;

      // เปิดแท็บใหม่/ลิงก์ภายนอกไม่ต้อง capture
      if (a.target && a.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = a.getAttribute("href") || "";
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("http")) {
        try {
          const u = new URL(href);
          if (u.origin !== location.origin) return;
        } catch {
          return;
        }
      }

      // คลิกนำทางในแอป -> capture
      captureNow();
    };

    document.addEventListener("click", onDocClickCapture, true);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      document.removeEventListener("click", onDocClickCapture, true);
    };
  }, [opts.targetId, opts.backId, opts.backOverlayMaxOpacity]);

  // ✅ gesture + preview
  useEffect(() => {
    if (disabled) return;

    const s = stateRef.current;
    const front = byId(opts.targetId);
    const backEl = byId(opts.backId);
    if (!front || !backEl) return;

    s.origTransform = front.style.transform || "";
    s.origTransition = front.style.transition || "";
    s.origWillChange = front.style.willChange || "";

    const width = () => Math.max(1, window.innerWidth || 1);

    const parts = () => ({
      content: backEl.querySelector("[data-swipeback-backcontent]") as HTMLElement | null,
      overlay: backEl.querySelector("[data-swipeback-overlay]") as HTMLElement | null,
    });

    const canSwipe = () => {
      // ✅ ปลดล็อคตาม back จริงของ browser หรือมี snapshot ก็ให้ปัดได้
      return hasBrowserBack() || !!peekStack();
    };

    const showBack = (snap: SnapshotItem) => {
      s.snap = snap;
      s.snapScrollY = snap.scrollY || 0;

      ensureBackHTML(backEl, snap, opts.backOverlayMaxOpacity);
      backEl.style.opacity = "1";

      const { content, overlay } = parts();
      if (content) {
        const x = -width() * opts.backParallaxRatio;
        content.style.transform = `translate3d(${x}px, ${-s.snapScrollY}px, 0)`;
      }
      if (overlay) overlay.style.opacity = "1";
    };

    const hideBack = () => {
      backEl.style.opacity = "0";
      s.snap = null;
    };

    const setProgress = (dx: number) => {
      const w = width();
      const p = Math.max(0, Math.min(1, dx / w));
      const clamped = Math.max(0, Math.min(dx, w));

      // front ตามนิ้ว
      front.style.transition = "none";
      front.style.transform = `translate3d(${clamped}px, 0, 0)`;

      // back (ถ้ามี snapshot)
      const { content, overlay } = parts();
      if (content) {
        const x = -w * opts.backParallaxRatio * (1 - p);
        content.style.transform = `translate3d(${x}px, ${-s.snapScrollY}px, 0)`;
      }
      if (overlay) overlay.style.opacity = String(1 - p);
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

    const resetToZero = () => {
      animateFrontTo(0, () => {
        front.style.transition = "none";
        front.style.willChange = "";
        hideBack();
      });
    };

    const commitBack = () => {
      animateFrontTo(width(), () => {
        // ถ้ามี back จริง -> back
        if (hasBrowserBack()) router.back();
        else {
          // fallback: ถ้ามี snapshot แต่ history ไม่มี (เช่น reload) -> replace ไปหน้า snapshot
          const snap = peekStack();
          if (snap?.key) router.replace(snap.key);
          else router.back();
        }
      });
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

      // ✅ ล็อคเมื่อไม่มี back จริงๆ
      if (!canSwipe()) return;

      if (opts.edgePx >= 0 && e.clientX > opts.edgePx) return;

      const targetEl = e.target as Element | null;
      if (isTextInput(targetEl)) return;
      if (targetEl?.closest?.("[data-no-swipeback]")) return;

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

      const snap = peekStack();
      if (snap) showBack(snap); // ✅ มี snapshot ถึงจะโชว์หน้าเก่า
      else backEl.style.opacity = "0";
    };

    const onMove = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

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

      if (!s.dragging) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) s.dragging = true;
        else return;
      }

      e.preventDefault();
      queue(Math.max(0, dx));
    };

    const onUp = (e: PointerEvent) => {
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
  }, [router, disabled, opts]);

  return null;
}
