"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardOK, ProvinceForecast } from "@/app/types/dashboard";
import {
  STORAGE_KEY,
  fetchDashboard,
  fetchGPSProvince,
  rotateToToday,
  toDDMMYYYY,
} from "@/app/lib/gps";

/** dd/mm/yyyy -> timestamp */
const ddmmyyyyToTime = (s: string) => {
  const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return Number.POSITIVE_INFINITY;
  return new Date(yyyy, mm - 1, dd).getTime();
};

export default function Forecast7DaysPage() {
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNote, setGpsNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [lastBuildDate, setLastBuildDate] = useState<string>();
  const [provinceIndex, setProvinceIndex] = useState<DashboardOK["provincesIndex"]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceForecast | null>(null);

  const [selectedProvinceKey, setSelectedProvinceKey] = useState("");
  const [todayStr, setTodayStr] = useState("");

  // ✅ เลือกวันจากการ์ด
  const [selectedIdx, setSelectedIdx] = useState(0);

  // ✅ ถ้าผู้ใช้เปลี่ยนเอง จะไม่ให้ GPS override
  const userChangedRef = useRef(false);

  const applyOK = (ok: DashboardOK) => {
    setLastBuildDate(ok.lastBuildDate);
    setProvinceIndex(ok.provincesIndex);
    setProvinceData(ok.province ?? null);

    const key = ok.province?.provinceNameThai ?? "";
    if (key) {
      setSelectedProvinceKey(key);
      localStorage.setItem(STORAGE_KEY, key);
    }
  };

  const loadProvince = async (provinceThai?: string) => {
    setLoading(true);
    setError(null);

    try {
      const ok = await fetchDashboard(provinceThai);
      applyOK(ok);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setProvinceData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayStr(toDDMMYYYY(new Date()));

    let cancelled = false;

    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setSelectedProvinceKey(saved);

    // 1) โหลดทันที
    loadProvince(saved || undefined);

    // 2) GPS วิ่งคู่ขนาน
    (async () => {
      setGpsLoading(true);
      const gpsProvince = await fetchGPSProvince(setGpsNote);
      setGpsLoading(false);

      if (cancelled) return;
      if (!gpsProvince) return;

      if (!userChangedRef.current && gpsProvince !== (saved || "")) {
        await loadProvince(gpsProvince);
        setGpsNote(`เลือกจังหวัดอัตโนมัติจาก GPS: ${gpsProvince}`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provinceOptions = useMemo(
    () =>
      provinceIndex.map((p) => ({
        label: `${p.provinceNameThai} (${p.provinceNameEnglish})`,
        value: p.provinceNameThai,
      })),
    [provinceIndex]
  );

  // ✅ เรียงวันที่ให้ถูกก่อน แล้วค่อย rotate ให้ “วันนี้” อยู่หน้าแรก
  const sevenDaysForShow = useMemo(() => {
    const list = provinceData?.sevenDays ?? [];
    const sorted = [...list].sort(
      (a, b) => ddmmyyyyToTime(a.forecastDate) - ddmmyyyyToTime(b.forecastDate)
    );
    return todayStr ? rotateToToday(sorted, todayStr) : sorted;
  }, [provinceData, todayStr]);

  // ✅ เมื่อข้อมูลเปลี่ยน ให้เลือกการ์ดตัวแรก (วันนี้) เสมอ
  useEffect(() => {
    if (!sevenDaysForShow.length) return;
    setSelectedIdx(0);
  }, [sevenDaysForShow]);

  const selectedDay = sevenDaysForShow[selectedIdx] ?? sevenDaysForShow[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100">
      {/* soft clouds */}
      <div className="pointer-events-none absolute -bottom-36 left-1/2 h-80 w-[1200px] -translate-x-1/2 rounded-[999px] bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 left-1/2 h-96 w-[1400px] -translate-x-1/2 rounded-[999px] bg-white/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[1000px] -translate-x-1/2 rounded-[999px] bg-white/60 blur-2xl" />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">
              อุตุนิยมวิทยาและแผ่นดินไหว
            </h1>

            <div className="text-xs text-slate-700/70">
              วันนี้: <span className="font-medium text-slate-900">{todayStr || "-"}</span>
              {lastBuildDate ? (
                <>
                  {" · "}อัปเดตล่าสุด:{" "}
                  <span className="font-medium text-slate-900">{lastBuildDate}</span>
                </>
              ) : null}
            </div>

            {gpsNote ? (
              <div className="text-xs text-slate-700/70">
                {gpsLoading ? "📍 " : "✅ "}
                {gpsNote}
              </div>
            ) : null}
          </div>

          {/* Province select */}
          <div className="w-full sm:w-[360px]">
            <label className="sr-only">เลือกจังหวัด</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-full border border-white/40 bg-white/35 px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm backdrop-blur
                           focus:outline-none focus:ring-2 focus:ring-white/70 disabled:opacity-60"
                value={selectedProvinceKey}
                onChange={(e) => {
                  userChangedRef.current = true;
                  const v = e.target.value;
                  setSelectedProvinceKey(v);
                  localStorage.setItem(STORAGE_KEY, v);
                  loadProvince(v);
                }}
                disabled={loading || provinceOptions.length === 0}
              >
                {provinceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-700/70">
                ▼
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <div className="mt-10">
          {loading ? (
            <div className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/35 p-6 shadow-sm backdrop-blur">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-40 rounded bg-white/60" />
                <div className="h-3 w-72 rounded bg-white/50" />
                <div className="h-24 w-full rounded-2xl bg-white/40" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="h-28 rounded-2xl bg-white/40" />
                  <div className="h-28 rounded-2xl bg-white/40" />
                  <div className="h-28 rounded-2xl bg-white/40" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-red-200/60 bg-white/60 p-6 text-red-700 shadow-sm backdrop-blur">
              โหลดข้อมูลไม่สำเร็จ: {error}
            </div>
          ) : !provinceData ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-white/40 bg-white/35 p-6 text-slate-900 shadow-sm backdrop-blur">
              ไม่พบข้อมูลจังหวัด
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              {/* Title + selected date */}
              <div className="text-base font-semibold text-slate-900">
                {provinceData.provinceNameThai}
              </div>
              <div className="mt-1 text-xs text-slate-700/70">
                วันที่ที่เลือก:{" "}
                <span className="font-medium text-slate-900">
                  {selectedDay?.forecastDate ?? "-"}
                </span>
                {todayStr && selectedDay?.forecastDate === todayStr ? (
                  <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 text-[11px] text-slate-800 shadow-sm">
                    วันนี้
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-700/80">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-sm" />
                <span className="max-w-[85vw] truncate">
                  {selectedDay?.descriptionThai ?? "-"}
                </span>
              </div>

              {/* Big temperature */}
              <div className="mt-7 rounded-[28px] border border-white/40 bg-white/30 px-8 py-7 shadow-sm backdrop-blur">
                <div className="flex items-center justify-center gap-10">
                  <div className="flex flex-col items-center">
                    <div className="text-7xl font-light tracking-tight text-slate-800">
                      {selectedDay?.maxTempC ?? "-"}°
                    </div>
                    <div className="text-6xl font-light tracking-tight text-slate-700/80">
                      {selectedDay?.minTempC ?? "-"}°
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 text-slate-700/70">
                    <span className="text-sm leading-none">▲</span>
                    <span className="text-sm leading-none">▼</span>
                  </div>
                </div>
              </div>

              {/* Mini stats */}
              <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/40 bg-white/35 p-5 shadow-sm backdrop-blur">
                  <div className="text-2xl">💨</div>
                  <div className="mt-2 text-sm text-slate-700/80">ความเร็วลม</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {selectedDay?.windSpeedKmh ?? "-"} km/h
                  </div>
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/35 p-5 shadow-sm backdrop-blur">
                  <div className="text-2xl">🌧️</div>
                  <div className="mt-2 text-sm text-slate-700/80">โอกาสฝน</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {selectedDay?.percentRainCover ?? "-"}%
                  </div>
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/35 p-5 shadow-sm backdrop-blur">
                  <div className="text-2xl">🧭</div>
                  <div className="mt-2 text-sm text-slate-700/80">ทิศทางลม</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {selectedDay?.windDirectionDeg ?? "-"}°
                  </div>
                </div>
              </div>

              {/* 7 days cards */}
              <div className="mt-10 w-full">
                <div className="text-sm text-slate-800/80">
                  อุณหภูมิสูงสุด-ต่ำสุด ล่วงหน้า 7 วัน (กดเพื่อดูรายละเอียด)
                </div>

                <div
                  className="mt-4 overflow-x-auto pb-2
                             [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="mx-auto flex w-max gap-3 snap-x snap-mandatory px-1">
                    {sevenDaysForShow.map((d, idx) => {
                      const isActive = idx === selectedIdx;
                      const isToday = todayStr && d.forecastDate === todayStr;

                      return (
                        <button
                          key={`${provinceData.provinceNameThai}-${d.forecastDate}`}
                          type="button"
                          onClick={() => setSelectedIdx(idx)}
                          className={[
                            "snap-start min-w-[104px] rounded-2xl border px-4 py-3 text-center shadow-sm backdrop-blur transition",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                            isActive
                              ? "border-slate-900/25 bg-white/70 ring-1 ring-white/40"
                              : "border-white/40 bg-white/35 hover:bg-white/55",
                          ].join(" ")}
                          aria-label={`เลือกวันที่ ${d.forecastDate}`}
                        >
                          <div className="text-xs text-slate-700/80">
                            {d.forecastDate}
                            {isToday ? (
                              <span className="ml-1 text-[10px] text-slate-900/70">• วันนี้</span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-lg font-semibold text-slate-900">
                            {d.maxTempC ?? "-"}°
                          </div>
                          <div className="text-sm text-slate-700/80">
                            {d.minTempC ?? "-"}°
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Optional English */}
              {selectedDay?.descriptionEnglish ? (
                <div className="mt-4 max-w-xl text-xs text-slate-700/60">
                  {selectedDay.descriptionEnglish}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
