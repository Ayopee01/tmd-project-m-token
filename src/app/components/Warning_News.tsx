"use client";

import { useEffect, useState } from "react";
// library
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
// Icons
import { FiDownload, FiXCircle } from "react-icons/fi";
// types
import type { WarningData } from "@/app/types/warning";

type WarningNewsPopupProps = {
  open: boolean;
  warnings: WarningData;
  onClose: () => void;
};

/* -------------------- Config -------------------- */

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/* -------------------- Functions -------------------- */

function formatThaiDate(value?: string | null) {
  if (!value) return null;

  const datePart = value.split(" ")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return null;

  const monthName = THAI_MONTHS[month - 1];
  if (!monthName) return null;

  return `วันที่ ${day} ${monthName} ${year + 543}`;
}

/* -------------------- Component -------------------- */

function WarningNewsPopup({
  open,
  warnings,
  onClose,
}: WarningNewsPopupProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    if (!open || !swiper) return;

    setActiveIndex(0);
    setIsSliding(false);

    const frame = requestAnimationFrame(() => {
      swiper.slideToLoop(0, 0);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open, swiper]);

  function handleClosePopup() {
    setIsSliding(false);
    onClose();
  }

  if (!open || warnings.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
      onClick={handleClosePopup}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white px-6 py-7 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Button Close */}
        <button
          type="button"
          onClick={handleClosePopup}
          className={[
            "absolute right-5 top-5 z-10 text-red-500 transition-all duration-300 hover:text-red-600",
            isSliding
              ? "pointer-events-none scale-90 opacity-0"
              : "pointer-events-auto scale-100 opacity-100",
          ].join(" ")}
          aria-label="ปิดประกาศ"
        >
          <FiXCircle className="h-7 w-7 cursor-pointer" />
        </button>

        <Swiper
          modules={[Autoplay]}
          slidesPerView={1}
          spaceBetween={24}
          loop={warnings.length > 1}
          speed={650}
          autoplay={
            warnings.length > 1
              ? {
                  delay: 10000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
              : false
          }
          onSwiper={(swiperInstance) => setSwiper(swiperInstance)}
          onSlideChange={(swiperInstance) => {
            setActiveIndex(swiperInstance.realIndex);
          }}
          onSliderFirstMove={() => {
            setIsSliding(true);
          }}
          onTransitionStart={() => {
            setIsSliding(true);
          }}
          onSlideChangeTransitionStart={() => {
            setIsSliding(true);
          }}
          onTransitionEnd={() => {
            setIsSliding(false);
          }}
          onSlideChangeTransitionEnd={() => {
            setIsSliding(false);
          }}
          className="w-full"
        >
          {warnings.map((warning) => {
            const displayDate = formatThaiDate(warning.contentdate);

            return (
              <SwiperSlide key={warning.key}>
                <article>
                  {/* Title */}
                  <h2 className="pr-10 text-2xl font-bold text-gray-900">
                    {warning.title}
                  </h2>

                  <div className="mt-3 h-px w-full bg-gray-400" />

                  {/* Description */}
                  <div className="mt-6 min-h-[200px] whitespace-pre-line text-base leading-7 text-gray-700">
                    {warning.description || "มีประกาศล่าสุดจากระบบ"}
                  </div>

                  {/* Button Download & Datetime */}
                  <div className="mt-6 flex items-center justify-between gap-4">
                    {warning.url ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!warning.url) return;

                          window.open(
                            warning.url,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                        className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-3 transition duration-150 hover:bg-emerald-700 active:bg-emerald-800"
                      >
                        <FiDownload
                          className="h-5 w-5 text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-none font-semibold text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100">
                          อ่านเพิ่มเติม
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {displayDate ? (
                      <p className="text-right text-sm font-medium text-gray-500">
                        {displayDate}
                      </p>
                    ) : null}
                  </div>
                </article>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Dot Indicator */}
        {warnings.length > 1 ? (
          <div
            className="mt-6 flex items-center justify-center gap-2"
            aria-label="ตัวบอกตำแหน่งประกาศ"
          >
            {warnings.map((warning, index) => {
              const active = activeIndex === index;

              return (
                <button
                  key={`dot-${warning.key}`}
                  type="button"
                  onClick={() => {
                    setIsSliding(true);
                    swiper?.slideToLoop(index);
                  }}
                  className={[
                    "h-2.5 cursor-pointer rounded-full transition-all duration-200",
                    active
                      ? "w-7 bg-gray-500"
                      : "w-2.5 bg-gray-300 hover:bg-gray-400",
                  ].join(" ")}
                  aria-label={`ไปยังประกาศที่ ${index + 1}`}
                  aria-current={active ? "true" : "false"}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default WarningNewsPopup;