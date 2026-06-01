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

  const hasMultipleWarnings = warnings.length > 1;

  useEffect(() => {
    if (!open || !swiper) return;

    setActiveIndex(0);

    const frame = requestAnimationFrame(() => {
      swiper.update();

      if (hasMultipleWarnings) {
        swiper.slideToLoop(0, 0);
      } else {
        swiper.slideTo(0, 0);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open, swiper, hasMultipleWarnings]);

  function handleClosePopup() {
    onClose();
  }

  if (!open || warnings.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4 backdrop-blur-xs max-[440px]:px-[12px] max-[440px]:py-[16px]"
      onClick={handleClosePopup}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-white px-4 py-5 shadow-2xl max-[440px]:max-w-[320px] max-[440px]:min-h-[520px] max-[440px]:px-[18px] max-[440px]:py-[32px] xl:max-w-sm xl:px-5 xl:py-7"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Button Close */}
        <button
          type="button"
          onClick={handleClosePopup}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-4 top-4 z-20 text-red-500 transition-all duration-300 hover:text-red-600 max-[440px]:right-[14px] max-[440px]:top-[14px] xl:right-5 xl:top-5"
          aria-label="ปิดประกาศ"
        >
          <FiXCircle className="h-6 w-6 cursor-pointer max-[440px]:h-[26px] max-[440px]:w-[26px] xl:h-7 xl:w-7" />
        </button>

        <Swiper
          key={hasMultipleWarnings ? "multiple-warning" : "single-warning"}
          modules={[Autoplay]}
          slidesPerView={1}
          spaceBetween={24}
          loop={hasMultipleWarnings}
          speed={650}
          allowTouchMove={hasMultipleWarnings}
          simulateTouch={hasMultipleWarnings}
          watchOverflow={true}
          autoplay={
            hasMultipleWarnings
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
          className="w-full"
        >
          {warnings.map((warning) => {
            const displayDate = formatThaiDate(warning.contentdate);

            return (
              <SwiperSlide key={warning.key} className="!h-auto">
                <article className="flex min-h-[390px] flex-col max-[440px]:min-h-[430px] xl:min-h-[410px]">
                  {/* Title */}
                  <h2 className="pr-10 text-lg leading-6 font-bold text-gray-900 max-[440px]:pr-[34px] max-[440px]:text-[20px] max-[440px]:leading-[28px] sm:text-xl sm:leading-7 xl:text-2xl xl:leading-8">
                    {warning.title}
                  </h2>

                  <div className="mt-3 h-px w-full bg-gray-400 max-[440px]:mt-[16px]" />

                  {/* Description */}
                  <div className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-gray-700 max-[440px]:mt-[14px] max-[440px]:text-[13px] max-[440px]:leading-[24px] xl:mt-4 xl:text-base xl:leading-7">
                    {warning.description || "มีประกาศล่าสุดจากระบบ"}
                  </div>

                  {/* Button Download & Datetime */}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4 max-[440px]:pt-[30px] xl:gap-4 xl:pt-5">
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
                        className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-600 bg-white px-3 py-2 transition duration-150 hover:bg-emerald-700 active:bg-emerald-800 max-[440px]:px-[14px] max-[440px]:py-[10px] xl:gap-2 xl:px-4 xl:py-3"
                      >
                        <FiDownload
                          className="h-4 w-4 text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100 max-[440px]:h-[18px] max-[440px]:w-[18px] xl:h-5 xl:w-5"
                          aria-hidden="true"
                        />
                        <span className="text-xs leading-none font-semibold text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100 max-[440px]:text-[13px] xl:text-sm">
                          อ่านเพิ่มเติม
                        </span>
                      </button>
                    ) : (
                      <div className="shrink-0" />
                    )}

                    {displayDate ? (
                      <p className="min-w-0 text-right text-xs font-medium text-gray-500 max-[440px]:text-[13px] xl:text-sm">
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
        {hasMultipleWarnings ? (
          <div
            className="mt-4 flex items-center justify-center gap-2 max-[440px]:mt-[34px] xl:mt-5"
            aria-label="ตัวบอกตำแหน่งประกาศ"
          >
            {warnings.map((warning, index) => {
              const active = activeIndex === index;

              return (
                <button
                  key={`dot-${warning.key}`}
                  type="button"
                  onClick={() => {
                    swiper?.slideToLoop(index);
                  }}
                  className={[
                    "h-2 cursor-pointer rounded-full transition-all duration-200 max-[440px]:h-[9px] xl:h-2.5",
                    active
                      ? "w-6 bg-gray-500 max-[440px]:w-[30px] xl:w-7"
                      : "w-2 bg-gray-300 hover:bg-gray-400 max-[440px]:w-[9px] xl:w-2.5",
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