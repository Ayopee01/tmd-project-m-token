'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Props = { children: React.ReactNode };

// history stack แบบง่าย (กันกรณีไม่มีหน้าเก่าแล้วปัดไม่ได้)
function useInAppHistoryStack() {
  const pathname = usePathname();
  const [stack, setStack] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem('__nav_stack__');
      return raw ? (JSON.parse(raw) as string[]) : [pathname];
    } catch {
      return [pathname];
    }
  });

  useEffect(() => {
    // push เมื่อ pathname เปลี่ยน
    setStack((prev) => {
      const last = prev[prev.length - 1];
      const next = last === pathname ? prev : [...prev, pathname];
      try {
        sessionStorage.setItem('__nav_stack__', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    // pop เมื่อผู้ใช้กด back/gesture ของ browser เกิด popstate
    const onPop = () => {
      setStack((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.slice(0, -1);
        try {
          sessionStorage.setItem('__nav_stack__', JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return {
    canGoBack: stack.length > 1,
    debugStack: stack,
  };
}

export default function SwipeBack({ children }: Props) {
  const router = useRouter();
  const { canGoBack } = useInAppHistoryStack();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const [tx, setTx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const thresholdRatio = 0.32; // ลากเกิน ~32% ของจอถึงจะ back
  const maxSlope = 1.2;        // กันลากเฉียง/แนวตั้งเยอะเกิน

  const width = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    return window.innerWidth;
  }, []);

  const reset = (withAnim = true) => {
    if (withAnim) setAnimating(true);
    setTx(0);
    if (withAnim) {
      window.setTimeout(() => setAnimating(false), 180);
    }
  };

  const commitBack = () => {
    setAnimating(true);
    setTx(width || window.innerWidth);
    window.setTimeout(() => {
      setAnimating(false);
      router.back();
    }, 180);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Underlay: ตรงนี้เป็น “พื้นหลัง/หน้าเก่าแบบจำลอง” (ยังไม่ใช่หน้าเก่าจริง) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: Math.min(1, tx / Math.max(1, (width || 1))),
          transform: `translateX(${(-30 + (tx / Math.max(1, (width || 1))) * 30)}px)`,
          transition: animating ? 'opacity 180ms ease, transform 180ms ease' : 'none',
          // ใส่ gradient / สีพื้นหลังให้ดูเหมือนมี “หน้าอยู่ข้างหลัง”
          background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(59,130,246,0.08), rgba(236,72,153,0.08))',
        }}
      />

      {/* Foreground: หน้าปัจจุบัน (ลากเลื่อนได้) */}
      <div
        ref={wrapRef}
        style={{
          transform: `translateX(${tx}px)`,
          transition: animating ? 'transform 180ms ease' : 'none',
          touchAction: 'pan-y', // ให้สกรอลล์แนวตั้งได้ แต่เราจับแนวนอน
          boxShadow: tx > 0 ? '0 0 40px rgba(0,0,0,0.12)' : 'none',
        }}
        onPointerDown={(e) => {
          if (!canGoBack) return;

          // ถ้าต้องการ “ปัดได้ทุกที่” ก็ไม่ต้องเช็คขอบซ้าย
          // แต่แนะนำให้จำกัดเฉพาะซ้าย ~24px เพื่อไม่ชนกับ horizontal scroll
          // if (e.clientX > 24) return;

          start.current = { x: e.clientX, y: e.clientY };
          dragging.current = false;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!canGoBack) return;

          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;

          // เริ่มลากเมื่อขยับแนวนอนชัดเจน และไม่ใช่แนวตั้ง
          if (!dragging.current) {
            if (dx > 8 && Math.abs(dx) > Math.abs(dy) * maxSlope) {
              dragging.current = true;
            } else {
              return;
            }
          }

          // clamp: ไม่ให้ลากไปซ้าย และไม่ให้เกินความกว้างจอ
          const w = width || window.innerWidth;
          const next = Math.max(0, Math.min(dx, w));
          setTx(next);
        }}
        onPointerUp={() => {
          if (!canGoBack) return;
          if (!dragging.current) return reset(false);

          const w = width || window.innerWidth;
          if (tx > w * thresholdRatio) {
            commitBack();
          } else {
            reset(true);
          }
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
          reset(true);
        }}
      >
        {children}
      </div>
    </div>
  );
}
