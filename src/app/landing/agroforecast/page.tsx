"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
} from "react-icons/fi";

import type { Agro7DaysItem, Agro7DaysResponse } from "@/app/types/agroforecast";

const AGRO_API_ROUTE = `${process.env.NEXT_PUBLIC_API_ROUTE ?? "/test2"}/api/agroforecast`;

const PAGE_SIZE = 6;

type YearFilter = "all" | `${number}`;

function toDate(raw: string): Date | null {
  if (!raw) return null;
  const isoLike = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TH_DATE = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function thaiDate(d: Date): string {
  return TH_DATE.format(d);
}

function beYear(d: Date): number {
  return d.getFullYear() + 543;
}

function titleOf(it: Agro7DaysItem): string {
  return (it.title || it.alt || "—").trim() || "—";
}

function pageTokens(current: number, total: number): Array<number | "…"> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const last = total;

  if (current <= 2) return [1, 2, 3, "…", last];
  if (current === 3) return [1, 2, 3, 4, "…", last];
  if (current >= last - 1) return [1, "…", last - 2, last - 1, last];
  if (current === last - 2) return [1, "…", last - 3, last - 2, last - 1, last];

  return [1, "…", current - 1, current, current + 1, "…", last];
}

export default function AgroForecast7DaysPage() {
  const [items, setItems] = useState<Agro7DaysItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown filter (ตาม Figma: เอกสารทั้งหมด + ปี)
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");

  // Pagination
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(AGRO_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as Agro7DaysResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad response");
      }

      const sorted = [...json.data].sort((a, b) => {
        const da = toDate(a.contentdate)?.getTime() ?? 0;
        const db = toDate(b.contentdate)?.getTime() ?? 0;
        return db - da;
      });

      setItems(sorted);
      setYearFilter("all");
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    for (const it of items) {
      const d = toDate(it.contentdate);
      if (d) set.add(beYear(d));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return items;
    const y = Number(yearFilter);
    return items.filter((it) => {
      const d = toDate(it.contentdate);
      return d ? beYear(d) === y : false;
    });
  }, [items, yearFilter]);

  useEffect(() => {
    setPage(1);
  }, [yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-9 w-96 max-w-full rounded bg-gray-200" />
              <div className="h-5 w-80 max-w-full rounded bg-gray-200" />
              <div className="mt-6 h-11 w-full max-w-md rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 ring-1 ring-black/5" />
            ))}
          </div>
        </section>
      </main>
    );
  }

  /** ===== Error ===== */
  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-medium text-gray-900">
                พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
              </h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">
                ไม่สามารถโหลดข้อมูลได้ในขณะนี้
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">{error}</p>
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
      {/* Header (BG ตามตัวอย่าง) */}
      <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-medium text-gray-900">
              พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
            </h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">
              พยากรณ์อากาศเกษตร 7 วันข้างหน้า
            </p>
          </div>

          {/* Filter */}
          <div className="mt-6 w-full sm:mt-8">
            <div className="relative w-full sm:max-w-md">
              <FiCalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
              <select
                value={yearFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const v = e.target.value;
                  setYearFilter(v === "all" ? "all" : (v as `${number}`));
                }}
                className="
                  h-11 w-full appearance-none
                  rounded-xl border border-gray-300 bg-white
                  pl-12 pr-11
                  text-sm font-medium text-gray-900
                  shadow-sm outline-none
                  focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100
                "
              >
                <option value="all">เอกสารทั้งหมด</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    ปี {y}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        {pageItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-700">ไม่พบเอกสาร</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {pageItems.map((it) => {
              const d = toDate(it.contentdate);
              const updated = d ? thaiDate(d) : it.contentdate;

              return (
                <div
                  key={`${it.contentdate}-${it.url}`}
                  className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
                >
                  <div className="p-5">
                    {/* ✅ แก้ตรงนี้: Title ยาวแล้วตัดบรรทัด ไม่ดันปุ่ม */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="flex-1 min-w-0 text-lg font-semibold leading-snug text-gray-900 break-words">
                        {titleOf(it)}
                      </h3>

                      <a
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          group inline-flex w-full shrink-0 items-center justify-center gap-2
                          rounded-xl border border-emerald-600 bg-white
                          px-4 py-3 text-sm font-semibold text-emerald-700
                          transition
                          hover:bg-emerald-700 hover:text-white
                          sm:w-auto sm:min-w-[180px] sm:px-5 sm:py-2.5
                          whitespace-nowrap
                        "
                      >
                        <FiDownload className="h-5 w-5" aria-hidden="true" />
                        ดาวน์โหลดเอกสาร
                      </a>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          อัปเดต:{" "}
                          <span className="font-medium text-gray-700">{updated}</span>
                        </div>
                        <div>
                          หมวดหมู่:{" "}
                          <span className="font-medium text-gray-700">
                            จุดพยากรณ์อากาศเกษตร
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination (ขวาล่างแบบ Figma) */}
        {totalPages > 1 ? (
          <nav className="mt-10 flex items-center justify-center gap-1 sm:justify-end">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-lg px-2 py-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="ก่อนหน้า"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>

            {pageTokens(pageSafe, totalPages).map((t, idx) => {
              if (t === "…") {
                return (
                  <span key={`dots-${idx}`} className="px-2 py-2 text-gray-400">
                    …
                  </span>
                );
              }

              const n = t as number;
              const active = n === pageSafe;

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={[
                    "min-w-10 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "font-semibold text-gray-900"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {n}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="rounded-lg px-2 py-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="ถัดไป"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
