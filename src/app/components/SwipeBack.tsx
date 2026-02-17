"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SwipeBackProps, SnapshotItem } from "@/app/types/swipeback";

const KEY = "__swipeback_stack__";
const LIM = 8;

const readStack = (): SnapshotItem[] => {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SnapshotItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStack = (s: SnapshotItem[]) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s.slice(-LIM)));
  } catch {
    // ignore
  }
};

const peekStack = (): SnapshotItem | null => {
  const s = readStack();
  return s.length ? s[s.length - 1] : null;
};

const pushStack = (it: SnapshotItem) => {
  const s = readStack();
  s.push(it);
  writeStack(s);
};

const isInternalLink = (a: HTMLAnchorElement) => {
  const href = a.getAttribute("href") || "";
  if (!href || href.startsWith("#")) return false;

  if (href.startsWith("http")) {
    try {
      return new URL(href).origin === location.origin;
    } catch {
      return false;
    }
  }
  return true;
};

function isTextInput(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return (el as HTMLElement).isContentEditable === true;
}

type CanBackState = { idx?: number } | null;

export default function SwipeBack({
  disabled = false,
  edgePx = 20, // เหมือน RN: gestureResponseDistance.horizontal
  minDistancePx = 80,
  targetId = "swipeback-root",
  backId = "swipeback-back",
}: SwipeBackProps) {
  const router = useRouter();

  const st = useRef({
    on: false,
    drag: false,
    id: -1,

    sx: 0,
    sy: 0,
    lx: 0,
    ly: 0,

    w: 1,
    snapScrollY: 0,
  });

  useEffect(() => {
    const front = document.getElementById(targetId) as HTMLElement | null;
    const back = document.getElementById(backId) as HTMLElement | null;
    if (!front || !back) return;

    const capture = () => {
      pushStack({
        html: front.innerHTML,
        scrollY: window.scrollY || 0,
        ts: Date.now(),
      });
    };

    // ✅ เก็บ snapshot ตอน “กำลังจะไปหน้าใหม่” (Typed 100%)
    type PushState = History["pushState"];
    const origPush: PushState = history.pushState;

    history.pushState = function (
      this: History,
      state: any,
      title: string,
      url?: string | URL | null
    ) {
      capture();
      return origPush.call(this, state, title, url);
    };

    // ✅ เผื่อ Next ใช้ <a> / Link -> capture ตอน click
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;

      if (a.target && a.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!isInternalLink(a)) return;

      capture();
    };
    document.addEventListener("click", onClick, true);

    const canBack = () => {
      const idx = (history.state as CanBackState)?.idx;
      return (typeof idx === "number" ? idx > 0 : history.length > 1) || !!peekStack();
    };

    const showBack = () => {
      const snap = peekStack();
      if (!snap) return false;

      st.current.snapScrollY = snap.scrollY;

      back.innerHTML = `
        <div data-bc style="position:absolute; inset:0; will-change:transform;">
          ${snap.html}
        </div>
        <div data-ov style="position:absolute; inset:0; background:rgba(0,0,0,.12)"></div>
      `;
      back.style.opacity = "1";

      const bc = back.querySelector("[data-bc]") as HTMLElement | null;
      if (bc) {
        bc.style.transform = `translate3d(${-st.current.w * 0.3}px, ${-snap.scrollY}px, 0)`;
      }
      return true;
    };

    const hideBack = () => {
      back.style.opacity = "0";
      back.innerHTML = "";
    };

    const setX = (x: number) => {
      const w = st.current.w;
      const cx = Math.max(0, Math.min(x, w));
      const p = cx / w;

      front.style.transition = "none";
      front.style.transform = `translate3d(${cx}px,0,0)`;

      const bc = back.querySelector("[data-bc]") as HTMLElement | null;
      const ov = back.querySelector("[data-ov]") as HTMLElement | null;

      if (bc) {
        const bx = -w * 0.3 * (1 - p);
        bc.style.transform = `translate3d(${bx}px, ${-st.current.snapScrollY}px, 0)`;
      }
      if (ov) ov.style.opacity = String(1 - p);
    };

    const anim = (to: number, done?: () => void) => {
      const w = st.current.w;
      const t = Math.max(0, Math.min(to, w));

      front.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
      front.style.transform = `translate3d(${t}px,0,0)`;

      if (!done) return;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        done();
      };

      const timer = window.setTimeout(finish, 260);
      front.addEventListener(
        "transitionend",
        () => {
          window.clearTimeout(timer);
          finish();
        },
        { once: true }
      );
    };

    const reset = () =>
      anim(0, () => {
        front.style.transition = "none";
        front.style.willChange = "";
        hideBack();
      });

    const onDown = (e: PointerEvent) => {
      if (disabled) return;
      if (!e.isPrimary) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canBack()) return;
      if (edgePx >= 0 && e.clientX > edgePx) return;

      const targetEl = e.target as Element | null;
      if (isTextInput(targetEl)) return;
      if (targetEl?.closest?.("[data-no-swipeback]")) return;

      st.current.on = true;
      st.current.drag = false;
      st.current.id = e.pointerId;

      st.current.sx = st.current.lx = e.clientX;
      st.current.sy = st.current.ly = e.clientY;

      const w = window.visualViewport?.width ?? window.innerWidth ?? 1;
      st.current.w = Math.max(1, Math.round(w));
    };

    const onMove = (e: PointerEvent) => {
      if (!st.current.on || e.pointerId !== st.current.id) return;

      const dx = e.clientX - st.current.sx;
      const dy = e.clientY - st.current.sy;
      st.current.lx = e.clientX;
      st.current.ly = e.clientY;

      if (!st.current.drag) {
        if (dx > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          st.current.drag = true;
          front.style.willChange = "transform";
          if (!showBack()) {
            st.current.on = false;
            st.current.drag = false;
            return;
          }
        } else return;
      }

      e.preventDefault();
      setX(Math.max(0, dx));
    };

    const onUp = (e: PointerEvent) => {
      if (!st.current.on || e.pointerId !== st.current.id) return;

      st.current.on = false;

      // ถ้าไม่ลากจริง => tap ปกติ
      if (!st.current.drag) return;

      const dx = st.current.lx - st.current.sx;

      if (dx >= minDistancePx || dx >= st.current.w * 0.35) {
        anim(st.current.w, () => router.back());
      } else {
        reset();
      }

      st.current.drag = false;
      st.current.id = -1;
    };

    const onCancel = (e: PointerEvent) => {
      if (!st.current.on || e.pointerId !== st.current.id) return;
      st.current.on = false;
      st.current.drag = false;
      st.current.id = -1;
      reset();
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });

    return () => {
      history.pushState = origPush;
      document.removeEventListener("click", onClick, true);

      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);

      front.style.transition = "none";
      front.style.transform = "translate3d(0,0,0)";
      front.style.willChange = "";
      hideBack();
    };
  }, [router, disabled, edgePx, minDistancePx, targetId, backId]);

  return null;
}
