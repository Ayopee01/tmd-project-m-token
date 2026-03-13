"use client";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import type { PanInfo } from "motion/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SwipeBackProps = {
  children: ReactNode;
  disabled?: boolean;
  fallbackHref?: string;
  edge?: number;          // พื้นที่ขอบซ้ายสำหรับเริ่มปัด
  threshold?: number;     // ระยะขั้นต่ำที่ถือว่าย้อนกลับ
  velocityThreshold?: number;
  underlay?: ReactNode;   // สิ่งที่อยากให้เห็นอยู่ใต้หน้าปัจจุบัน
  className?: string;
};

export default function SwipeBack({
  children,
  disabled = false,
  fallbackHref = "/",
  edge = 24,
  threshold = 110,
  velocityThreshold = 700,
  underlay,
  className = "",
}: SwipeBackProps) {
  const router = useRouter();
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const animatingRef = useRef(false);

  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      setViewportWidth(window.innerWidth || 0);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const completeDistance = useMemo(() => {
    return viewportWidth > 0 ? viewportWidth + 48 : 420;
  }, [viewportWidth]);

  // ใต้หน้าปัจจุบันให้ค่อย ๆ ขยับและชัดขึ้น
  const underlayX = useTransform(
    x,
    [0, completeDistance],
    [-18, 0]
  );

  const underlayScale = useTransform(
    x,
    [0, completeDistance],
    [0.985, 1]
  );

  const underlayOpacity = useTransform(
    x,
    [0, completeDistance * 0.5],
    [0.82, 1]
  );

  // เงา/มืดของหน้าบน
  const scrimOpacity = useTransform(
    x,
    [0, completeDistance * 0.45],
    [0.12, 0]
  );

  async function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref, { scroll: false });
  }

  async function animateBackToStart() {
    animatingRef.current = true;
    try {
      await animate(x, 0, {
        type: reduceMotion ? "tween" : "spring",
        duration: reduceMotion ? 0.16 : undefined,
        stiffness: 520,
        damping: 42,
        mass: 0.9,
      });
    } finally {
      setDragging(false);
      animatingRef.current = false;
    }
  }

  async function animateOffAndBack() {
    animatingRef.current = true;
    try {
      await animate(x, completeDistance, {
        type: reduceMotion ? "tween" : "spring",
        duration: reduceMotion ? 0.14 : undefined,
        stiffness: 340,
        damping: 34,
        mass: 0.8,
      });

      await goBack();
    } finally {
      // กันกรณี fallback route ไม่เปลี่ยนทันที
      x.set(0);
      setDragging(false);
      animatingRef.current = false;
    }
  }

  function handleEdgePointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (disabled || animatingRef.current) return;
    controls.start(event);
  }

  function handleDragStart() {
    if (disabled || animatingRef.current) return;
    setDragging(true);
  }

  function handleDragEnd(
    _event: PointerEvent,
    info: PanInfo
  ) {
    if (disabled || animatingRef.current) {
      void animateBackToStart();
      return;
    }

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const shouldGoBack =
      offsetX >= threshold || velocityX >= velocityThreshold;

    if (shouldGoBack) {
      void animateOffAndBack();
    } else {
      void animateBackToStart();
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen overflow-x-hidden ${className}`}
    >
      {/* ชั้นล่าง: placeholder หรือ snapshot ของหน้าก่อนหน้า */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          x: underlayX,
          scale: underlayScale,
          opacity: underlayOpacity,
          transformOrigin: "left center",
        }}
      >
        {underlay ?? (
          <div className="h-full w-full bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        )}
      </motion.div>

      {/* เงาด้านบนของชั้นล่าง */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-black"
        style={{ opacity: scrimOpacity }}
      />

      {/* พื้นที่ขอบซ้ายไว้เริ่ม gesture */}
      <div
        className="absolute inset-y-0 left-0 z-40"
        style={{ width: edge }}
        onPointerDown={handleEdgePointerDown}
      />

      {/* หน้าปัจจุบัน */}
      <motion.div
        className="relative z-30 min-h-screen bg-white will-change-transform"
        style={{ x }}
        drag={disabled ? false : "x"}
        dragControls={controls}
        dragListener={false}
        dragDirectionLock
        dragMomentum={false}
        dragElastic={{ left: 0, right: 0.08 }}
        dragConstraints={{ left: 0, right: completeDistance }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* เงาขอบซ้ายตอนปัด */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-5"
          style={{
            opacity: useTransform(x, [0, 40, 120], [0, 0.18, 0.28]),
            boxShadow: "0 0 24px rgba(0,0,0,0.18)",
          }}
        />

        {children}
      </motion.div>
    </div>
  );
}