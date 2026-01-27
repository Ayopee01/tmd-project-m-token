"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardOK, ProvinceForecast } from "@/app/types/tmd";
import {
  STORAGE_KEY,
  fetchDashboard,
  fetchGPSProvince,
  rotateToToday,
  toDDMMYYYY,
} from "@/app/lib/gps";

export default function Forecast7DaysPage() {
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNote, setGpsNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [lastBuildDate, setLastBuildDate] = useState<string>();
  const [provinceIndex, setProvinceIndex] = useState<DashboardOK["provincesIndex"]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceForecast | null>(null);

  const [selectedProvinceKey, setSelectedProvinceKey] = useState("");

  // ✅ กัน hydration mismatch: คำนวณ "วันนี้" หลัง mount
  const [todayStr, setTodayStr] = useState("");

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

  const sevenDaysForShow = useMemo(() => {
    const list = provinceData?.sevenDays ?? [];
    return todayStr ? rotateToToday(list, todayStr) : list;
  }, [provinceData, todayStr]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">พยากรณ์อากาศล่วงหน้า 7 วัน (รายจังหวัด)</h1>

            <p className="text-sm text-gray-600">
              วันที่ของเครื่องวันนี้: <span className="font-medium">{todayStr || "-"}</span>
              {lastBuildDate ? (
                <>
                  {" • "}อัปเดตล่าสุด: <span className="font-medium">{lastBuildDate}</span>
                </>
              ) : null}
            </p>

            {gpsNote ? (
              <p className="mt-1 text-sm text-gray-500">
                {gpsLoading ? "📍 " : "✅ "}
                {gpsNote}
              </p>
            ) : null}
          </div>

          <div className="w-full sm:w-[380px]">
            <label className="mb-1 block text-sm font-medium text-gray-700">เลือกจังหวัด</label>

            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
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
          </div>
        </header>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-xl border p-4 text-gray-700">กำลังโหลดข้อมูล...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              โหลดข้อมูลไม่สำเร็จ: {error}
            </div>
          ) : !provinceData ? (
            <div className="rounded-xl border p-4 text-gray-700">ไม่พบข้อมูลจังหวัด</div>
          ) : (
            <>
              <div className="mb-4 rounded-xl border p-4">
                <div className="text-lg font-semibold">
                  {provinceData.provinceNameThai}{" "}
                  <span className="text-gray-500">({provinceData.provinceNameEnglish})</span>
                </div>
                <div className="text-sm text-gray-600">
                  แสดงผล 7 วัน (จะยก “วันนี้” ขึ้นมาก่อนอัตโนมัติ ถ้ามี)
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sevenDaysForShow.map((d) => {
                  const isToday = todayStr && d.forecastDate === todayStr;

                  return (
                    <div
                      key={`${provinceData.provinceNameThai}-${d.forecastDate}`}
                      className={[
                        "rounded-2xl border p-4 shadow-sm",
                        isToday ? "border-black" : "border-gray-200",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-base font-semibold">
                            {d.forecastDate}
                            {isToday ? (
                              <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-xs text-white">
                                วันนี้
                              </span>
                            ) : null}
                          </div>

                          <div className="text-sm text-gray-600 break-words">
                            {d.descriptionThai ?? "-"}
                            {d.descriptionEnglish ? (
                              <span className="text-gray-400"> ({d.descriptionEnglish})</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-500">ฝน(%)</div>
                          <div className="text-lg font-semibold">{d.percentRainCover ?? "-"}</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-gray-500">อุณหภูมิสูงสุด</div>
                          <div className="text-lg font-semibold">{d.maxTempC ?? "-"}°C</div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-gray-500">อุณหภูมิต่ำสุด</div>
                          <div className="text-lg font-semibold">{d.minTempC ?? "-"}°C</div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-gray-500">ทิศทางลม</div>
                          <div className="text-lg font-semibold">{d.windDirectionDeg ?? "-"}°</div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-gray-500">ความเร็วลม</div>
                          <div className="text-lg font-semibold">{d.windSpeedKmh ?? "-"} km/h</div>
                        </div>
                      </div>

                      {(d.temperatureThai || d.temperatureEnglish) && (
                        <div className="mt-3 text-sm text-gray-600">
                          ระดับอุณหภูมิ:{" "}
                          <span className="font-medium">{d.temperatureThai ?? "-"}</span>{" "}
                          {d.temperatureEnglish ? (
                            <span className="text-gray-400">({d.temperatureEnglish})</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
