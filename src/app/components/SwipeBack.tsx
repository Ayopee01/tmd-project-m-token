"use client";

import {animate,motion,useDragControls,useMotionTemplate,useMotionValue,useReducedMotion,useTransform,} from "motion/react";
import type { PanInfo } from "motion/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type SwipeBackProps = {
  children: ReactNode;
  previousHref?: string | null;
  enabled?: boolean;
  fallbackHref?: string;
  edge?: number;
  threshold?: number;
  velocityThreshold?: number;
  mobileOnly?: boolean;
  mobileMaxWidth?: number;
  className?: string;
};

function useIsMobile(maxWidth: number) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(
      `(max-width: ${maxWidth}px) and (pointer: coarse)`
    );

    const update = () => setIsMobile(mq.matches);
    update();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }

    mq.addListener(update);
    return () => mq.removeListener(update);
  }, [maxWidth]);

  return isMobile;
}

function formatHrefLabel(path: string | null | undefined) {
  if (!path) return "ย้อนกลับ";

  if (path === "/") return "หน้าแรก";

  const clean = path.split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? clean;

  return decodeURIComponent(last);
}

export default function SwipeBack({
  children,
  previousHref = null,
  enabled = true,
  fallbackHref = "/",
  edge = 20,
  threshold = 92,
  velocityThreshold = 620,
  mobileOnly = true,
  mobileMaxWidth = 1024,
  className = "",
}: SwipeBackProps) {
  const router = useRouter();
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  const isMobile = useIsMobile(mobileMaxWidth);
  const gestureEnabled = enabled && (!mobileOnly || isMobile);

  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(420);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      setViewportWidth(window.innerWidth || 420);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const completeDistance = viewportWidth + 48;
  const progress = useTransform(x, [0, completeDistance], [0, 1]);

  const underlayX = useTransform(progress, [0, 1], [-24, 0]);
  const underlayOpacity = useTransform(progress, [0, 1], [0.72, 1]);
  const scrimOpacity = useTransform(progress, [0, 1], [0.16, 0]);

  const pageRadius = useTransform(progress, [0, 0.08, 1], [0, 16, 18]);
  const pageShadowBlur = useTransform(progress, [0, 1], [0, 42]);
  const pageShadowOpacity = useTransform(progress, [0, 1], [0, 0.18]);
  const pageShadow = useMotionTemplate`0 10px ${pageShadowBlur}px rgba(15, 23, 42, ${pageShadowOpacity})`;

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
      x.set(0);
      setDragging(false);
      animatingRef.current = false;
    }
  }

  function handleEdgePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!gestureEnabled || animatingRef.current) return;
    controls.start(event);
  }

  function handleDragStart() {
    if (!gestureEnabled || animatingRef.current) return;
    setDragging(true);
  }

  function handleDragEnd(_event: PointerEvent, info: PanInfo) {
    if (!gestureEnabled || animatingRef.current) {
      void animateBackToStart();
      return;
    }

    const shouldGoBack =
      info.offset.x >= threshold || info.velocity.x >= velocityThreshold;

    if (shouldGoBack) {
      void animateOffAndBack();
    } else {
      void animateBackToStart();
    }
  }

  if (!gestureEnabled) {
    return <>{children}</>;
  }

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${className}`}>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-slate-50 via-white to-slate-100"
        style={{
          x: underlayX,
          opacity: underlayOpacity,
        }}
      >
        <div className="flex h-full items-center justify-start pl-6">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="text-xs text-slate-500">ย้อนกลับไป</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatHrefLabel(previousHref)}
            </div>
            {previousHref ? (
              <div className="mt-1 text-xs text-slate-500">{previousHref}</div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-black"
        style={{ opacity: scrimOpacity }}
      />

      <div
        className="absolute inset-y-0 left-0 z-40"
        style={{ width: edge }}
        onPointerDown={handleEdgePointerDown}
      />

      <motion.div
        className="relative z-30 min-h-screen bg-white will-change-transform touch-pan-y"
        style={{
          x,
          borderRadius: pageRadius,
          boxShadow: pageShadow,
        }}
        drag="x"
        dragControls={controls}
        dragListener={false}
        dragDirectionLock
        dragMomentum={false}
        dragElastic={{ left: 0, right: 0.045 }}
        dragConstraints={{ left: 0, right: completeDistance }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}