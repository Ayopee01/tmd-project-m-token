"use client";

import React, { useEffect, useMemo, useState } from "react";
import ZoomableImage from "@/app/components/ZoomableImage";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import type { UpperWindItem, UpperWindResponse } from "@/app/types/map";

const MAP_API_ROUTE = `${process.env.NEXT_PUBLIC_API_ROUTE ?? "/test2"}/api/map`;

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

/** ---- Helpers ---- */
function clean(v: unknown): string {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

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

function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toBEYear(d: Date): number {
  return d.getFullYear() + 543;
}

function thaiDateTime(d: Date): string {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()] ?? "";
  const year = toBEYear(d);
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} ${month} ${year} ${time} น.`;
}

/** ตัดวันเวลาออกจาก title/alt เพื่อให้เหลือ “ชื่อประเภท” */
function stripThaiDateTimeSuffix(input: string): string {
  const s = clean(input);
  if (!s) return "";

  // ถ้ามีขีด - / – / — ให้ตัดหลังขีด (กรณี "แผนที่... - 22 มกราคม ...")
  const dashed = s.split(/[-–—]/u)[0];
  const base1 = clean(dashed);

  // ถ้ามีชื่อเดือนภาษาไทย ให้ตัดตั้งแต่ก่อน “เลขวัน” ที่มาก่อนชื่อเดือน
  let cut = base1;
  let monthIndex = -1;
  for (const m of THAI_MONTHS) {
    const i = cut.indexOf(m);
    if (i >= 0 && (monthIndex < 0 || i < monthIndex)) monthIndex = i;
  }
  if (monthIndex >= 0) {
    const spaceBeforeMonth = cut.lastIndexOf(" ", monthIndex - 1); // ช่องว่างระหว่าง "วัน" กับ "เดือน"
    const spaceBeforeDay = cut.lastIndexOf(" ", spaceBeforeMonth - 1); // ช่องว่างก่อน "วัน"
    if (spaceBeforeDay >= 0) cut = cut.slice(0, spaceBeforeDay);
    else if (spaceBeforeMonth >= 0) cut = cut.slice(0, spaceBeforeMonth);
  }

  // เผื่อกรณีไม่มีเดือน แต่มีเวลา เช่น "07:00"
  cut = cut.replace(/\s+\d{1,2}:\d{2}.*$/u, "");

  return clean(cut);
}

/** normalize: data เป็น list entries (รองรับ item เดี่ยว / array) */
function normalizeToEntries(
  data: UpperWindResponse["data"] | null | undefined
): Array<{ apiKey: string; item: UpperWindItem }> {
  const out: Array<{ apiKey: string; item: UpperWindItem }> = [];
  const d = data ?? {};

  for (const [apiKey, value] of Object.entries(d)) {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    for (const it of arr) {
      if (!it) continue;
      if (!clean(it.url)) continue; // เก็บเฉพาะที่มี url
      out.push({ apiKey, item: it });
    }
  }
  return out;
}

/** จับคู่ “ประเภทจาก Type_Menu” กับ item ใน API */
function isMatchType(menuLabel: string, entry: { apiKey: string; item: UpperWindItem }): boolean {
  const label = clean(menuLabel);

  const t1 = stripThaiDateTimeSuffix(clean(entry.item.title));
  const t2 = stripThaiDateTimeSuffix(clean(entry.item.alt));
  const k = clean(entry.apiKey);

  // match แบบตรง ๆ ก่อน
  if (t1 === label || t2 === label) return true;

  // match แบบ contains เผื่อ title มีคำเพิ่มเล็กน้อย
  if (t1.includes(label) || t2.includes(label)) return true;

  // match ด้วยเลขระดับ (เผื่อ key เป็น UpperWind925hPa แต่ title แปลก)
  const num = label.match(/(\d{3,4})\s*hPa/u)?.[1];
  if (num && k.includes(num)) return true;

  // match 600 m
  const is600m = label.includes("600") && label.toLowerCase().includes("m");
  if (is600m && (k.toLowerCase().includes("600") || t1.includes("600") || t2.includes("600"))) {
    return true;
  }

  return false;
}

/** time options (unique) จาก items ของ type นั้น */
function getTimeOptions(items: UpperWindItem[]) {
  const times = new Map<string, Date>();
  for (const it of items) {
    const key = clean(it.contentdate);
    const dt = parseContentDate(key);
    if (key && dt) times.set(key, dt);
  }
  return Array.from(times.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([key, date]) => ({ key, label: thaiDateTime(date) }));
}

export default function UpperWindMapPage() {
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

      // ตั้งค่าเริ่มต้น: หา type แรกใน Type_Menu ที่ “มีข้อมูลจริง”
      const entries = normalizeToEntries(json.data);

      const firstType =
        Type_Menu.find((label) => entries.some((e) => isMatchType(label, e))) ?? Type_Menu[0];

      const firstItems = entries.filter((e) => isMatchType(firstType, e)).map((e) => e.item);
      const firstTimes = getTimeOptions(firstItems);
      const firstTime = firstTimes[0]?.key ?? clean(firstItems[0]?.contentdate) ?? "";

      setSelectedTypeLabel(firstType);
      setSelectedTimeKey(firstTime);
      setApplied({ typeLabel: firstType, timeKey: firstTime });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const entries = useMemo(() => normalizeToEntries(raw?.data), [raw]);

  // ✅ itemsByTypeLabel: map ประเภทใน Type_Menu -> items ที่ match จาก API
  const itemsByTypeLabel = useMemo(() => {
    const map = new Map<string, UpperWindItem[]>();

    for (const label of Type_Menu) {
      const items = entries.filter((e) => isMatchType(label, e)).map((e) => e.item);

      // sort ล่าสุดก่อน
      const sorted = [...items].sort((a, b) => {
        const da = parseContentDate(clean(a.contentdate))?.getTime() ?? 0;
        const db = parseContentDate(clean(b.contentdate))?.getTime() ?? 0;
        return db - da;
      });

      map.set(label, sorted);
    }

    return map;
  }, [entries]);

  const selectedItems = useMemo(() => {
    return itemsByTypeLabel.get(selectedTypeLabel) ?? [];
  }, [itemsByTypeLabel, selectedTypeLabel]);

  // ✅ เวลา: ตามประเภทที่เลือก
  const timeOptions = useMemo(() => getTimeOptions(selectedItems), [selectedItems]);

  // เปลี่ยนประเภทแล้ว sync เวลาให้เป็นเวลาล่าสุดของประเภทนั้น (ถ้าเวลาที่เลือกเดิมไม่มี)
  useEffect(() => {
    if (!selectedTypeLabel) return;

    const items = itemsByTypeLabel.get(selectedTypeLabel) ?? [];
    if (!items.length) {
      setSelectedTimeKey("");
      return;
    }

    const times = getTimeOptions(items);
    const has = times.some((t) => clean(t.key) === clean(selectedTimeKey));
    if (!has) setSelectedTimeKey(times[0]?.key ?? clean(items[0]?.contentdate) ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeLabel]);

  const selectedHasData = selectedItems.length > 0;
  const showTimeDropdown = timeOptions.length > 1;

  // ✅ shown: อิงจาก applied (หลังกดปุ่ม) ถ้าไม่มีใช้ selected
  const shown = useMemo(() => {
    const typeLabel = applied?.typeLabel ?? selectedTypeLabel;
    const timeKey = clean(applied?.timeKey ?? selectedTimeKey);

    const items = itemsByTypeLabel.get(typeLabel) ?? [];
    if (!items.length) return null;

    const exact = items.find((it) => clean(it.contentdate) === timeKey);
    return exact ?? items[0] ?? null;
  }, [applied, selectedTypeLabel, selectedTimeKey, itemsByTypeLabel]);

  const imageSrc = clean(shown?.url);
  const descText = clean(shown?.description);
  const shownDate = shown?.contentdate ? parseContentDate(clean(shown.contentdate)) : null;

  const appliedTypeLabel = applied?.typeLabel ?? selectedTypeLabel;
  const appliedTimeKey = applied?.timeKey ?? selectedTimeKey;

  const appliedItems = itemsByTypeLabel.get(appliedTypeLabel) ?? [];
  const appliedTimeOptions = getTimeOptions(appliedItems);
  const appliedTimeLabel =
    appliedTimeOptions.find((t) => clean(t.key) === clean(appliedTimeKey))?.label ??
    (shownDate ? thaiDateTime(shownDate) : clean(shown?.contentdate));

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-96 rounded bg-gray-200" />
              <div className="h-5 w-[520px] rounded bg-gray-200" />
              <div className="mt-4 h-11 w-full max-w-4xl rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mx-auto h-[520px] max-w-[520px] rounded bg-gray-200" />
          <div className="mx-auto mt-6 h-4 w-[720px] max-w-full rounded bg-gray-200" />
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
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
                แผนที่อากาศผิวพื้นระดับต่างๆ
              </h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">
                ไม่สามารถโหลดข้อมูลได้ในขณะนี้
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">{error || "ไม่พบข้อมูล"}</p>
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
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              แผนที่อากาศผิวพื้นระดับต่างๆ
            </h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">
              {appliedTypeLabel || "แผนที่"}
              {appliedTimeLabel ? ` - ${appliedTimeLabel}` : ""}
            </p>
          </div>

          {/* Controls row */}
          <div className="mt-5 grid gap-3 sm:grid-cols-[320px_320px_auto] sm:items-center">
            {/* Type dropdown: ✅ แสดงตาม Type_Menu ครบทุกตัว + disable อันไม่มีข้อมูล */}
            <div className="relative w-full">
              <select
                value={selectedTypeLabel}
                onChange={(e) => setSelectedTypeLabel(e.target.value)}
                className="
                  h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white
                  px-4 pr-10 text-sm font-medium text-gray-900 outline-none
                  focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100
                "
              >
                {Type_Menu.map((label) => {
                  const has = (itemsByTypeLabel.get(label) ?? []).length > 0;
                  return (
                    <option key={label} value={label} disabled={!has}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            </div>

            {/* Time dropdown: ✅ เปลี่ยนตามประเภท และโชว์เฉพาะที่มีข้อมูลจริง */}
            <div className="relative w-full">
              {selectedHasData ? (
                showTimeDropdown ? (
                  <>
                    <FiCalendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
                    <select
                      value={selectedTimeKey}
                      onChange={(e) => setSelectedTimeKey(e.target.value)}
                      className="
                        h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white
                        pl-10 pr-10 text-sm font-medium text-gray-900 outline-none
                        focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100
                      "
                    >
                      {timeOptions.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  </>
                ) : (
                  <div className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FiCalendar className="h-5 w-5 text-gray-700" />
                    <span>{timeOptions[0]?.label ?? "-"}</span>
                  </div>
                )
              ) : (
                <div className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 flex items-center gap-2 text-sm font-medium text-gray-400">
                  <FiCalendar className="h-5 w-5 text-gray-400" />
                  <span>ไม่มีข้อมูล</span>
                </div>
              )}
            </div>

            {/* Button */}
            <button
              type="button"
              disabled={!selectedHasData || !selectedTimeKey}
              onClick={() => setApplied({ typeLabel: selectedTypeLabel, timeKey: selectedTimeKey })}
              className={[
                "h-11 rounded-lg px-6 text-sm font-semibold text-white",
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

      {/* Title ใต้หัว */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="text-xl font-semibold text-gray-900 sm:text-2xl">
          {appliedTypeLabel || "แผนที่"}
          <span className="text-base font-medium text-gray-600"> - {appliedTimeLabel}</span>
        </div>
      </section>

      {/* Image (Zoomable) */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        {imageSrc ? (
          <div className="flex justify-center">
            <div className="w-full max-w-[520px]">
              <div className="shadow-xl">
                <ZoomableImage
                  src={imageSrc}
                  alt={clean(shown?.alt) || clean(shown?.title) || "Map"}
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

        {/* Description */}
        <div className="mx-auto mt-6 max-w-5xl border-t border-gray-100 pt-4">
          <p className="text-center text-sm text-gray-700">{descText || "ไม่พบข้อมูล"}</p>
        </div>
      </section>
    </main>
  );
}
