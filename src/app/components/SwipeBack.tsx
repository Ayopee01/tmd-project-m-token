"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SwipeBackProps } from "@/app/types/swipeback";

function isTextInput(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return (el as HTMLElement).isContentEditable === true;
}

function getSwipeTarget(targetId?: string) {
  if (targetId) {
    const byId = document.getElementById(targetId);
    if (byId) return byId as HTMLElement;
  }
  const main = document.querySelector("main");
  if (main) return main as HTMLElement;
  return document.body as HTMLElement;
}

export default function SwipeBack({
  disabled = false,

  // ✅ -1 = ปัดได้ทั้งจอ (ตามที่ขอ)
  edgePx = -1,

  minDistancePx = 70,
  maxVerticalPx = 35,
  maxTimeMs = 500,

  animDurationMs = 220,
  animEasing = "cubic-bezier(0.2, 0.8, 0.2, 1)",

  targetId = "swipeback-root",
}: SwipeBackProps) {
  const router = useRouter();
  const pathname = usePathname();

  const stateRef = useRef({
    tracking: false,
    dragging: false,
    pointerId: -1,

    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,

    startT: 0,

    pendingBack: false,

    raf: 0 as number | 0,
    queuedX: 0,

    // เก็บค่าเดิมไว้ restore
    origTransform: "" as string,
    origTransition: "" as string,
    origWillChange: "" as string,
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
    }),
    [
      edgePx,
      minDistancePx,
      maxVerticalPx,
      maxTimeMs,
      animDurationMs,
      animEasing,
      targetId,
    ]
  );

  // รีเซ็ตทุกครั้งที่ pathname เปลี่ยน (กันค้าง transform หลัง back)
  useEffect(() => {
    const s = stateRef.current;
    const target = typeof window !== "undefined" ? getSwipeTarget(opts.targetId) : null;
    if (!target) return;

    target.style.transition = "none";
    target.style.transform = "translate3d(0,0,0)";
    target.style.willChange = "";

    s.pendingBack = false;
  }, [pathname, opts.targetId]);

  useEffect(() => {
    if (disabled) return;

    const s = stateRef.current;
    const target = getSwipeTarget(opts.targetId);

    // save original styles (ครั้งเดียวตอน mount)
    s.origTransform = target.style.transform || "";
    s.origTransition = target.style.transition || "";
    s.origWillChange = target.style.willChange || "";

    const width = () => Math.max(1, window.innerWidth || 1);

    const setTransformImmediate = (x: number) => {
      const clamped = Math.max(0, Math.min(x, width()));
      target.style.transition = "none";
      target.style.transform = `translate3d(${clamped}px, 0, 0)`;
    };

    const animateTo = (x: number, onDone?: () => void) => {
      const clamped = Math.max(0, Math.min(x, width()));
      target.style.transition = `transform ${opts.animDurationMs}ms ${opts.animEasing}`;
      target.style.transform = `translate3d(${clamped}px, 0, 0)`;

      if (!onDone) return;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        target.removeEventListener("transitionend", finish);
        onDone();
      };

      target.addEventListener("transitionend", finish, { once: true });

      // กันกรณี transitionend ไม่ยิง
      window.setTimeout(finish, opts.animDurationMs + 60);
    };

    const resetToZero = () => {
      animateTo(0, () => {
        target.style.transition = "none";
        target.style.willChange = "";
      });
    };

    const commitBack = () => {
      s.pendingBack = true;
      const outX = width();
      animateTo(outX, () => {
        // เรียก back หลังสไลด์ออก
        router.back();
      });
    };

    const queueTransform = (x: number) => {
      s.queuedX = x;
      if (s.raf) return;
      s.raf = window.requestAnimationFrame(() => {
        s.raf = 0;
        setTransformImmediate(s.queuedX);
      });
    };

    const cancelTracking = () => {
      s.tracking = false;
      s.dragging = false;
      s.pointerId = -1;
      if (s.raf) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
      }
      resetToZero();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (disabled) return;
      if (!e.isPrimary) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      // ถ้าต้องการ “เฉพาะขอบซ้าย” ให้ตั้ง edgePx เป็นตัวเลข >= 0
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

      target.style.willChange = "transform";
      target.style.transition = "none";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      s.lastX = e.clientX;
      s.lastY = e.clientY;

      // ถ้าเลื่อนแนวตั้งเยอะกว่าแนวนอน => ยกเลิก (กันชน scroll)
      if (Math.abs(dy) > opts.maxVerticalPx && Math.abs(dy) > Math.abs(dx)) {
        cancelTracking();
        return;
      }

      // ถ้าปัดไปทางซ้ายแรงๆ ก็ยกเลิก
      if (dx < -10) {
        cancelTracking();
        return;
      }

      // เริ่ม drag แนวนอนเมื่อ dx ชัดเจน
      if (!s.dragging) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) s.dragging = true;
        else return;
      }

      // กันหน้าจอเลื่อนตอนลากกลับ
      e.preventDefault();

      // ให้ตามนิ้ว (เฉพาะ dx บวก)
      queueTransform(Math.max(0, dx));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!s.tracking) return;
      if (e.pointerId !== s.pointerId) return;

      const dt = performance.now() - s.startT;
      const dx = s.lastX - s.startX;
      const dy = s.lastY - s.startY;

      s.tracking = false;

      // ถ้าไม่ใช่ gesture แนวนอนจริงๆ ให้คืนสภาพ
      if (!s.dragging) {
        resetToZero();
        return;
      }

      // เงื่อนไขย้อนกลับ
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

    // ใช้ pointer events (ครอบคลุม touch + mouse)
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);

      // restore styles
      target.style.transform = s.origTransform;
      target.style.transition = s.origTransition;
      target.style.willChange = s.origWillChange;

      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [router, disabled, opts]);

  return null;
}
