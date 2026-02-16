"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  disabled?: boolean;       // เช่น ตอน Drawer เปิดอยู่ให้ปิด gesture
  edgePx?: number;          // ต้องเริ่มปัดจากขอบซ้ายกี่ px
  minDistancePx?: number;   // ระยะปัดขั้นต่ำถึงจะย้อนกลับ
  maxVerticalPx?: number;   // อนุญาตให้เอียงแนวตั้งได้ไม่เกินกี่ px
  maxTimeMs?: number;       // ต้องปัดจบภายในกี่ ms
};

function isTextInput(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return (el as HTMLElement).isContentEditable === true;
}

export default function SwipeBack({
  disabled = false,
  edgePx = 24,
  minDistancePx = 70,
  maxVerticalPx = 35,
  maxTimeMs = 500,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    if (disabled) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let targetEl: Element | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      // ต้องเริ่มจาก “ขอบซ้าย” เท่านั้น (กันชนกับ gesture อื่น)
      if (t.clientX > edgePx) return;

      targetEl = e.target as Element | null;

      // ไม่ทำงานใน input หรือ element ที่สั่งห้าม
      if (isTextInput(targetEl)) return;
      if (targetEl?.closest?.("[data-no-swipeback]")) return;

      tracking = true;
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // ถ้าเลื่อนแนวตั้งเยอะกว่าแนวนอน ให้ยกเลิก (กันชนกับการ scroll)
      if (Math.abs(dy) > maxVerticalPx && Math.abs(dy) > Math.abs(dx)) {
        tracking = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const dt = Date.now() - startT;
      if (dt > maxTimeMs) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (dx >= minDistancePx && Math.abs(dy) <= maxVerticalPx) {
        router.back();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, disabled, edgePx, minDistancePx, maxVerticalPx, maxTimeMs]);

  return null;
}
