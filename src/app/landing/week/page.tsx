"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * ✅ basePath = /test2 (ตาม next.config.ts)
 * ถ้าอยากยืดหยุ่น ให้ตั้ง NEXT_PUBLIC_BASE_PATH=/test2 ใน .env
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/test2";

/**
 * ✅ แก้ให้ตรงกับ route ของคุณ
 * ตัวอย่าง: app/api/climate-weekly/route.ts  => "/api/climate-weekly"
 */
const WEEKLY_API_ROUTE = "/test2/api/week";

/** ---------- Types (ยืดหยุ่น) ---------- */
type RegionObject = {
  summary?: string;
  content?: string;
  description?: string;

  rain_max?: string;
  rainfall_max?: string;
  max_rain?: string;

  tmax?: string;
  temp_max?: string;
  max_temp?: string;

  tmin?: string;
  temp_min?: string;
  min_temp?: string;
};

type RegionValue = string | RegionObject;

type ClimateWeeklyItem = {
  title: string;
  description: string | null;
  alt: string;
  url: string;
  contentdate: string;

  // เผื่อบาง endpoint มี text หลัก
  content?: string;
  general?: string;

  // เผื่อมีรายละเอียดรายภาค (ไม่รู้ชื่อจริงจากตัวอย่างที่ส่งมา)
  north?: RegionValue;
  northeast?: RegionValue;
  central?: RegionValue;
  east?: RegionValue;
  south?: RegionValue;
  bangkok_vicinity?: RegionValue;

  // เผื่อส่งเป็น map
  regions?: Record<string, RegionValue>;
};

type ClimateWeeklyResponse =
  | {
      success: boolean;
      data: ClimateWeeklyItem;
      message?: string;
    }
  | {
      success: boolean;
      data: ClimateWeeklyItem[];
      message?: string;
    };

/** ---------- Helpers ---------- */
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

function cleanText(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function shortText(s: string, max = 260): string {
  const t = cleanText(s);
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

/** ---------- Region config (ตามหน้าตาในรูป) ---------- */
const REGION_LIST: Array<{ key: string; label: string }> = [
  { key: "north", label: "ภาคเหนือ" },
  { key: "northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { key: "central", label: "ภาคกลาง" },
  { key: "east", label: "ภาคตะวันออก" },
  { key: "south", label: "ภาคใต้" },
  { key: "bangkok_vicinity", label: "กรุงเทพมหานครและปริมณฑล" },
];

function extractRegion(val: RegionValue | undefined) {
  if (!val) return null;

  if (typeof val === "string") {
    const text = val.trim();
    return text ? { text } : null;
  }

  const text =
    (val.summary ?? val.content ?? val.description ?? "").toString().trim();

  const rain =
    val.rain_max ?? val.rainfall_max ?? val.max_rain ?? undefined;

  const tmax =
    val.tmax ?? val.temp_max ?? val.max_temp ?? undefined;

  const tmin =
    val.tmin ?? val.temp_min ?? val.min_temp ?? undefined;

  if (!text && !rain && !tmax && !tmin) return null;

  return { text, rain, tmax, tmin };
}

export default function ClimateWeeklyPage() {
  const [items, setItems] = useState<ClimateWeeklyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(WEEKLY_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as ClimateWeeklyResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!("success" in json) || !json.success)
        throw new Error(("message" in json && json.message) || "Bad response");

      // ✅ normalize: data อาจเป็น object เดี่ยว หรือ array
      const raw = (json as any).data as ClimateWeeklyItem | ClimateWeeklyItem[];
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];

      if (!arr.length) throw new Error("ไม่พบข้อมูล");

      // เรียงใหม่สุด -> เก่าสุด
      const sorted = [...arr].sort((a, b) => {
        const da = parseContentDate(a.contentdate)?.getTime() ?? 0;
        const db = parseContentDate(b.contentdate)?.getTime() ?? 0;
        return db - da;
      });

      setItems(sorted);
      setSelectedKey(sorted[0]?.contentdate ?? "");
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => {
    return items.find((x) => x.contentdate === selectedKey) ?? items[0] ?? null;
  }, [items, selectedKey]);

  const selectedDate = selected ? parseContentDate(selected.contentdate) : null;

  const regionCards = useMemo(() => {
    if (!selected) return [];

    // 1) ถ้ามี regions map ให้ merge เข้ามา
    const regionMap = selected.regions ?? {};

    // 2) อ่านจาก key มาตรฐานก่อน แล้ว fallback ไปที่ map
    const out = REGION_LIST.map(({ key, label }) => {
      const val =
        (selected as any)[key] ??
        regionMap[key] ??
        regionMap[label] ??
        undefined;

      const parsed = extractRegion(val);
      if (!parsed) return null;

      return { key, label, ...parsed };
    }).filter(Boolean) as Array<{
      key: string;
      label: string;
      text?: string;
      rain?: string;
      tmax?: string;
      tmin?: string;
    }>;

    return out;
  }, [selected]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="animate-pulse space-y-3">
            <div className="h-7 w-72 rounded bg-gray-200" />
            <div className="h-4 w-96 rounded bg-gray-200" />
            <div className="mt-6 h-10 w-80 rounded bg-gray-200" />
            <div className="mt-6 h-56 rounded bg-gray-200" />
          </div>
        </section>
      </main>
    );
  }

  if (error || !selected) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h1 className="text-xl font-semibold text-gray-900">
            สรุปลักษณะอากาศรายสัปดาห์
          </h1>
          <p className="mt-2 text-sm text-red-600">{error || "ไม่พบข้อมูล"}</p>
          <button
            onClick={load}
            className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            ลองใหม่
          </button>
        </section>
      </main>
    );
  }

  const headerRangeText = selected.title?.trim() || "—";
  const updatedText = selectedDate ? thaiDateTime(selectedDate) : selected.contentdate;

  const mainSummary =
    selected.content?.trim() ||
    selected.general?.trim() ||
    selected.description?.trim() ||
    "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header (เหมือน Figma: มีพื้นหลังแผนที่จางๆ) */}
      <section className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-black/5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gray-400 blur-3xl" />
          <div className="absolute right-20 top-10 h-56 w-56 rounded-full bg-gray-500 blur-3xl" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-gray-300 blur-3xl" />
        </div>

        <div className="relative">
          <h1 className="text-2xl font-semibold text-gray-900">
            สรุปลักษณะอากาศรายสัปดาห์
          </h1>
          <p className="mt-1 text-sm text-gray-600">{headerRangeText}</p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Dropdown เลือกช่วง (ถ้ามีหลายรายการ) */}
            <div className="flex items-center gap-2">
              <label className="sr-only">เลือกช่วงวันที่</label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                disabled={items.length <= 1}
                className="h-10 w-full min-w-[280px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                {items.map((it) => (
                  <option key={it.contentdate} value={it.contentdate}>
                    {it.title?.trim() || it.contentdate}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {selected.url ? (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  <span aria-hidden>⬇</span>
                  ดาวน์โหลดเอกสาร
                </a>
              ) : null}

              <button
                onClick={load}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                title="รีเฟรชข้อมูล"
              >
                รีเฟรช
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Summary bar เหมือนในรูป (พื้นหลังเทาอ่อน) */}
      <section className="mt-6 rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
        <h2 className="text-base font-semibold text-gray-900">
          สรุปลักษณะอากาศประเทศไทย - {headerRangeText}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {mainSummary ? shortText(mainSummary, 520) : "—"}
        </p>
      </section>

      {/* Region cards (ถ้า API มีข้อมูลรายภาค) */}
      {regionCards.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-gray-900">
            ลักษณะอากาศรายภาค - {headerRangeText}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {regionCards.map((r) => (
              <div
                key={r.key}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* top green line */}
                <div className="h-1 w-full rounded-t-2xl bg-emerald-600" />

                <div className="p-5">
                  <div className="text-sm font-semibold text-gray-900">
                    {r.label}
                  </div>

                  {r.text ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">
                      {r.text}
                    </p>
                  ) : null}

                  {/* Info blocks (ถ้ามีค่าจาก API) */}
                  <div className="mt-4 space-y-3">
                    {r.rain ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold text-gray-700">
                          🌧️ ปริมาณฝนสูงสุด
                        </div>
                        <div className="mt-1 text-sm text-gray-800">{r.rain}</div>
                      </div>
                    ) : null}

                    {r.tmax ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold text-gray-700">
                          🌡️ อุณหภูมิสูงสุด
                        </div>
                        <div className="mt-1 text-sm text-gray-800">{r.tmax}</div>
                      </div>
                    ) : null}

                    {r.tmin ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold text-gray-700">
                          🧊 อุณหภูมิต่ำสุด
                        </div>
                        <div className="mt-1 text-sm text-gray-800">{r.tmin}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">
            ลักษณะอากาศรายภาค
          </div>
          <p className="mt-2 text-sm text-gray-600">
            API ชุดนี้ที่ส่งมายังมีแค่ข้อมูลไฟล์ (title/url/contentdate) เลยยังไม่พบรายละเอียดรายภาคใน JSON
            — ตอนนี้จะแสดงเอกสารให้ดาวน์โหลด/อ่านด้านล่างแทน
          </p>
        </section>
      )}

      {/* PDF Preview */}
      {selected.url ? (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-gray-900">เอกสารประกอบ</div>
            <div className="text-xs text-gray-500">อัปเดต: {updatedText}</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <iframe
              title="Weekly climate PDF"
              src={selected.url}
              className="h-[720px] w-full"
            />
          </div>

          <div className="mt-3 text-xs text-gray-500">
            ถ้า preview ไม่ขึ้น ให้กด “ดาวน์โหลดเอกสาร” เพื่อเปิดในแท็บใหม่
          </div>
        </section>
      ) : null}
    </main>
  );
}
