"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ZoomableImage from "@/app/components/ZoomableImage";
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiMap,
} from "react-icons/fi";
import type { UpperWindItem, UpperWindResponse } from "@/app/types/map";

const basePath = process.env.NEXT_PUBLIC_API_ROUTE ?? "";
const MAP_API_ROUTE = `${basePath}/api/map`;

const SOUNDING_SCROLL_DURATION_MS = 550;

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

// fallback กรณี Title เป็น null แต่ต้องโชว์เป็นไทย
const SOUNDING_TITLE_FALLBACK: Record<string, string> = {
  Bangkok: "กรุงเทพมหานคร",
  ChiangMai: "เชียงใหม่",
  KhonKaen: "ขอนแก่น",
  UbonRatchaThani: "อุบลราชธานี",
  Songkhla: "สงขลา",
  Phuket: "ภูเก็ต",
  ChanthaBuri: "จันทบุรี",
  Chanthaburi: "จันทบุรี",
  Phitsanulok: "พิษณุโลก",
  NakhonRatchasima: "นครราชสีมา",
  PrachuapKhiriKhan: "ประจวบคีรีขันธ์",
  Chonburi: "ชลบุรี",
  ChonBuri: "ชลบุรี",
  Chumphon: "ชุมพร",
};

type SoundingStation = {
  id: string;
  title: string;
  imagePath: string;
};

type ScrollDir = -1 | 1;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/** ดึงรายการจังหวัดจาก AirMapWeather: xxxTitle + xxxImagePath (คงลำดับเดิมตาม key ใน API) */
function extractSoundingStations(item: UpperWindItem | null): SoundingStation[] {
  if (!item || !isRecord(item)) return [];

  const rec: Record<string, unknown> = item;
  const seenTitle = new Set<string>();
  const out: SoundingStation[] = [];

  for (const key of Object.keys(rec)) {
    if (!key.endsWith("Title")) continue;

    const base = key.slice(0, -"Title".length);
    const rawTitle = readNonEmptyString(rec[key]);
    const title = rawTitle ?? SOUNDING_TITLE_FALLBACK[base] ?? base;

    const imagePath = readNonEmptyString(rec[`${base}ImagePath`]);
    if (!imagePath) continue; // เอาเฉพาะที่มีรูปจริง

    // กันซ้ำแบบ ChanthaBuri/Chanthaburi -> "จันทบุรี" ให้เหลือใบเดียว
    if (seenTitle.has(title)) continue;
    seenTitle.add(title);

    out.push({ id: title, title, imagePath });
  }

  return out;
}

/** แปลง "2026-0x-x0 0x:00:00.0000000" -> Date */
function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** แสดงวันเวลาแบบไทย + ปี พ.ศ. */
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

/** ทำ data -> list entries
 *  - ปกติ: เก็บเฉพาะที่มี url
 *  - AirMapWeather: ไม่มี url แต่ต้องเก็บเพื่อเลือกวัน/เวลา + การ์ดจังหวัด
 */
function normalizeToEntries(
  data: UpperWindResponse["data"] | null | undefined
): Array<{ apiKey: string; item: UpperWindItem }> {
  const out: Array<{ apiKey: string; item: UpperWindItem }> = [];
  const d = data ?? {};

  for (const [apiKey, value] of Object.entries(d)) {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    for (const it of arr) {
      if (!it) continue;

      if (apiKey === SOUNDING_API_KEY) {
        out.push({ apiKey, item: it });
        continue;
      }

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

  // Sounding: match ด้วย apiKey โดยตรง
  if (label === SOUNDING_TYPE_LABEL && apiKey === SOUNDING_API_KEY) return true;

  // หลัก: title/alt ต้องมี label
  if (title.includes(label) || alt.includes(label)) return true;

  // fallback เบาๆ: ดึงเลข hPa จากเมนูไปเช็คใน apiKey
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

/** easing สำหรับ animate scroll */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getGapPx(el: HTMLElement): number {
  const cs = window.getComputedStyle(el);
  const raw = cs.columnGap || cs.gap || "0px";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function getFirstCardWidthPx(row: HTMLElement): number {
  const first = row.querySelector<HTMLElement>("button");
  if (!first) return row.clientWidth;
  return first.getBoundingClientRect().width;
}

/** คำนวณระยะเลื่อนแบบ "เป็นชุด" ตามจำนวนการ์ดที่พอดีใน viewport */
function calcPageDeltaPx(row: HTMLElement): number {
  const gap = getGapPx(row);
  const cardW = getFirstCardWidthPx(row);
  const unit = cardW + gap;

  if (unit <= 0) return row.clientWidth;

  const pageSize = Math.max(1, Math.floor((row.clientWidth + gap) / unit));
  return pageSize * unit;
}

/** animate scrollLeft แบบกำหนด duration ได้ */
function animateScrollLeft(
  el: HTMLElement,
  target: number,
  durationMs: number,
  onDone?: () => void
) {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (prefersReduced || durationMs <= 0) {
    el.scrollLeft = target;
    onDone?.();
    return;
  }

  const start = el.scrollLeft;
  const diff = target - start;
  if (Math.abs(diff) < 0.5) {
    el.scrollLeft = target;
    onDone?.();
    return;
  }

  const t0 = performance.now();

  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / durationMs);
    const eased = easeInOutCubic(p);
    el.scrollLeft = start + diff * eased;

    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      el.scrollLeft = target;
      onDone?.();
    }
  };

  requestAnimationFrame(tick);
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

      const allEntries = normalizeToEntries(json.data);
      const firstType =
        Type_Menu.find((label) => allEntries.some((e) => isMatchType(label, e))) ?? Type_Menu[0];

      const firstItems = allEntries.filter((e) => isMatchType(firstType, e)).map((e) => e.item);
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

  // เปลี่ยนประเภทแล้ว sync เวลา
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

  const selectedTimeLabel =
    timeOptions.find((t) => t.key === selectedTimeKey)?.label ?? timeOptions[0]?.label ?? "-";

  // shown: อิงจาก applied (หลังกดปุ่ม)
  const shown = useMemo(() => {
    const typeLabel = applied?.typeLabel ?? selectedTypeLabel;
    const timeKey = applied?.timeKey ?? selectedTimeKey;

    const items = itemsByTypeLabel.get(typeLabel) ?? [];
    if (!items.length) return null;

    const exact = items.find((it) => (it.contentdate ?? "") === timeKey);
    return exact ?? items[0] ?? null;
  }, [applied, selectedTypeLabel, selectedTimeKey, itemsByTypeLabel]);

  const shownDate = parseContentDate(shown?.contentdate ?? "");

  const appliedTypeLabel = applied?.typeLabel ?? selectedTypeLabel;
  const appliedTimeKey = applied?.timeKey ?? selectedTimeKey;

  const appliedItems = itemsByTypeLabel.get(appliedTypeLabel) ?? [];
  const appliedTimeOptions = getTimeOptions(appliedItems);

  const appliedTimeLabel =
    appliedTimeOptions.find((t) => t.key === appliedTimeKey)?.label ??
    (shownDate ? thaiDateTime(shownDate) : shown?.contentdate ?? "");

  // ===== Sounding (AirMapWeather) =====
  const isSoundingApplied = appliedTypeLabel === SOUNDING_TYPE_LABEL;

  const soundingStations = useMemo(
    () => (isSoundingApplied ? extractSoundingStations(shown) : []),
    [isSoundingApplied, shown]
  );

  const [activeSoundingId, setActiveSoundingId] = useState<string>("");

  useEffect(() => {
    if (!isSoundingApplied) {
      setActiveSoundingId("");
      return;
    }
    const first = soundingStations[0]?.id ?? "";
    setActiveSoundingId((prev) =>
      prev && soundingStations.some((s) => s.id === prev) ? prev : first
    );
  }, [isSoundingApplied, soundingStations]);

  const activeSoundingIndex = useMemo(() => {
    if (!soundingStations.length) return 0;
    const idx = soundingStations.findIndex((s) => s.id === activeSoundingId);
    return idx >= 0 ? idx : 0;
  }, [soundingStations, activeSoundingId]);

  // scroll ให้การ์ด active อยู่ในจอ (ตอน "คลิกการ์ด" เท่านั้น)
  const soundingRowMobileRef = useRef<HTMLDivElement | null>(null);
  const soundingRowDesktopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSoundingApplied) return;

    const rows = [soundingRowMobileRef.current, soundingRowDesktopRef.current].filter(
      (r): r is HTMLDivElement => Boolean(r)
    );

    for (const row of rows) {
      const el = row.querySelector<HTMLButtonElement>(
        `button[data-sounding-index="${activeSoundingIndex}"]`
      );
      if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [isSoundingApplied, activeSoundingIndex]);

  const activeSounding = isSoundingApplied
    ? soundingStations[activeSoundingIndex] ?? null
    : null;

  const imageSrc = isSoundingApplied ? activeSounding?.imagePath ?? "" : shown?.url ?? "";
  const descText = isSoundingApplied ? "" : shown?.description ?? "";

  // ===== ✅ ปุ่มเลื่อน: เลื่อน "เป็นชุด" + animate duration =====
  const isAnimatingScrollRef = useRef<boolean>(false);

  const scrollSoundingCardsByPage = useCallback(
    (dir: ScrollDir) => {
      // ปุ่มบนหัวเป็น desktop อยู่แล้ว แต่กันไว้เผื่อเรียกที่อื่น
      const row =
        window.matchMedia("(min-width: 640px)").matches
          ? soundingRowDesktopRef.current
          : soundingRowMobileRef.current;

      if (!row) return;
      if (isAnimatingScrollRef.current) return;

      const delta = calcPageDeltaPx(row);
      const max = Math.max(0, row.scrollWidth - row.clientWidth);
      const target = Math.min(max, Math.max(0, row.scrollLeft + dir * delta));

      if (Math.abs(target - row.scrollLeft) < 1) return;

      isAnimatingScrollRef.current = true;
      animateScrollLeft(row, target, SOUNDING_SCROLL_DURATION_MS, () => {
        isAnimatingScrollRef.current = false;
      });
    },
    []
  );

  const [canScrollPrevDesktop, setCanScrollPrevDesktop] = useState<boolean>(false);
  const [canScrollNextDesktop, setCanScrollNextDesktop] = useState<boolean>(false);

  useEffect(() => {
    if (!isSoundingApplied) {
      setCanScrollPrevDesktop(false);
      setCanScrollNextDesktop(false);
      return;
    }

    const row = soundingRowDesktopRef.current;
    if (!row) return;

    const update = () => {
      const max = Math.max(0, row.scrollWidth - row.clientWidth);
      setCanScrollPrevDesktop(row.scrollLeft > 2);
      setCanScrollNextDesktop(row.scrollLeft < max - 2);
    };

    update();

    const onScroll = () => update();
    row.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => update());
    ro.observe(row);

    return () => {
      row.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [isSoundingApplied, soundingStations.length]);

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="relative min-h-60 border-b border-gray-200">
          <div
            className="hidden sm:block absolute inset-0 bg-no-repeat bg-top-right bg-contain"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          />
          <div className="mx-auto max-w-7xl px-4 py-6 relative z-10">
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
        <section className="relative min-h-60 border-b border-gray-200">
          <div
            className="hidden sm:block absolute inset-0 bg-no-repeat bg-top-right bg-contain"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          />
          <div className="mx-auto max-w-7xl px-4 py-6 relative z-10">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
                แผนที่อากาศผิวพื้นระดับต่างๆ
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">
                ไม่สามารถโหลดข้อมูลได้ในขณะนี้
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">{error || ""}</p>
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
      <section className="relative min-h-60 border-b border-gray-200">
        <div
          className="hidden sm:block absolute inset-0 bg-no-repeat bg-top-right bg-contain"
          style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
        />
        <div className="mx-auto max-w-7xl px-4 py-6 relative z-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              แผนที่อากาศผิวพื้นระดับต่างๆ
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="whitespace-nowrap">{appliedTypeLabel || "แผนที่"}</span>
                {appliedTimeLabel ? (
                  <span className="whitespace-nowrap text-gray-600">- {appliedTimeLabel}</span>
                ) : null}
              </span>
            </p>
          </div>

          {/* Controls row */}
          <div className="flex flex-col gap-2 mt-5 sm:flex-row sm:items-center sm:justify-start sm:mt-10">
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
                "h-12 rounded-lg px-6 text-sm font-semibold text-white whitespace-nowrap cursor-pointer",
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

      {/* Title Map + Desktop arrows */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:py-6">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="text-lg font-semibold text-gray-900 sm:text-2xl">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
              <span className="whitespace-nowrap">
                {isSoundingApplied ? `${appliedTypeLabel || "แผนที่"} -` : appliedTypeLabel || "แผนที่"}
              </span>

              {appliedTimeLabel ? (
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  {isSoundingApplied ? appliedTimeLabel : `- ${appliedTimeLabel}`}
                </span>
              ) : null}

              {isSoundingApplied ? (
                <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                  ( {soundingStations.length} จังหวัด )
                </span>
              ) : null}
            </div>
          </div>

          {/* ปุ่มเลื่อนบนหัว (Desktop) */}
          {isSoundingApplied ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollSoundingCardsByPage(-1)}
                disabled={soundingStations.length <= 1 || !canScrollPrevDesktop}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm font-semibold cursor-pointer",
                  soundingStations.length <= 1 || !canScrollPrevDesktop
                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-label="ก่อนหน้า"
              >
                <FiChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => scrollSoundingCardsByPage(1)}
                disabled={soundingStations.length <= 1 || !canScrollNextDesktop}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm font-semibold cursor-pointer",
                  soundingStations.length <= 1 || !canScrollNextDesktop
                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50",
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
        <section className="mx-auto max-w-7xl px-0 sm:px-4 pb-2">
          {/* Mobile */}
          <div
            ref={soundingRowMobileRef}
            className="sm:hidden flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory
              [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {soundingStations.map((s, idx) => {
              const active = idx === activeSoundingIndex;

              return (
                <button
                  key={`${s.id}-${idx}`}
                  type="button"
                  data-sounding-index={idx}
                  onClick={() => setActiveSoundingId(s.id)}
                  className={[
                    "relative shrink-0 rounded-xl border p-4 text-left shadow-sm transition cursor-pointer",
                    "w-55",
                    "h-24 overflow-hidden",
                    active ? "bg-white border-emerald-200" : "bg-gray-50 border-sky-100",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0 top-4 bottom-4 w-1 rounded-r",
                      active ? "bg-emerald-600" : "bg-transparent",
                    ].join(" ")}
                  />
                  <div className="pl-2 h-full flex flex-col justify-center">
                    <div className="text-sm font-semibold text-gray-900 leading-tight">
                      จังหวัด {s.title}
                    </div>
                    <div className="mt-1 text-xs font-medium text-gray-500 leading-tight">
                      แผนที่หยั่งอากาศ
                    </div>
                    <div className="mt-1 text-xs font-medium text-gray-500 leading-tight">
                      วันที่ {appliedTimeLabel || "-"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop */}
          <div
            ref={soundingRowDesktopRef}
            className="hidden sm:flex gap-4 overflow-x-auto pb-2
            [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {soundingStations.map((s, idx) => {
              const active = idx === activeSoundingIndex;

              return (
                <button
                  key={`${s.id}-${idx}`}
                  type="button"
                  data-sounding-index={idx}
                  onClick={() => setActiveSoundingId(s.id)}
                  className={[
                    "relative shrink-0 w-72 rounded-xl border p-4 text-left shadow-sm transition cursor-pointer",
                    active
                      ? "bg-white border-emerald-200"
                      : "bg-gray-50 border-sky-100 hover:bg-gray-100",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0 top-4 bottom-4 w-1 rounded-r",
                      active ? "bg-emerald-600" : "bg-transparent",
                    ].join(" ")}
                  />
                  <div className="pl-2">
                    <div className="text-sm font-semibold text-gray-900">จังหวัด {s.title}</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">แผนที่หยั่งอากาศ</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">
                      วันที่ {appliedTimeLabel || "-"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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
          <p className="mx-auto text-sm leading-relaxed text-gray-700">{descText || "-"}</p>
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
                      : (shown?.alt ?? shown?.title ?? "Map") || "Map"
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
          <div className="hidden mx-auto mt-6 max-w-5xl border-t border-gray-100 pt-4 sm:block">
            <p className="text-center text-sm text-gray-700">{descText || ""}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default MapPage;
