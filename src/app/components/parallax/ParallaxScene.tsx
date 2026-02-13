"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useParallaxVars } from "./useParallaxVars";

export type ParallaxItem = {
  src: string;
  alt?: string;
  /** Tailwind position เช่น "absolute inset-0" หรือ "absolute bottom-0 left-1/2 ..." */
  positionClassName: string;
  /** ขนาด/เงา/opacity/anim */
  className?: string;

  /** ความแรง parallax */
  mouseX?: number; // px multiplier เช่น 22 = calc(var(--mx)*22px)
  mouseY?: number; // px multiplier
  scrollY?: number; // factor เช่น 0.18 = calc(var(--sy)*0.18)

  /** เสริม transform ต่อท้าย เช่น " scale(1.12)" */
  extraTransform?: string;

  /** ปิด parallax เฉพาะชั้น */
  disableMotion?: boolean;
};

type Props = {
  bgImages: readonly string[];
  activeBgIndex: number;

  /** ชั้น item ที่จะวางทับ */
  items?: ParallaxItem[];

  /** overlay ให้ตัวหนังสืออ่านง่าย */
  overlayClassName?: string;

  /** ปรับ z-index ฉาก */
  zIndexClassName?: string;

  /** เปิด/ปิด parallax ทั้งหมด */
  enabled?: boolean;
};

export default function ParallaxScene({
  bgImages,
  activeBgIndex,
  items = [],
  overlayClassName = "bg-gradient-to-b from-white/25 via-white/30 to-white/70",
  zIndexClassName = "z-0",
  enabled = true,
}: Props) {
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useParallaxVars(sceneRef, { enabled });

  const active = useMemo(() => {
    if (!bgImages.length) return 0;
    const idx = Math.floor(activeBgIndex) % bgImages.length;
    return idx < 0 ? idx + bgImages.length : idx;
  }, [activeBgIndex, bgImages.length]);

  // preload bg + items
  useEffect(() => {
    const all = [...bgImages, ...items.map((x) => x.src)];
    all.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [bgImages, items]);

  return (
    <div
      ref={sceneRef}
      aria-hidden
      className={[
        "pointer-events-none fixed inset-0 overflow-hidden",
        zIndexClassName,
      ].join(" ")}
    >
      {/* BG crossfade */}
      <div className="absolute inset-0">
        {bgImages.map((src, i) => {
          const isActive = i === active;

          // default depth สำหรับ BG
          const mx = 14;
          const sy = 0.08;

          return (
            <div
              key={`${src}-${i}`}
              className={[
                "absolute inset-0 bg-cover bg-center transition-opacity duration-700",
                isActive ? "opacity-100" : "opacity-0",
              ].join(" ")}
              style={{
                backgroundImage: `url(${src})`,
                transform: enabled
                  ? `translate3d(calc(var(--mx, 0) * ${mx}px), calc(var(--sy, 0px) * ${sy}), 0) scale(1.12)`
                  : "scale(1.12)",
                willChange: enabled ? "transform" : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Overlay */}
      <div className={["absolute inset-0", overlayClassName].join(" ")} />

      {/* Items */}
      {items.map((it, idx) => {
        const mx = it.disableMotion ? 0 : it.mouseX ?? 0;
        const my = it.disableMotion ? 0 : it.mouseY ?? 0;
        const sy = it.disableMotion ? 0 : it.scrollY ?? 0;

        const transform = enabled
          ? `translate3d(calc(var(--mx, 0) * ${mx}px), calc(var(--sy, 0px) * ${sy} + (var(--my, 0) * ${my}px)), 0)${
              it.extraTransform ?? ""
            }`
          : `${it.extraTransform ?? ""}`.trim() || "none";

        return (
          <div
            key={`${it.src}-${idx}`}
            className={it.positionClassName}
            style={{
              transform,
              willChange: enabled ? "transform" : undefined,
            }}
          >
            <img
              src={it.src}
              alt={it.alt ?? ""}
              className={it.className ?? ""}
              draggable={false}
            />
          </div>
        );
      })}

      {/* Keyframes: ให้ใช้ได้เลยไม่ต้องแก้ tailwind.config */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes drift {
          0% {
            transform: translate3d(-54%, 0, 0);
          }
          50% {
            transform: translate3d(-46%, 0, 0);
          }
          100% {
            transform: translate3d(-54%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
