"use client";

import React, { useEffect, useMemo, useState } from "react";

// ✅ ถ้า basePath เป็น /test2 ตาม next.config.ts ให้ใช้แบบนี้
// ถ้าวันหลังเปลี่ยน basePath ให้แก้ค่าเดียวตรงนี้ หรือ set env NEXT_PUBLIC_BASE_PATH
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/test2";
const MONTHLY_API_ROUTE = `${BASE_PATH}/api/monthly`;

type ClimateMonthlyItem = {
  content: string;
  title: string;
  description: string | null;
  alt: string;
  url: string;
  contentdate: string; // "2025-12-31 09:35:00.0000000"
};

type ClimateMonthlyResponse = {
  success: boolean;
  data: ClimateMonthlyItem[];
  message?: string;
};

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

function thaiDate(d: Date): string {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()] ?? "";
  const year = toBEYear(d);
  return `${day} ${month} ${year}`;
}

function thaiTime(d: Date): string {
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function cleanText(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function shortText(s: string, max = 220): string {
  const t = cleanText(s);
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

function monthLabelFromDate(d: Date | null): string {
  if (!d) return "—";
  return THAI_MONTHS[d.getMonth()] ?? "—";
}

function monthYearLabelFromItem(it: ClimateMonthlyItem): string {
  // พยายามดึง "เดือน + ปี" จาก title ก่อน เพื่อให้ตรงกับข้อมูลจริง
  const t = (it.title ?? "").trim();
  const yearMatch = t.match(/25\d{2}/); // ปี พ.ศ. ในข้อมูลมักเป็น 25xx
  let foundMonth: string | null = null;

  for (const m of THAI_MONTHS) {
    if (t.includes(m)) {
      foundMonth = m;
      break;
    }
  }

  if (foundMonth && yearMatch?.[0]) {
    return `${foundMonth} ${yearMatch[0]}`;
  }

  // fallback จาก contentdate
  const d = parseContentDate(it.contentdate);
  if (!d) return t || it.alt || "—";
  return `${THAI_MONTHS[d.getMonth()] ?? ""} ${toBEYear(d)}`;
}

function simplifyHeaderTitle(it: ClimateMonthlyItem): string {
  // ทำหัวข้อให้คล้ายในรูป: "ลักษณะอากาศ - ธันวาคม 2568"
  return `ลักษณะอากาศ - ${monthYearLabelFromItem(it)}`;
}

export default function ClimateMonthlyPage() {
  const [items, setItems] = useState<ClimateMonthlyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(""); // พ.ศ.
  const [selectedKey, setSelectedKey] = useState<string>(""); // ใช้ contentdate เป็น key

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(MONTHLY_API_ROUTE, {
        // route ของคุณ cache 300s แล้ว จะ no-store หรือไม่ก็ได้
        cache: "no-store",
      });

      const json = (await res.json()) as ClimateMonthlyResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data))
        throw new Error(json?.message || "Bad response shape");

      // เรียงใหม่สุด -> เก่าสุด
      const sorted = [...json.data].sort((a, b) => {
        const da = parseContentDate(a.contentdate)?.getTime() ?? 0;
        const db = parseContentDate(b.contentdate)?.getTime() ?? 0;
        return db - da;
      });

      setItems(sorted);

      // set ปีเริ่มต้นเป็นปีของรายการล่าสุด
      const newest = sorted[0];
      const newestDate = newest ? parseContentDate(newest.contentdate) : null;
      const newestBE = newestDate ? String(toBEYear(newestDate)) : "all";

      setSelectedYear(newestBE);
      setSelectedKey(newest?.contentdate ?? "");
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

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    for (const it of items) {
      const d = parseContentDate(it.contentdate);
      if (d) set.add(toBEYear(d));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const filteredByYear = useMemo(() => {
    if (!selectedYear) return items;
    const y = Number(selectedYear);
    return items.filter((it) => {
      const d = parseContentDate(it.contentdate);
      return d ? toBEYear(d) === y : false;
    });
  }, [items, selectedYear]);

  // รายการเดือนฝั่งขวา: เรียงใหม่สุด -> เก่าสุด (ตาม contentdate)
  const monthList = useMemo(() => {
    return [...filteredByYear].sort((a, b) => {
      const da = parseContentDate(a.contentdate)?.getTime() ?? 0;
      const db = parseContentDate(b.contentdate)?.getTime() ?? 0;
      return db - da;
    });
  }, [filteredByYear]);

  const selected = useMemo(() => {
    const hit = monthList.find((x) => x.contentdate === selectedKey);
    return hit ?? monthList[0] ?? null;
  }, [monthList, selectedKey]);

  // ถ้าเปลี่ยนปี ให้เลือกอันใหม่สุดในปีนั้นอัตโนมัติ
  useEffect(() => {
    if (!monthList.length) {
      setSelectedKey("");
      return;
    }
    // ถ้า key เดิมยังอยู่ใน list ก็ไม่ต้องเปลี่ยน
    const stillOk = monthList.some((x) => x.contentdate === selectedKey);
    if (!stillOk) setSelectedKey(monthList[0].contentdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, monthList.length]);

  const selectedDate = selected ? parseContentDate(selected.contentdate) : null;

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="animate-pulse space-y-3">
            <div className="h-7 w-64 rounded bg-gray-200" />
            <div className="h-4 w-96 rounded bg-gray-200" />
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr,260px]">
              <div className="h-80 rounded-2xl border border-gray-200 bg-white" />
              <div className="h-80 rounded-2xl border border-gray-200 bg-white" />
            </div>
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
            สรุปลักษณะอากาศรายเดือน
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header แบบในรูป */}
      <section className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-black/5">
        {/* background เบาๆ ให้คล้ายมีแผนที่ */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gray-400 blur-3xl" />
          <div className="absolute right-20 top-10 h-56 w-56 rounded-full bg-gray-500 blur-3xl" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-gray-300 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">
              สรุปลักษณะอากาศรายเดือน
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              ข้อมูลของปี {selectedYear || "—"}
            </p>

            <div className="mt-4 w-full max-w-xs">
              <label className="sr-only">เลือกปี</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500">
                ไม่มีไฟล์
              </span>
            )}

            <button
              onClick={load}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              title="รีเฟรชข้อมูล"
            >
              รีเฟรช
            </button>
          </div>
        </div>
      </section>

      {/* Content Layout แบบในรูป: ซ้ายรายละเอียด / ขวาเลือกเดือน */}
      <section className="mt-6 grid gap-4 md:grid-cols-[1fr,260px]">
        {/* Left Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            {simplifyHeaderTitle(selected)}
          </h2>

          {/* preview (optional) */}
          <p className="mt-2 text-sm text-gray-600">
            {shortText(selected.content, 240)}
          </p>

          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {selected.content?.trim() || "—"}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">
            อัปเดต:{" "}
            <span className="text-gray-700">
              {selectedDate
                ? `${thaiDate(selectedDate)} • ${thaiTime(selectedDate)} น.`
                : selected.contentdate}
            </span>
          </div>
        </div>

        {/* Right Card: Month Picker */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">เลือกเดือน</div>

          <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
            {monthList.map((it) => {
              const d = parseContentDate(it.contentdate);
              const label = monthLabelFromDate(d); // แสดงเฉพาะเดือนแบบในรูป
              const active = it.contentdate === selectedKey;

              return (
                <button
                  key={`${it.contentdate}-${it.url}`}
                  onClick={() => setSelectedKey(it.contentdate)}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            แสดง {monthList.length} เดือนในปี {selectedYear}
          </div>
        </aside>
      </section>
    </main>
  );
}
