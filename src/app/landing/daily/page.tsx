"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

const DAILY_API_ROUTE = "/test2/api/daily"; // 👈 เปลี่ยนตาม route จริงของคุณถ้าไม่ใช่ /api/daily

type DailyForecastItem = {
  title: string;
  description: string;
  pdf_url: string;
  contentdate: string;
  infographic_url: string;

  general_climate: string;
  north: string;
  northeast: string;
  central: string;
  east: string;
  south_east_coast: string;
  south_west_coast: string;
  bangkok_vicinity: string;
};

type DailyForecastResponse = {
  success: boolean;
  data: DailyForecastItem[];
  message?: string;
};

function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  // "2026-01-30 12:00:00.0000000" -> "2026-01-30T12:00:00"
  const cleaned = raw.trim().replace(" ", "T").replace(/\.\d+$/, ""); // ตัด .0000000 ออก
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

function thaiDate(d: Date): string {
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function thaiTime(d: Date): string {
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function thaiWeekday(d: Date): string {
  return d.toLocaleDateString("th-TH", { weekday: "long" });
}

function shortText(s: string, max = 140): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

// ✅ ตัด general_climate ออกจาก Accordion เพื่อไม่ให้ซ้ำกับส่วนหัว
const SECTIONS: Array<{ key: keyof DailyForecastItem; label: string }> = [
  { key: "north", label: "ภาคเหนือ" },
  { key: "northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { key: "central", label: "ภาคกลาง" },
  { key: "east", label: "ภาคตะวันออก" },
  { key: "south_east_coast", label: "ภาคใต้ฝั่งตะวันออก" },
  { key: "south_west_coast", label: "ภาคใต้ฝั่งตะวันตก" },
  { key: "bangkok_vicinity", label: "กรุงเทพมหานครและปริมณฑล" },
];

export default function DailyForecastPage() {
  const [items, setItems] = useState<DailyForecastItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ สลับข้อความ: default โชว์ description, กดอ่านเพิ่มเติมจะโชว์ general_climate แทน
  const [showGeneral, setShowGeneral] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(DAILY_API_ROUTE);
      const json = (await res.json()) as DailyForecastResponse;

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad response shape");
      }

      // เรียงจากใหม่สุด -> เก่าสุด
      const sorted = [...json.data].sort((a, b) => {
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

  // ✅ เปลี่ยนรอบประกาศแล้วให้กลับไปโชว์ description ก่อนเสมอ
  useEffect(() => {
    setShowGeneral(false);
  }, [selectedKey]);

  const issueDate = selected ? parseContentDate(selected.contentdate) : null;

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-64 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-10 w-56 rounded bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !selected) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h1 className="text-xl font-semibold text-gray-900">
            ข่าวพยากรณ์อากาศประจำวัน
          </h1>
          <p className="mt-2 text-sm text-red-600">{error || "ไม่พบข้อมูล"}</p>
          <button
            onClick={load}
            className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  const headerDateText = issueDate
    ? `${thaiTime(issueDate)} น. • ${thaiDate(issueDate)} • ${thaiWeekday(
        issueDate
      )}`
    : selected.contentdate;

  const hasGeneral = Boolean((selected.general_climate ?? "").trim());

  const headerMainText = (showGeneral && hasGeneral
    ? selected.general_climate
    : selected.description
  )
    ?.trim()
    ?.toString();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">
              ข่าวพยากรณ์อากาศประจำวัน
            </h1>

            {/* ✅ description เป็นตัวหลัก + กดอ่านเพิ่มเติมเพื่อสลับเป็น general_climate */}
            <div className="mt-1">
              <p
                className={[
                  "text-sm text-gray-600 whitespace-pre-line",
                  showGeneral ? "" : "line-clamp-2",
                ].join(" ")}
              >
                {headerMainText}
              </p>

              {hasGeneral ? (
                <button
                  type="button"
                  onClick={() => setShowGeneral((v) => !v)}
                  className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
                >
                  {showGeneral ? "แสดงคำอธิบายสั้น" : "อ่านเพิ่มเติม"}
                </button>
              ) : null}
            </div>

            <div className="mt-3 text-sm text-gray-700">
              <span className="font-medium">{selected.title.trim()}</span>
              <span className="ml-2 text-gray-500">{headerDateText}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* <button
              onClick={load}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              title="รีเฟรชข้อมูล"
            >
              รีเฟรช
            </button> */}

            {selected.pdf_url ? (
              <a
                href={selected.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                ดาวน์โหลดเอกสาร (PDF)
              </a>
            ) : null}
          </div>
        </div>

        {/* Selector */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">เลือกรอบประกาศ</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none"
            >
              {items.map((it) => {
                const d = parseContentDate(it.contentdate);
                const label = d
                  ? `${thaiTime(d)} น. • ${thaiDate(d)}`
                  : it.contentdate;
                return (
                  <option key={it.contentdate} value={it.contentdate}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

      {/* Infographic */}
      <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            พยากรณ์อากาศประจำวันแบบอินโฟกราฟิก
            {issueDate ? ` - ${thaiDate(issueDate)}` : ""}
          </h2>

          {/* {selected.infographic_url ? (
            <a
              href={selected.infographic_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              ดูภาพขนาดจริง / ดาวน์โหลด
            </a>
          ) : null} */}
        </div>

        {selected.infographic_url ? (
          <div className="mt-4 flex justify-center">
            <div className="relative w-full max-w-sm overflow-hidden rounded-xl ring-1 ring-black/5">
              <Image
                src={selected.infographic_url}
                alt="Daily forecast infographic"
                width={900}
                height={1200}
                className="h-auto w-full"
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">ไม่พบรูปอินโฟกราฟิก</p>
        )}
      </section>

      {/* Accordions */}
      <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-base font-semibold text-gray-900">
          รายละเอียดพยากรณ์อากาศ
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SECTIONS.map(({ key, label }) => {
            const value = String(selected[key] ?? "").trim();
            if (!value) return null;

            return (
              <details
                key={String(key)}
                className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {label}
                    </div>
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {shortText(value, 140)}
                    </div>
                  </div>

                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>

                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {value}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
