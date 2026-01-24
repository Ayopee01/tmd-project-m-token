import type {
  DailyForecast,
  ProvinceForecast,
  DashboardOK,
  JsonRecord,
  NormalizeProvinceOptions,
  NominatimResponse,
} from "app/types/tmd";

// เลือกชื่อจังหวัดจากผลลัพธ์ Nominatim
export const pickProvinceThai = (data: NominatimResponse): string => {
  const a = data.address;
  // ลำดับความสำคัญ: state > province > county > region
  return (a?.state ?? a?.province ?? a?.county ?? a?.region ?? "").trim();
};

// ทำให้ชื่อจังหวัดเป็นรูปแบบมาตรฐาน
export const normalizeProvinceThai = (
  name: string,
  opt: NormalizeProvinceOptions = {}
): string => {
  let s = (name ?? "").trim();

  // ตัด String คำว่า "จังหวัด" ออก
  s = s.replace(/^จังหวัด\s*/i, "").trim();

  // ใช้สำหรับการเทียบ/ค้นหา
  if (opt.forKey) {
    s = s.toLowerCase().replace(/\s+/g, "").trim();
  }

  return s;
};

// สร้าง URL สำหรับเรียก Nominatim Reverse Geocoding
export const buildNominatimUrl = (lat: string, lng: string) =>
  `https://nominatim.openstreetmap.org/reverse` +
  `?format=jsonv2&lat=${encodeURIComponent(lat)}` +
  `&lon=${encodeURIComponent(lng)}` +
  `&accept-language=th`;

// ตรวจสอบว่าเป็น JSON Record หรือไม่
export const isRecord = (v: unknown): v is JsonRecord =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// ดึงค่าจาก Record โดยปลอดภัย
export const get = (obj: unknown, key: string): unknown =>
  isRecord(obj) ? obj[key] : undefined;

// แปลงค่าเป็น Array
export const toArray = <T,>(v: unknown): T[] =>
  v == null ? [] : Array.isArray(v) ? (v as T[]) : ([v] as T[]);

// แปลงค่าเป็น number หรือ null
export const toNumberOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (isRecord(v)) {
    const t = get(v, "#text");
    if (typeof t === "number" && Number.isFinite(t)) return t;
    if (typeof t === "string") {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
};

// ถอดรหัส HTML Entities
export const decodeHtmlEntities = (s: string) =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// ดึงข้อความจากค่าใดๆ
export const pickText = (v: unknown): string => {
  if (typeof v === "string") return decodeHtmlEntities(v);
  if (typeof v === "number") return String(v);
  if (isRecord(v)) {
    const t = get(v, "#text") ?? get(v, "text") ?? get(v, "value");
    if (typeof t === "string") return decodeHtmlEntities(t);
    if (typeof t === "number") return String(t);
  }
  return "";
};

// ทำให้ข้อมูลพยากรณ์รายวันเป็นรูปแบบมาตรฐาน
export function normalizeSevenDays(raw: unknown): DailyForecast[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item): DailyForecast => {
        const d = isRecord(item) ? item : {};
        return {
          forecastDate: String(get(d, "ForecastDate") ?? ""),
          maxTempC: toNumberOrNull(get(d, "MaximumTemperature")),
          minTempC: toNumberOrNull(get(d, "MinimumTemperature")),
          windDirectionDeg: toNumberOrNull(get(d, "WindDirection")),
          windSpeedKmh: toNumberOrNull(get(d, "WindSpeed")),
          percentRainCover: toNumberOrNull(get(d, "PercentRainCover")),
          descriptionThai: pickText(get(d, "DescriptionThai")) || undefined,
          descriptionEnglish: pickText(get(d, "DescriptionEnglish")) || undefined,
          temperatureThai: pickText(get(d, "TemperatureThai")) || undefined,
          temperatureEnglish: pickText(get(d, "TemperatureEnglish")) || undefined,
        };
      })
      .filter((x) => x.forecastDate);
  }

  // ถ้าไม่ใช่ Array ให้ลองดึงค่าต่างๆ มาเป็น Array
  if (!isRecord(raw)) return [];

  // ดึงค่าเป็น Array
  const dates = toArray<string>(get(raw, "ForecastDate"));
  const maxs = toArray<unknown>(get(raw, "MaximumTemperature"));
  const mins = toArray<unknown>(get(raw, "MinimumTemperature"));
  const windDirs = toArray<unknown>(get(raw, "WindDirection"));
  const windSpeeds = toArray<unknown>(get(raw, "WindSpeed"));
  const rains = toArray<unknown>(get(raw, "PercentRainCover"));
  const descTh = toArray<unknown>(get(raw, "DescriptionThai"));
  const descEn = toArray<unknown>(get(raw, "DescriptionEnglish"));
  const tempTh = toArray<unknown>(get(raw, "TemperatureThai"));
  const tempEn = toArray<unknown>(get(raw, "TemperatureEnglish"));

  // สร้าง DailyForecast จากข้อมูลที่ดึงมา
  return dates
    .map((date, i): DailyForecast => ({
      forecastDate: String(date ?? ""),
      maxTempC: toNumberOrNull(maxs[i]),
      minTempC: toNumberOrNull(mins[i]),
      windDirectionDeg: toNumberOrNull(windDirs[i]),
      windSpeedKmh: toNumberOrNull(windSpeeds[i]),
      percentRainCover: toNumberOrNull(rains[i]),
      descriptionThai: pickText(descTh[i]) || undefined,
      descriptionEnglish: pickText(descEn[i]) || undefined,
      temperatureThai: pickText(tempTh[i]) || undefined,
      temperatureEnglish: pickText(tempEn[i]) || undefined,
    }))
    .filter((x) => x.forecastDate);
}

// สร้างผลลัพธ์ Dashboard จากข้อมูลที่แปลงมาแล้ว
export function buildDashboardResponse(parsed: unknown, provinceParam?: string): DashboardOK {
  const root =
    get(parsed, "WeatherForecast7Days") ??
    get(parsed, "weatherForecast7Days") ??
    parsed;

  // ดึงข้อมูล LastBuildDate
  const lastBuildDate =
    get(get(root, "header"), "LastBuildDate") ??
    get(get(root, "Header"), "LastBuildDate") ??
    get(root, "LastBuildDate");

  // ดึงข้อมูลจังหวัด
  const provincesRaw =
    get(get(root, "Provinces"), "Province") ??
    get(get(root, "provinces"), "province") ??
    get(root, "provinces") ??
    [];

  // แปลงข้อมูลจังหวัด
  const provinces = toArray<unknown>(provincesRaw).map((p) => {
    const pr = isRecord(p) ? p : {};
    const provinceNameThai = pickText(get(pr, "ProvinceNameThai") ?? get(pr, "provinceNameThai"));
    const provinceNameEnglish = pickText(
      get(pr, "ProvinceNameEnglish") ?? get(pr, "provinceNameEnglish")
    );

    // ดึงข้อมูลพยากรณ์รายวัน
    const sevenDaysRaw =
      get(pr, "SevenDaysForecast") ??
      get(pr, "sevenDaysForecast") ??
      get(pr, "SevenDays") ??
      get(pr, "sevenDays");

    const sevenDays = normalizeSevenDays(sevenDaysRaw);

    // สร้าง ProvinceForecast
    return { provinceNameThai, provinceNameEnglish, sevenDays } satisfies ProvinceForecast;
  });

  // สร้างดัชนีจังหวัด
  const provincesIndex = provinces.map((p) => ({
    provinceNameThai: p.provinceNameThai,
    provinceNameEnglish: p.provinceNameEnglish,
  }));

  // ค้นหาจังหวัดที่ต้องการ
  const wantedKey = provinceParam ? normalizeProvinceThai(provinceParam, { forKey: true }) : "";

  // หา ProvinceForecast ที่ตรงกับพารามิเตอร์
  const found =
    wantedKey
      ? provinces.find(
        (p) =>
          normalizeProvinceThai(p.provinceNameThai, { forKey: true }) === wantedKey ||
          normalizeProvinceThai(p.provinceNameEnglish, { forKey: true }) === wantedKey
      )
      : provinces[0];

  // สร้างผลลัพธ์สุดท้าย
  return {
    success: true,
    lastBuildDate: typeof lastBuildDate === "string" ? lastBuildDate : undefined,
    provincesIndex,
    province: found ?? null,
  };
}
