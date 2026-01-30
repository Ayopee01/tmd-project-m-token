// types/daily-forecast.ts
export type DailyForecastItem = {
  title: string;
  description: string;
  pdf_url: string;
  contentdate: string; // "2026-01-30 12:00:00.0000000"
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

export type DailyForecastResponse = {
  success: boolean;
  data: DailyForecastItem[];
  message: string;
};

// helpers/date-th.ts
const TH_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

function safeParseContentDate(input: string): Date | null {
  if (!input) return null;
  // "2026-01-30 12:00:00.0000000" -> ตัดเศษวินาทีให้เหลือ 3 หลักพอ
  const [datePart, timePartRaw] = input.split(" ");
  if (!datePart || !timePartRaw) return null;

  const timePart = timePartRaw.split(".")[0] ?? timePartRaw; // "12:00:00"
  const isoLike = `${datePart}T${timePart}`; // ไม่ระบุ TZ -> ใช้ local
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? null : d;
}

export function formatThaiDate(d: Date | null): string {
  if (!d) return "-";
  const day = d.getDate();
  const month = TH_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `${day} ${month} ${yearBE}`;
}

export function formatThaiTime(d: Date | null): string {
  if (!d) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} น.`;
}

export function getSortedForecast(items: { contentdate: string }[]) {
  // contentdate เป็น "YYYY-MM-DD HH:mm:ss..." -> compare แบบ string ได้
  return [...items].sort((a, b) => b.contentdate.localeCompare(a.contentdate));
}

export function parseContentDate(input: string): Date | null {
  return safeParseContentDate(input);
}

export function previewText(s: string, max = 60) {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + "…";
}
