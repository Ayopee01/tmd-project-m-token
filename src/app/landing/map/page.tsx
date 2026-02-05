"use client";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

/** ✅ รองรับ basePath (/test2) */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/test2";

/** ✅ ปรับให้ตรงกับ route ของคุณ */
const UPPER_WIND_API_ROUTE = `${BASE_PATH}/api/map`;

/** ---- Types ---- */
type UpperWindItem = {
  title: string;
  description: string;
  alt: string;
  url: string;
  contentdate: string; // "2026-01-30 07:00:00.0000000"
};

type UpperWindKey =
  | "UpperWind925hPa"
  | "UpperWind850hPa"
  | "UpperWind700hPa"
  | "UpperWind500hPa"
  | "UpperWind300hPa"
  | "UpperWind200hPa";

type UpperWindResponse = {
  success: boolean;
  data: Partial<Record<UpperWindKey, UpperWindItem>>;
  message?: string;
};

/** ---- Helpers ---- */
function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
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

function clean(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function levelLabel(key: UpperWindKey): string {
  const map: Record<UpperWindKey, string> = {
    UpperWind925hPa: "ระดับ 925 hPa",
    UpperWind850hPa: "ระดับ 850 hPa",
    UpperWind700hPa: "ระดับ 700 hPa",
    UpperWind500hPa: "ระดับ 500 hPa",
    UpperWind300hPa: "ระดับ 300 hPa",
    UpperWind200hPa: "ระดับ 200 hPa",
  };
  return map[key];
}

function levelShort(key: UpperWindKey): string {
  const map: Record<UpperWindKey, string> = {
    UpperWind925hPa: "925",
    UpperWind850hPa: "850",
    UpperWind700hPa: "700",
    UpperWind500hPa: "500",
    UpperWind300hPa: "300",
    UpperWind200hPa: "200",
  };
  return `${map[key]} hPa`;
}

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 3v2M17 3v2M4.5 8.5h15M6.5 5.5h11c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-11c-1.1 0-2-.9-2-2v-12c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M5.5 7.5a1 1 0 0 1 1.4 0L10 10.6l3.1-3.1a1 1 0 1 1 1.4 1.4l-3.8 3.8a1 1 0 0 1-1.4 0L5.5 8.9a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

/** ---- Page ---- */
export default function UpperWindMapPage() {
  const [raw, setRaw] = useState<UpperWindResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dropdown state
  const [selectedLevel, setSelectedLevel] = useState<UpperWindKey>("UpperWind925hPa");
  const [selectedTimeKey, setSelectedTimeKey] = useState<string>("");
  const [applied, setApplied] = useState<{ level: UpperWindKey; timeKey: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(UPPER_WIND_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as UpperWindResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !json?.data) throw new Error(json?.message || "Bad response");

      setRaw(json);

      // ตั้งค่าเริ่มต้น: เลือก level ที่มีข้อมูล + เลือกเวลาของ level นั้น
      const keys = Object.keys(json.data) as UpperWindKey[];
      const firstKey = keys.find((k) => json.data?.[k]?.url) ?? "UpperWind925hPa";
      const firstItem = json.data[firstKey];

      setSelectedLevel(firstKey);
      setSelectedTimeKey(firstItem?.contentdate ?? "");
      setApplied({ level: firstKey, timeKey: firstItem?.contentdate ?? "" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ระดับที่มีข้อมูลจริง
  const availableLevels = useMemo(() => {
    const d = raw?.data ?? {};
    const all: UpperWindKey[] = [
      "UpperWind925hPa",
      "UpperWind850hPa",
      "UpperWind700hPa",
      "UpperWind500hPa",
      "UpperWind300hPa",
      "UpperWind200hPa",
    ];
    return all.filter((k) => !!d[k]?.url);
  }, [raw]);

  // เวลา (unique) จากทุกระดับ
  const timeOptions = useMemo(() => {
    const d = raw?.data ?? {};
    const times = new Map<string, Date>();

    for (const k of Object.keys(d) as UpperWindKey[]) {
      const it = d[k];
      if (!it?.contentdate) continue;
      const dt = parseContentDate(it.contentdate);
      if (dt) times.set(it.contentdate, dt);
    }

    return Array.from(times.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([key, date]) => ({ key, label: thaiDateTime(date) }));
  }, [raw]);

  // เมื่อเปลี่ยน level ให้ sync เวลา (เลือกเวลาของ level นั้น ถ้าไม่มี ใช้เวลาแรก)
  useEffect(() => {
    const it = raw?.data?.[selectedLevel];
    if (it?.contentdate) setSelectedTimeKey(it.contentdate);
    else setSelectedTimeKey(timeOptions[0]?.key ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevel]);

  // item ที่จะแสดงจริง (หลังกด “แสดงแผนที่”)
  const shown = useMemo(() => {
    if (!raw?.data) return null;
    const level = applied?.level ?? selectedLevel;
    return raw.data[level] ?? null;
  }, [raw, applied, selectedLevel]);

  const shownDate = shown?.contentdate ? parseContentDate(shown.contentdate) : null;

  // กัน url ที่เป็น path ให้มี basePath
  const shownUrl = useMemo(() => {
    const u = shown?.url ?? "";
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith(BASE_PATH + "/")) return u;
    if (u.startsWith("/")) return `${BASE_PATH}${u}`;
    return `${BASE_PATH}/${u}`;
  }, [shown?.url]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-3">
              <div className="h-7 w-72 rounded bg-gray-200" />
              <div className="h-4 w-80 rounded bg-gray-200" />
              <div className="mt-6 h-10 w-full rounded bg-gray-200" />
              <div className="mt-6 h-[520px] rounded-2xl bg-gray-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !raw || !shown) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">แผนที่ลมชั้นบนระดับต่างๆ</h1>
            <p className="mt-2 text-sm text-red-600">{error || "ไม่พบข้อมูล"}</p>
            <button
              onClick={load}
              className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* ===== Header ===== */}
        <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* bg map-ish */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-220px] top-[-160px] h-[560px] w-[560px] rounded-full bg-gray-200/50 blur-3xl" />
            <div className="absolute right-[80px] top-[10px] h-[340px] w-[340px] rounded-full bg-gray-300/30 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/80" />
          </div>

          <div className="relative px-4 py-4 sm:px-6 sm:py-5">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              แผนที่ลมชั้นบนระดับต่างๆ
            </h1>
            <p className="mt-1 text-sm text-gray-600">แผนที่ลมชั้นบนจาก TMD</p>

            {/* Controls */}
            {/* Mobile:
                - แถว 1: ระดับ (เต็มบรรทัด)
                - แถว 2: เวลา (กินที่เหลือ) + ปุ่ม (ชิดขวา)
               Desktop:
                - อยู่แถวเดียว: level | time | button
            */}
            <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr_auto] md:items-center">
              {/* Select: level */}
              <div className="relative w-full">
                <label className="sr-only">เลือกระดับ</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as UpperWindKey)}
                  className="
                    h-10 w-full appearance-none
                    rounded-lg border border-gray-200 bg-white
                    px-3 pr-10
                    text-sm font-medium text-gray-900
                    outline-none
                    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100
                  "
                >
                  {availableLevels.map((k) => (
                    <option key={k} value={k}>
                      {`แผนที่ลมชั้นบน ${levelLabel(k)}`}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconChevronDown className="h-5 w-5" />
                </span>
              </div>

              {/* wrapper: mobile ให้ time+button อยู่แถวเดียวกัน / md ใช้ contents */}
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 md:contents">
                {/* Select: time */}
                <div className="relative w-full">
                  <label className="sr-only">เลือกเวลา</label>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <IconCalendar className="h-5 w-5" />
                  </span>
                  <select
                    value={selectedTimeKey}
                    onChange={(e) => setSelectedTimeKey(e.target.value)}
                    className="
                      h-10 w-full appearance-none
                      rounded-lg border border-gray-200 bg-white
                      pl-10 pr-10
                      text-sm font-medium text-gray-900
                      outline-none
                      focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100
                    "
                  >
                    {timeOptions.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <IconChevronDown className="h-5 w-5" />
                  </span>
                </div>

                {/* Button: show */}
                <button
                  onClick={() => setApplied({ level: selectedLevel, timeKey: selectedTimeKey })}
                  className="
                    h-10 shrink-0
                    rounded-lg bg-emerald-600 px-4
                    text-sm font-semibold text-white
                    hover:bg-emerald-700
                  "
                >
                  แสดงแผนที่
                </button>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100" />
        </section>

        {/* ===== Title (บรรทัดเดียวตามตัวอย่าง) ===== */}
        <section className="mt-6">
          <div className="text-base font-semibold text-gray-900 sm:text-lg">
            {clean(shown.title || shown.alt || `แผนที่ลมชั้นบน ${levelShort(selectedLevel)}`)}
            {" - "}
            {shownDate ? thaiDateTime(shownDate) : clean(shown.contentdate)}
          </div>
        </section>

        {/* ===== Image area (ไม่มีการ์ด/กรอบหนา) ===== */}
        <section className="mt-4">
          {shownUrl ? (
            <div className="flex justify-center">
              <div className="w-full max-w-[520px]">
                <Image
                  src={shownUrl}
                  alt={shown.alt || shown.title || "Upper wind map"}
                  width={1600}
                  height={1000}
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">ไม่พบรูปแผนที่</p>
          )}
        </section>

        {/* ข้อความใต้รูป (มาจาก API) */}
        {shownUrl && clean(shown.description) ? (
          <p className="mt-6 text-center text-xs text-gray-500">
            {clean(shown.description)}
          </p>
        ) : null}
      </div>
    </main>
  );
}
