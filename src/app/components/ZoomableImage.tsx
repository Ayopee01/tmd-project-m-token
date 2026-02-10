"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FiMaximize2, FiX } from "react-icons/fi";

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** ถ้า true: จอใหญ่ก็คลิกที่รูปเพื่อซูมได้ (default: false) */
  clickAnywhereOnDesktop?: boolean;
};

function ZoomableImage({
  src,
  alt,
  width = 900,
  height = 1200,
  className = "h-auto w-full",
  clickAnywhereOnDesktop = false,
}: Props) {
  const [open, setOpen] = useState(false);

  // ✅ md ลงไป (<768px) = กดตรงไหนของรูปก็เปิดได้ + ซ่อนไอคอน
  const [isMdDown, setIsMdDown] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)"); // lg=1024px ลงไป
    const apply = () => setIsMdDown(mql.matches);

    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const canClickAnywhere = useMemo(() => {
    return isMdDown || clickAnywhereOnDesktop;
  }, [isMdDown, clickAnywhereOnDesktop]);

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

  if (!src) return null;

  return (
    <>
      {/* Image */}
      <div
        className={[
          "group relative shadow-xl",
          canClickAnywhere ? "cursor-zoom-in" : "",
        ].join(" ")}
        onClick={canClickAnywhere ? () => setOpen(true) : undefined}
        role={canClickAnywhere ? "button" : undefined}
        tabIndex={canClickAnywhere ? 0 : -1}
        onKeyDown={
          canClickAnywhere
            ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
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

        {/* Icon Zoom (✅ ซ่อนบน md ลงไป, โชว์ md+ ) */}
        <button
          type="button"
          aria-label="Icon Zoom"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
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
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full items-center justify-center">
            <div
              className="relative inline-block max-h-[90vh] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={2000}
                className="mx-auto max-h-[90vh] w-auto max-w-[95vw] object-contain shadow-2xl"
                priority
              />

              <button
                type="button"
                aria-label="Close Button"
                onClick={() => setOpen(false)}
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
