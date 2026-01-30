"use client";

import React, { useEffect, useMemo, useState } from "react";

// ✅ แก้ให้ตรงกับ route จริงของคุณ
// ตัวอย่าง: ถ้าไฟล์ route อยู่ที่ src/app/test2/api/agro/route.ts
// ให้ใช้ "/test2/api/agro"
const AGRO_API_ROUTE = "/test2/api/agroforecast";

type Agro7DaysItem = {
  title: string;
  description: string | null;
  alt: string;
  url: string;
  contentdate: string; // "2026-01-30 13:40:00.0000000"
};

type Agro7DaysResponse = {
  success: boolean;
  data: Agro7DaysItem[];
  message?: string;
};

function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
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

function getBEYear(d: Date): number {
  // กัน browser/locale บางเครื่องไม่ใช้ พ.ศ. อัตโนมัติ
  return d.getFullYear() + 543;
}

function buildPageList(current: number, total: number): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: Array<number | "..."> = [];
  const add = (x: number | "...") => pages.push(x);

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  add(1);

  if (left > 2) add("...");

  for (let p = left; p <= right; p++) add(p);

  if (right < total - 1) add("...");

  add(total);

  return pages;
}

export default function AgroForecast7DaysPage() {
  const [items, setItems] = useState<Agro7DaysItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dropdown
  const [yearFilter, setYearFilter] = useState<string>("all");

  // pagination
  const PAGE_SIZE = 6; // ให้เหมือนในรูป (6 card/หน้า)
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(AGRO_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as Agro7DaysResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data))
        throw new Error(json?.message || "Bad response shape");

      // ✅ เรียงใหม่สุด -> เก่าสุด ด้วย contentdate
      const sorted = [...json.data].sort((a, b) => {
        const da = parseContentDate(a.contentdate)?.getTime() ?? 0;
        const db = parseContentDate(b.contentdate)?.getTime() ?? 0;
        return db - da;
      });

      setItems(sorted);
      setPage(1);
      setYearFilter("all");
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
    const years = new Set<number>();
    for (const it of items) {
      const d = parseContentDate(it.contentdate);
      if (d) years.add(getBEYear(d));
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return items;

    const y = Number(yearFilter);
    return items.filter((it) => {
      const d = parseContentDate(it.contentdate);
      if (!d) return false;
      return getBEYear(d) === y;
    });
  }, [items, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  useEffect(() => {
    // เปลี่ยน filter แล้วกลับไปหน้า 1
    setPage(1);
  }, [yearFilter]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="animate-pulse space-y-3">
            <div className="h-7 w-80 rounded bg-gray-200" />
            <div className="h-4 w-96 rounded bg-gray-200" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl border border-gray-200 bg-white"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h1 className="text-xl font-semibold text-gray-900">
            พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
          </h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-black/5">
        {/* background เบาๆ ให้คล้ายในรูป */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gray-400 blur-3xl" />
          <div className="absolute right-24 top-8 h-48 w-48 rounded-full bg-gray-500 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              พยากรณ์อากาศเกษตร 7 วันข้างหน้า
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative">
                <label className="sr-only">ตัวกรองเอกสาร</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="h-10 min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">เอกสารทั้งหมด</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      ปี {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={load}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
                title="รีเฟรชข้อมูล"
              >
                รีเฟรช
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            พบ {filtered.length} รายการ
          </div>
        </div>
      </section>

      {/* List */}
      <section className="mt-6">
        {pageItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-600">ไม่พบเอกสารในเงื่อนไขนี้</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pageItems.map((it) => {
              const d = parseContentDate(it.contentdate);
              const updatedText = d
                ? `${thaiDate(d)}${d ? "" : ""}`
                : it.contentdate;

              return (
                <div
                  key={`${it.contentdate}-${it.url}`}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-900">
                        {it.title?.trim() || it.alt?.trim() || "—"}
                      </div>
                    </div>

                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                      title="เปิด PDF"
                    >
                      ดาวน์โหลดเอกสาร
                    </a>
                  </div>

                  <div className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      อัปเดต:{" "}
                      <span className="text-gray-700">
                        {d ? `${thaiDate(d)} • ${thaiTime(d)} น.` : updatedText}
                      </span>
                    </div>
                    <div>
                      หมวดหมู่:{" "}
                      <span className="text-gray-700">
                        จุดพยากรณ์อากาศเกษตร
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-1 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe === 1}
            className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="ก่อนหน้า"
          >
            ‹
          </button>

          {buildPageList(pageSafe, totalPages).map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 py-2 text-gray-400">
                  …
                </span>
              );
            }

            const n = p as number;
            const active = n === pageSafe;

            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={[
                  "min-w-9 rounded-lg px-3 py-2",
                  active
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {n}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe === totalPages}
            className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="ถัดไป"
          >
            ›
          </button>
        </nav>
      ) : null}
    </main>
  );
}
