"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Components
import ZoomableImage from "@/app/components/ZoomableImage";
// library
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
// icons
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiMap } from "react-icons/fi";
// types
import type { UpperWindItem, UpperWindResponse, SoundingStation, ScrollDir } from "@/app/types/map";

/* -------------------- Config API routes -------------------- */

const basePath = process.env.NEXT_PUBLIC_API_ROUTE ?? "";
const MAP_API_ROUTE = `${basePath}/api/map`;

/* -------------------- Config pure helpers -------------------- */

// กำหนด Menu ประเภทแผนที่
const Type_Menu = [
  "แผนที่อากาศผิวพื้น",
  "แผนที่ลมชั้นบนระดับ 925 hPa",
  "แผนที่ลมชั้นบนระดับ 850 hPa",
  "แผนที่ลมชั้นบนระดับ 700 hPa",
  "แผนที่ลมชั้นบนระดับ 500 hPa",
  "แผนที่ลมชั้นบนระดับ 300 hPa",
  "แผนที่ลมชั้นบนระดับ 200 hPa",
  "แผนที่ลมชั้นบนระดับ 600 m",
  "แผนที่ลมชั้นบนรวม 4 ระดับ",
  "แผนที่รายละเอียดประเทศไทยและใกล้เคียง",
  "แผนที่ค่าเปลี่ยนแปลงความกดอากาศ",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิ",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิจุดน้ำค้าง",
  "แผนที่หยั่งอากาศ",
] as const;

const SOUNDING_TYPE_LABEL = "แผนที่หยั่งอากาศ" as const;
const SOUNDING_API_KEY = "AirMapWeather" as const;

// ชื่อเดือนภาษาไทย
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
] as const;

/* -------------------- Functions -------------------- */

function extractSoundingStations(item: UpperWindItem): SoundingStation[] {
  const seenTitle = new Set<string>();
  const out: SoundingStation[] = [];

  for (const key of Object.keys(item)) {
    if (!key.endsWith("Title")) continue;

    const base = key.replace(/Title$/, "");
    const title = item[key as keyof UpperWindItem] as string;
    const imagePath = item[`${base}ImagePath` as keyof UpperWindItem] as string;

    if (seenTitle.has(title)) continue;
    seenTitle.add(title);

    out.push({ id: title, title, imagePath });
  }

  return out;
}

function parseContentDate(raw: string): Date {
  return new Date(raw.replace(" ", "T").replace(/\.\d+$/, ""));
}

function thaiDateTime(d: Date): string {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${day} ${month} ${yearBE} ${time} น.`;
}

function normalizeToEntries(data: UpperWindResponse["data"]) {
  const out: Array<{ apiKey: string; item: UpperWindItem }> = [];

  for (const [apiKey, value] of Object.entries(data)) {
    const items = value as UpperWindItem[];
    for (const item of items) {
      out.push({ apiKey, item });
    }
  }

  return out;
}

function isMatchType(
  menuLabel: string,
  entry: { apiKey: string; item: UpperWindItem }
): boolean {
  const title = entry.item.title as string;
  const alt = entry.item.alt as string;
  const apiKey = entry.apiKey;

  if (menuLabel === SOUNDING_TYPE_LABEL && apiKey === SOUNDING_API_KEY) return true;
  if (title.includes(menuLabel) || alt.includes(menuLabel)) return true;

  const num = menuLabel.match(/(\d{3,4})\s*hPa/u)?.[1];
  if (num && apiKey.includes(num)) return true;

  const is600m = menuLabel.includes("600") && menuLabel.toLowerCase().includes("m");
  if (is600m && apiKey.toLowerCase().includes("600")) return true;

  return false;
}

function getTimeOptions(items: UpperWindItem[]) {
  const times = new Map<string, Date>();

  for (const it of items) {
    const key = it.contentdate as string;
    times.set(key, parseContentDate(key));
  }

  return Array.from(times.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([key, date]) => ({ key, label: thaiDateTime(date) }));
}

/* -------------------- component -------------------- */

function MapPage() {
  // type dropdown
  const [typeOpen, setTypeOpen] = useState(false);
  const typeWrapRef = useRef<HTMLDivElement | null>(null);

  // date/time dropdown
  const [timeOpen, setTimeOpen] = useState(false);
  const timeWrapRef = useRef<HTMLDivElement | null>(null);

  const [raw, setRaw] = useState<UpperWindResponse>({
    success: true,
    data: {} as UpperWindResponse["data"],
    message: "",
  });
  const [loading, setLoading] = useState(true);

  // dropdown state
  const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>(Type_Menu[0]);
  const [selectedTimeKey, setSelectedTimeKey] = useState<string>("");

  // apply เมื่อกดปุ่ม “แสดงแผนที่”
  const [applied, setApplied] = useState<{ typeLabel: string; timeKey: string }>({
    typeLabel: Type_Menu[0],
    timeKey: "",
  });

  // Swiper ref
  const soundingSwiperRef = useRef<SwiperType | null>(null);

  /* -------------------- API fetchers -------------------- */

  async function load() {
    setLoading(true);

    const res = await fetch(MAP_API_ROUTE, { cache: "no-store" });
    const json = (await res.json()) as UpperWindResponse;

    setRaw(json);

    const allEntries = normalizeToEntries(json.data);
    const firstType =
      Type_Menu.find((label) => allEntries.some((e) => isMatchType(label, e))) ?? Type_Menu[0];

    const firstItems = allEntries.filter((e) => isMatchType(firstType, e)).map((e) => e.item);
    const firstTimes = getTimeOptions(firstItems);
    const firstTime = firstTimes[0].key;

    setSelectedTypeLabel(firstType);
    setSelectedTimeKey(firstTime);
    setApplied({ typeLabel: firstType, timeKey: firstTime });

    setTypeOpen(false);
    setTimeOpen(false);
    setLoading(false);
  }

  /* -------------------- useEffect -------------------- */

  useEffect(() => {
    load();
  }, []);

  // ปิด dropdown เมื่อคลิกนอกกรอบ + Esc
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (typeWrapRef.current && !typeWrapRef.current.contains(t)) setTypeOpen(false);
      if (timeWrapRef.current && !timeWrapRef.current.contains(t)) setTimeOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setTypeOpen(false);
        setTimeOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* -------------------- useMemo -------------------- */

  const entries = useMemo(() => normalizeToEntries(raw.data), [raw]);

  const itemsByTypeLabel = useMemo(() => {
    const map = new Map<string, UpperWindItem[]>();

    for (const label of Type_Menu) {
      const items = entries.filter((e) => isMatchType(label, e)).map((e) => e.item);

      const sorted = [...items].sort((a, b) => {
        const da = parseContentDate(a.contentdate as string).getTime();
        const db = parseContentDate(b.contentdate as string).getTime();
        return db - da;
      });

      map.set(label, sorted);
    }

    return map;
  }, [entries]);

  const selectedItems = useMemo(
    () => itemsByTypeLabel.get(selectedTypeLabel) ?? [],
    [itemsByTypeLabel, selectedTypeLabel]
  );

  const timeOptions = useMemo(() => getTimeOptions(selectedItems), [selectedItems]);

  // เปลี่ยนประเภทแล้ว sync เวลา
  useEffect(() => {
    if (!selectedTypeLabel) return;

    const items = itemsByTypeLabel.get(selectedTypeLabel) ?? [];
    if (!items.length) return;

    const times = getTimeOptions(items);
    const has = times.some((t) => t.key === selectedTimeKey);

    if (!has) setSelectedTimeKey(times[0].key);
    setTimeOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeLabel]);

  const selectedHasData = selectedItems.length > 0;

  const selectedTimeLabel =
    timeOptions.find((t) => t.key === selectedTimeKey)?.label ?? timeOptions[0]?.label ?? "";

  const shown = useMemo(() => {
    const items = itemsByTypeLabel.get(applied.typeLabel) ?? [];
    return items.find((it) => it.contentdate === applied.timeKey) ?? items[0];
  }, [applied, itemsByTypeLabel]);

  const shownDate = shown ? parseContentDate(shown.contentdate as string) : new Date();

  const appliedTypeLabel = applied.typeLabel;
  const appliedTimeKey = applied.timeKey;

  const appliedItems = itemsByTypeLabel.get(appliedTypeLabel) ?? [];
  const appliedTimeOptions = getTimeOptions(appliedItems);

  const appliedTimeLabel =
    appliedTimeOptions.find((t) => t.key === appliedTimeKey)?.label ?? thaiDateTime(shownDate);

  // ===== Sounding (AirMapWeather) =====
  const isSoundingApplied = appliedTypeLabel === SOUNDING_TYPE_LABEL;

  const soundingStations = useMemo(
    () => (isSoundingApplied && shown ? extractSoundingStations(shown) : []),
    [isSoundingApplied, shown]
  );

  const [activeSoundingId, setActiveSoundingId] = useState<string>("");

  useEffect(() => {
    if (!isSoundingApplied || !soundingStations.length) {
      setActiveSoundingId("");
      return;
    }

    setActiveSoundingId((prev) =>
      prev && soundingStations.some((s) => s.id === prev) ? prev : soundingStations[0].id
    );
  }, [isSoundingApplied, soundingStations]);

  const activeSoundingIndex = useMemo(() => {
    if (!soundingStations.length) return 0;
    const idx = soundingStations.findIndex((s) => s.id === activeSoundingId);
    return idx >= 0 ? idx : 0;
  }, [soundingStations, activeSoundingId]);

  useEffect(() => {
    if (!isSoundingApplied) return;

    const swiper = soundingSwiperRef.current;
    if (!swiper || !soundingStations.length) return;

    const currentIndex = swiper.realIndex ?? swiper.activeIndex ?? 0;
    if (currentIndex === activeSoundingIndex) return;

    if (swiper.params.loop) {
      swiper.slideToLoop(activeSoundingIndex, 550);
    } else {
      swiper.slideTo(activeSoundingIndex, 550);
    }
  }, [isSoundingApplied, activeSoundingIndex, soundingStations.length]);

  const activeSounding = isSoundingApplied ? soundingStations[activeSoundingIndex] : undefined;

  const imageSrc = isSoundingApplied
    ? activeSounding?.imagePath ?? ""
    : ((shown?.url as string) ?? "");

  const descText = isSoundingApplied ? "" : ((shown?.description as string) ?? "");

  /* -------------------- UI -------------------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="relative min-h-60 border-b border-gray-200">
          <div
            className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
            <div className="space-y-3 animate-pulse">
              <div className="h-8 w-96 rounded bg-gray-200" />
              <div className="h-5 w-130 rounded bg-gray-200" />
              <div className="mt-4 h-11 w-full max-w-4xl rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mx-auto h-130 max-w-130 rounded bg-gray-200" />
          <div className="mx-auto mt-6 h-4 w-180 max-w-full rounded bg-gray-200" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="relative min-h-60 border-b border-gray-200">
        <div
          className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
          style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              แผนที่อากาศผิวพื้นระดับต่างๆ
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="whitespace-nowrap">{appliedTypeLabel}</span>
                <span className="whitespace-nowrap text-gray-600">- {appliedTimeLabel}</span>
              </span>
            </p>
          </div>

          {/* Controls row */}
          <div className="mt-5 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:items-center sm:justify-start">
            {/* Type dropdown */}
            <div ref={typeWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setTypeOpen((v) => !v);
                  setTimeOpen(false);
                }}
                aria-expanded={typeOpen}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-5 py-3 text-left text-sm font-medium text-gray-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
                  <FiMap className="h-6 w-6 shrink-0 text-gray-800" />
                  <span className="block truncate">{selectedTypeLabel}</span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out",
                    typeOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {typeOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {Type_Menu.map((label) => {
                        const has = (itemsByTypeLabel.get(label) ?? []).length > 0;
                        const active = label === selectedTypeLabel;

                        return (
                          <button
                            key={label}
                            type="button"
                            disabled={!has}
                            onClick={() => {
                              if (!has) return;
                              setSelectedTypeLabel(label);
                              setTypeOpen(false);
                              setTimeOpen(false);
                            }}
                            className={[
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
                              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                              !has ? "cursor-not-allowed opacity-40 hover:bg-white" : "",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Date/Time dropdown */}
            <div ref={timeWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                disabled={!selectedHasData}
                onClick={() => {
                  if (!selectedHasData) return;
                  setTimeOpen((v) => !v);
                  setTypeOpen(false);
                }}
                aria-expanded={timeOpen}
                className={[
                  "flex w-full items-center justify-between rounded-lg border bg-white px-5 py-3 text-left text-sm font-medium outline-none",
                  selectedHasData
                    ? "cursor-pointer border-gray-300 text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    : "cursor-not-allowed border-gray-200 text-gray-400",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
                  <FiCalendar
                    className={[
                      "h-6 w-6 shrink-0",
                      selectedHasData ? "text-gray-800" : "text-gray-400",
                    ].join(" ")}
                  />
                  <span className="block truncate">
                    {selectedHasData ? selectedTimeLabel : "ไม่มีข้อมูล"}
                  </span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 transition-transform duration-300 ease-in-out",
                    selectedHasData ? "text-gray-500" : "text-gray-300",
                    timeOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {selectedHasData && timeOptions.length > 1 && timeOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {timeOptions.map((t) => {
                        const active = t.key === selectedTimeKey;

                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => {
                              setSelectedTimeKey(t.key);
                              setTimeOpen(false);
                            }}
                            className={[
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
                              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Button */}
            <button
              type="button"
              disabled={!selectedHasData || !selectedTimeKey}
              onClick={() => {
                setApplied({ typeLabel: selectedTypeLabel, timeKey: selectedTimeKey });
                setTypeOpen(false);
                setTimeOpen(false);
              }}
              className={[
                "h-12 cursor-pointer whitespace-nowrap rounded-lg px-6 text-sm font-semibold text-white",
                selectedHasData && selectedTimeKey
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "cursor-not-allowed bg-gray-300",
              ].join(" ")}
            >
              แสดงแผนที่
            </button>
          </div>
        </div>
      </section>

      {/* Title Map + Desktop arrows */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:py-6">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="text-lg font-semibold text-gray-900 sm:text-2xl">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
              <span className="whitespace-nowrap">
                {isSoundingApplied ? `${appliedTypeLabel} -` : appliedTypeLabel}
              </span>

              <span className="whitespace-nowrap text-sm font-medium text-gray-600">
                {isSoundingApplied ? appliedTimeLabel : `- ${appliedTimeLabel}`}
              </span>

              {isSoundingApplied ? (
                <span className="whitespace-nowrap text-sm font-medium text-gray-500">
                  ({soundingStations.length} จังหวัด)
                </span>
              ) : null}
            </div>
          </div>

          {isSoundingApplied ? (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => soundingSwiperRef.current?.slidePrev()}
                disabled={soundingStations.length <= 1}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm font-semibold",
                  soundingStations.length <= 1
                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                    : "cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-label="ก่อนหน้า"
              >
                <FiChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => soundingSwiperRef.current?.slideNext()}
                disabled={soundingStations.length <= 1}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm font-semibold",
                  soundingStations.length <= 1
                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                    : "cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-label="ถัดไป"
              >
                <FiChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Sounding Cards */}
      {isSoundingApplied ? (
        <section className="mx-auto max-w-7xl px-0 pb-2 sm:px-4">
          <Swiper
            modules={[Autoplay]}
            onSwiper={(swiper) => {
              soundingSwiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              const idx = swiper.realIndex ?? 0;
              const id = soundingStations[idx]?.id ?? "";
              if (id) setActiveSoundingId(id);
            }}
            loop={soundingStations.length > 1}
            autoplay={
              soundingStations.length > 1
                ? {
                  delay: 10000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
                : false
            }
            speed={550}
            spaceBetween={12}
            slidesPerView="auto"
            grabCursor
            breakpoints={{
              640: {
                spaceBetween: 16,
              },
            }}
            className="!px-4 sm:!px-0"
          >
            {soundingStations.map((s, idx) => {
              const active = idx === activeSoundingIndex;

              return (
                <SwiperSlide key={`${s.id}-${idx}`} className="!h-auto !w-[220px] sm:!w-72">
                  <button
                    type="button"
                    onClick={() => setActiveSoundingId(s.id)}
                    className={[
                      "relative h-24 w-full cursor-pointer overflow-hidden rounded-xl border p-4 text-left shadow-sm transition sm:h-auto",
                      active
                        ? "border-emerald-300 bg-white ring-2 ring-emerald-100"
                        : "border-sky-100 bg-gray-50 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute bottom-4 left-0 top-4 w-1 rounded-r transition",
                        active ? "bg-emerald-600" : "bg-transparent",
                      ].join(" ")}
                    />

                    <div className="flex h-full flex-col justify-center pl-2 sm:block">
                      <div className="text-sm font-semibold leading-tight text-gray-900">
                        จังหวัด {s.title}
                      </div>
                      <div className="mt-1 text-xs font-medium leading-tight text-gray-500">
                        แผนที่หยั่งอากาศ
                      </div>
                      <div className="mt-1 text-xs font-medium leading-tight text-gray-500">
                        วันที่ {appliedTimeLabel}
                      </div>
                    </div>
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      ) : null}

      {/* หัวข้อจังหวัด (Sounding) เหนือรูป */}
      {isSoundingApplied && activeSounding?.title ? (
        <section className="mx-auto max-w-7xl px-4 pb-3">
          <h2 className="text-center text-base font-semibold text-gray-900">
            จังหวัด {activeSounding.title}
          </h2>
        </section>
      ) : null}

      {/* Description (mobile) */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:hidden">
        {!isSoundingApplied ? (
          <p className="mx-auto text-sm leading-relaxed text-gray-700">{descText}</p>
        ) : null}
      </section>

      {/* Image */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        {imageSrc ? (
          <div className="flex justify-center">
            <div className="w-full max-w-130">
              <div className="shadow-xl">
                <ZoomableImage
                  src={imageSrc}
                  alt={
                    isSoundingApplied
                      ? `แผนที่หยั่งอากาศ - จังหวัด ${activeSounding?.title ?? ""}`
                      : ((shown?.alt as string) || (shown?.title as string) || "Map")
                  }
                  width={1600}
                  height={1000}
                  className="h-auto w-full"
                  clickAnywhereOnDesktop={false}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-600">ไม่พบรูปแผนที่</p>
        )}

        {/* Description (desktop) */}
        {!isSoundingApplied ? (
          <div className="mx-auto mt-6 hidden max-w-5xl border-t border-gray-100 pt-4 sm:block">
            <p className="text-center text-sm text-gray-700">{descText}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default MapPage;