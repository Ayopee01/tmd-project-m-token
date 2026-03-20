"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
// icons
import { FiLoader, FiMaximize2, FiX } from "react-icons/fi";
// types
import type { Props } from "@/app/types/ZoomableImage"

function ZoomableImage({
  src,
  alt,
  width = 900,
  height = 1200,
  className = "h-auto w-full",
  clickAnywhereOnDesktop = false,
}: Props) {
  const [open, setOpen] = useState(false);

  // หน้าจอขนาด 1024px ลงไป ให้คลิกที่รูปเพื่อซูมได้เลย (ไม่ต้องกดไอคอน)
  const [isLgDown, setIsLgDown] = useState(false);

  // state สำหรับ loading รูปตอนขยาย
  const [isZoomLoading, setIsZoomLoading] = useState(false);
  const [isZoomImageReady, setIsZoomImageReady] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");
    const apply = () => setIsLgDown(mql.matches);

    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const canClickAnywhere = useMemo(() => {
    return isLgDown || clickAnywhereOnDesktop;
  }, [isLgDown, clickAnywhereOnDesktop]);

  // ปิดด้วย ESC + ล็อกสกอลตอนเปิด overlay
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openZoom = () => {
    setIsZoomLoading(true);
    setIsZoomImageReady(false);
    setOpen(true);
  };

  const closeZoom = () => {
    setOpen(false);
    setIsZoomLoading(false);
    setIsZoomImageReady(false);
  };

  if (!src) return null;

  return (
    <>
      {/* Image */}
      <div
        className={[
          "group relative shadow-xl",
          canClickAnywhere ? "cursor-zoom-in" : "",
        ].join(" ")}
        onClick={canClickAnywhere ? openZoom : undefined}
        role={canClickAnywhere ? "button" : undefined}
        tabIndex={canClickAnywhere ? 0 : -1}
        onKeyDown={
          canClickAnywhere
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openZoom();
                }
              }
            : undefined
        }
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
        />

        {/* Icon Zoom */}
        <button
          type="button"
          aria-label="Icon Zoom"
          onClick={(e) => {
            e.stopPropagation();
            openZoom();
          }}
          className="cursor-pointer absolute right-3 top-3
          hidden lg:inline-flex h-10 w-10 items-center justify-center
          rounded-lg bg-black/40 text-white
          opacity-0 transition
          group-hover:opacity-100
          hover:scale-110 hover:bg-black/60
          focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <FiMaximize2 className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-[2px]"
          onClick={closeZoom}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full items-center justify-center">
            <div
              className="relative inline-block max-h-[90vh] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Loading UI */}
              {isZoomLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="flex min-w-[180px] flex-col items-center gap-3 rounded-2xl bg-black/55 px-5 py-4 text-white shadow-2xl">
                    <FiLoader className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">
                      กำลังโหลดรูปภาพ...
                    </span>
                  </div>
                </div>
              )}

              {/* Skeleton BG Loading UI */}
              {!isZoomImageReady && (
                <div className="h-[70vh] w-[80vw] max-w-[1200px] animate-pulse rounded-2xl bg-white/10" />
              )}

              <Image
                src={src}
                alt={alt}
                width={1600}
                height={2000}
                priority
                onLoad={() => {
                  setIsZoomLoading(false);
                  setIsZoomImageReady(true);
                }}
                className={[
                  "mx-auto max-h-[90vh] w-auto max-w-[95vw] object-contain shadow-2xl transition-opacity duration-300",
                  isZoomImageReady ? "opacity-100" : "opacity-0",
                ].join(" ")}
              />

              <button
                type="button"
                aria-label="Close Button"
                onClick={closeZoom}
                className="cursor-pointer absolute right-3 top-3
                inline-flex h-10 w-10 items-center justify-center
                rounded-lg bg-black/50 text-white
                hover:scale-110 hover:bg-black/70
                transition
                focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ZoomableImage;