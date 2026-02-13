"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ZoomableImage from "@/app/components/ZoomableImage";
import { FiCalendar, FiChevronDown, FiMap } from "react-icons/fi";
import type { UpperWindItem, UpperWindResponse } from "@/app/types/map";

const MAP_API_ROUTE = `${process.env.NEXT_PUBLIC_API_ROUTE ?? "/test2"}/api/map`;

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
  "แผนที่ค่าความเปลี่ยนแปลงความกดอากาศ",
  "แผนที่ค่าความเปลี่ยนแปลงอุณหภูมิ",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิจุดน้ำค้าง",
  "แผนที่หยั่งอากาศ",
] as const;

// ชื่อเดือนภาษาไทย (ใช้แสดง label เวลา)
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

/** แปลง "2026-0x-x0 0x:00:00.0000000" -> Date (ใช้ทำ sort/label เวลา) */
function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** แสดงวันเวลาแบบไทย + ปี พ.ศ. (ใช้ใน dropdown เวลา/หัวข้อ) */
function thaiDateTime(d: Date): string {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()] ?? "";
  const yearBE = d.getFullYear() + 543;
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} ${month} ${yearBE} ${time} น.`;
}

/** ทำ data (object) -> list entries เพื่อใช้งานง่าย + เก็บเฉพาะที่มี url */
function normalizeToEntries(
  data: UpperWindResponse["data"] | null | undefined
): Array<{ apiKey: string; item: UpperWindItem }> {
  const out: Array<{ apiKey: string; item: UpperWindItem }> = [];
  const d = data ?? {};

  for (const [apiKey, value] of Object.entries(d)) {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    for (const it of arr) {
      if (!it) continue;
      if (typeof it.url !== "string" || it.url === "") continue;
      out.push({ apiKey, item: it });
    }
  }

  return out;
}

function isMatchType(menuLabel: string, entry: { apiKey: string; item: UpperWindItem }): boolean {
  const label = menuLabel;
  const title = entry.item.title ?? "";
  const alt = entry.item.alt ?? "";
  const apiKey = entry.apiKey ?? "";

  // หลัก: title/alt ต้องมี label
  if (title.includes(label) || alt.includes(label)) return true;

  // fallback เบาๆ: ดึงเลข hPa จากเมนูไปเช็คใน apiKey (เผื่อ title/alt ว่าง)
  const num = label.match(/(\d{3,4})\s*hPa/u)?.[1];
  if (num && apiKey.includes(num)) return true;

  // 600 m
  const is600m = label.includes("600") && label.toLowerCase().includes("m");
  if (is600m && apiKey.toLowerCase().includes("600")) return true;

  return false;
}

/** สร้างตัวเลือกเวลา (unique) จาก contentdate + เรียงล่าสุดก่อน */
function getTimeOptions(items: UpperWindItem[]) {
  const times = new Map<string, Date>();

  for (const it of items) {
    const key = it.contentdate ?? "";
    const dt = parseContentDate(key);
    if (key && dt) times.set(key, dt);
  }

  return Array.from(times.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([key, date]) => ({ key, label: thaiDateTime(date) }));
}

function MapPage() {
  // type dropdown
  const [typeOpen, setTypeOpen] = useState(false);
  const typeWrapRef = useRef<HTMLDivElement | null>(null);

  // date/time dropdown
  const [timeOpen, setTimeOpen] = useState(false);
  const timeWrapRef = useRef<HTMLDivElement | null>(null);

  const [raw, setRaw] = useState<UpperWindResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dropdown state
  const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>("");
  const [selectedTimeKey, setSelectedTimeKey] = useState<string>("");

  // apply เมื่อกดปุ่ม “แสดงแผนที่”
  const [applied, setApplied] = useState<{ typeLabel: string; timeKey: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(MAP_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as UpperWindResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !json?.data) throw new Error(json?.message || "Bad response");

      setRaw(json);

      // ค่าเริ่มต้น: หา type แรกใน Type_Menu ที่มีข้อมูลจริง
      const entries = normalizeToEntries(json.data);

      const firstType =
        Type_Menu.find((label) => entries.some((e) => isMatchType(label, e))) ?? Type_Menu[0];

      const firstItems = entries.filter((e) => isMatchType(firstType, e)).map((e) => e.item);
      const firstTimes = getTimeOptions(firstItems);
      const firstTime = firstTimes[0]?.key ?? (firstItems[0]?.contentdate ?? "");

      setSelectedTypeLabel(firstType);
      setSelectedTimeKey(firstTime);
      setApplied({ typeLabel: firstType, timeKey: firstTime });

      setTypeOpen(false);
      setTimeOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

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

  const entries = useMemo(() => normalizeToEntries(raw?.data), [raw]);

  // map: Type_Menu label -> items ที่ match จาก API
  const itemsByTypeLabel = useMemo(() => {
    const map = new Map<string, UpperWindItem[]>();

    for (const label of Type_Menu) {
      const items = entries.filter((e) => isMatchType(label, e)).map((e) => e.item);

      // sort ล่าสุดก่อนด้วย contentdate
      const sorted = [...items].sort((a, b) => {
        const da = parseContentDate(a.contentdate ?? "")?.getTime() ?? 0;
        const db = parseContentDate(b.contentdate ?? "")?.getTime() ?? 0;
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

  // เปลี่ยนประเภทแล้ว sync เวลาให้เป็นเวลาล่าสุดของประเภทนั้น (ถ้าเวลาที่เลือกเดิมไม่มี)
  useEffect(() => {
    if (!selectedTypeLabel) return;

    const items = itemsByTypeLabel.get(selectedTypeLabel) ?? [];
    if (!items.length) {
      setSelectedTimeKey("");
      setTimeOpen(false);
      return;
    }

    const times = getTimeOptions(items);
    const has = times.some((t) => t.key === selectedTimeKey);
    if (!has) setSelectedTimeKey(times[0]?.key ?? (items[0]?.contentdate ?? ""));
    setTimeOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeLabel]);

  const selectedHasData = selectedItems.length > 0;

  // label สำหรับปุ่มเวลา (รองรับ 0/1/หลายตัวเลือก)
  const selectedTimeLabel =
    timeOptions.find((t) => t.key === selectedTimeKey)?.label ??
    timeOptions[0]?.label ??
    "-";

  // shown: อิงจาก applied (หลังกดปุ่ม) ถ้าไม่มีใช้ selected
  const shown = useMemo(() => {
    const typeLabel = applied?.typeLabel ?? selectedTypeLabel;
    const timeKey = applied?.timeKey ?? selectedTimeKey;

    const items = itemsByTypeLabel.get(typeLabel) ?? [];
    if (!items.length) return null;

    const exact = items.find((it) => (it.contentdate ?? "") === timeKey);
    return exact ?? items[0] ?? null;
  }, [applied, selectedTypeLabel, selectedTimeKey, itemsByTypeLabel]);

  const imageSrc = shown?.url ?? "";
  const descText = shown?.description ?? "";
  const shownDate = parseContentDate(shown?.contentdate ?? "");

  const appliedTypeLabel = applied?.typeLabel ?? selectedTypeLabel;
  const appliedTimeKey = applied?.timeKey ?? selectedTimeKey;

  const appliedItems = itemsByTypeLabel.get(appliedTypeLabel) ?? [];
  const appliedTimeOptions = getTimeOptions(appliedItems);

  const appliedTimeLabel =
    appliedTimeOptions.find((t) => t.key === appliedTimeKey)?.label ??
    (shownDate ? thaiDateTime(shownDate) : shown?.contentdate ?? "");

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
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

  /** ===== Error ===== */
  if (error || !raw) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">แผนที่อากาศผิวพื้นระดับต่างๆ</h1>
              <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">{error || "-"}</p>
              <button
                type="button"
                onClick={load}
                className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /** ===== UI ===== */
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">แผนที่อากาศผิวพื้นระดับต่างๆ</h1>

            <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="whitespace-nowrap">{appliedTypeLabel || "แผนที่"}</span>
                {appliedTimeLabel ? (
                  <span className="whitespace-nowrap text-gray-600">- {appliedTimeLabel}</span>
                ) : null}
              </span>
            </p>
          </div>

          {/* Controls row (UI เหมือนตัวอย่าง) */}
          <div className="flex flex-col gap-4 mt-5 md:flex-row md:items-center sm:justify-start sm:mt-10">
            {/* Type dropdown */}
            <div ref={typeWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setTypeOpen((v) => !v);
                  setTimeOpen(false);
                }}
                aria-expanded={typeOpen}
                className="flex py-3 w-full items-center justify-between
                  cursor-pointer rounded-lg border border-gray-300 bg-white
                  px-5 text-left text-sm font-medium text-gray-800 outline-none
                  focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex items-center justify-start gap-4 min-w-0">
                  <FiMap className="h-6 w-6 shrink-0 text-gray-800" />
                  <span className="block truncate">{selectedTypeLabel || "—"}</span>
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
                              "w-full text-left px-5 py-3 text-sm font-medium cursor-pointer",
                              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                              !has ? "opacity-40 cursor-not-allowed hover:bg-white" : "",
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

            {/* Date/Time dropdown (รองรับหลายวัน/หลายเวลา) */}
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
                  "flex py-3 w-full items-center justify-between rounded-lg border bg-white px-5 text-left text-sm font-medium outline-none",
                  selectedHasData
                    ? "border-gray-300 text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 cursor-pointer"
                    : "border-gray-200 text-gray-400 cursor-not-allowed",
                ].join(" ")}
              >
                <span className="flex items-center justify-start gap-4 min-w-0">
                  <FiCalendar
                    className={[
                      "h-6 w-6 shrink-0",
                      selectedHasData ? "text-gray-800" : "text-gray-400",
                    ].join(" ")}
                  />
                  <span className="block truncate">{selectedHasData ? selectedTimeLabel : "ไม่มีข้อมูล"}</span>
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

              {/* dropdown list: โชว์เมื่อมีข้อมูล และมีมากกว่า 1 ตัวเลือก (หรืออยากให้ 1 ตัวเลือกก็เปิดได้ ให้เอาเงื่อนไข timeOptions.length > 1 ออก) */}
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
                              "w-full text-left px-5 py-3 text-sm font-medium cursor-pointer",
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
                "h-12 rounded-lg px-6 text-sm font-semibold text-white whitespace-nowrap cursor-pointer sm:w-96 md:w-50",
                selectedHasData && selectedTimeKey
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              แสดงแผนที่
            </button>
          </div>
        </div>
      </section>

      {/* Title Map */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:py-6">
        <div className="text-lg font-semibold text-gray-900 sm:text-2xl">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span>{appliedTypeLabel || "แผนที่"}</span>
            {appliedTimeLabel ? <span className="text-sm font-medium text-gray-600">{appliedTimeLabel}</span> : null}
          </div>
        </div>
      </section>

      {/* Description (mobile) */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:hidden">
        <p className="mx-auto text-sm leading-relaxed text-gray-700">{descText || "-"}</p>
      </section>

      {/* Image (Zoomable) */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        {imageSrc ? (
          <div className="flex justify-center">
            <div className="w-full max-w-130">
              <div className="shadow-xl">
                <ZoomableImage
                  src={imageSrc}
                  alt={(shown?.alt ?? shown?.title ?? "Map") || "Map"}
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
        <div className="hidden mx-auto mt-6 max-w-5xl border-t border-gray-100 pt-4 sm:block">
          <p className="text-center text-sm text-gray-700">{descText || "-"}</p>
        </div>
      </section>
    </main>
  );
}

export default MapPage;
