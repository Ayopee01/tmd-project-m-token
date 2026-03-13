"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";

type SwipeBackProps = {
  children: ReactNode;
  disabled?: boolean;
  edge?: number;
  threshold?: number;
  maxPull?: number;
  fallbackHref?: string;
};

type SwipeInputEvent =
  | globalThis.MouseEvent
  | globalThis.TouchEvent
  | globalThis.PointerEvent;

function hasClientPoint(
  event: SwipeInputEvent
): event is globalThis.MouseEvent | globalThis.PointerEvent {
  return "clientX" in event && "clientY" in event;
}

function getPoint(event: SwipeInputEvent) {
  if ("changedTouches" in event && event.changedTouches.length > 0) {
    return {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
    };
  }

  if ("touches" in event && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  if (hasClientPoint(event)) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  return { x: 0, y: 0 };
}

export default function SwipeBack({
  children,
  disabled = false,
  edge = 28,
  threshold = 90,
  maxPull = 140,
  fallbackHref = "/",
}: SwipeBackProps) {
  const router = useRouter();

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);
  const draggingRef = useRef(false);
  const pullXRef = useRef(0);

  const [pullX, setPullX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function setPull(value: number) {
    pullXRef.current = value;
    setPullX(value);
  }

  function reset() {
    activeRef.current = false;
    draggingRef.current = false;
    setDragging(false);
    setPull(0);
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref, { scroll: false });
  }

  function handleTouchStart(_swiper: SwiperType, event: SwipeInputEvent) {
    if (disabled) return;

    const { x, y } = getPoint(event);

    startXRef.current = x;
    startYRef.current = y;
    activeRef.current = x <= edge;
    draggingRef.current = false;
    setDragging(false);

    if (!activeRef.current) {
      setPull(0);
    }
  }

  function handleSliderMove(_swiper: SwiperType, event: SwipeInputEvent) {
    if (disabled || !activeRef.current) return;

    const { x, y } = getPoint(event);
    const dx = x - startXRef.current;
    const dy = Math.abs(y - startYRef.current);

    if (dx <= 0) {
      setPull(0);
      return;
    }

    if (!draggingRef.current) {
      if (dy > dx) {
        activeRef.current = false;
        setPull(0);
        setDragging(false);
        return;
      }

      if (dx < 10) return;

      draggingRef.current = true;
      setDragging(true);
    }

    setPull(Math.min(dx, maxPull));
  }

  function handleTouchEnd() {
    if (disabled) {
      reset();
      return;
    }

    const shouldBack = pullXRef.current >= threshold;
    reset();

    if (shouldBack) {
      goBack();
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none fixed inset-y-0 left-0 z-40 w-10",
          "bg-gradient-to-r from-emerald-500/15 to-transparent",
          "transition-opacity duration-200",
          dragging || pullX > 0 ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <Swiper
        slidesPerView={1}
        allowTouchMove={!disabled}
        threshold={0}
        resistanceRatio={0}
        touchStartPreventDefault={false}
        className="min-h-screen"
        onTouchStart={handleTouchStart}
        onSliderMove={handleSliderMove}
        onTouchEnd={handleTouchEnd}
      >
        <SwiperSlide>
          <div
            className={[
              "min-h-screen will-change-transform",
              dragging ? "" : "transition-transform duration-200 ease-out",
            ].join(" ")}
            style={{ transform: `translateX(${pullX}px)` }}
          >
            {children}
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}