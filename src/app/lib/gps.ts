import type {
  DashboardOK,
  DashboardResponse,
  DailyForecast,
  ProvinceResponse,
} from "@/app/types/tmd";

export const DASHBOARD_ROUTE = "/api/dashboard"; // เส้นทาง API DASHBOARD
export const REVERSE_ROUTE = "/api/province"; // เส้นทาง API แปลงพิกัดเป็นจังหวัด
export const STORAGE_KEY = "tmd_selected_province"; // เก็บจังหวัดที่เลือกใน localStorage

// Function เติมเลข 0 หน้าให้ครบ 2 หลัก
export const pad2 = (n: number) => String(n).padStart(2, "0");

// Function แปลงวันที่เป็นรูปแบบ DD/MM/YYYY
export const toDDMMYYYY = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

// Function รายการพยากรณ์ให้เริ่มจากวันนี้ปัจจุบัน
export const rotateToToday = (list: DailyForecast[], todayStr: string) => {
  const idx = list.findIndex((x) => x.forecastDate === todayStr);
  return idx > 0 ? [...list.slice(idx), ...list.slice(0, idx)] : list;
};

// Function ดึงข้อมูลจังหวัดจาก api/dashboard
export async function fetchDashboard(province?: string): Promise<DashboardOK> {
  // สร้าง URL
  const url = province
    ? `${DASHBOARD_ROUTE}?province=${encodeURIComponent(province)}` // ระบุจังหวัด
    : DASHBOARD_ROUTE; // ไม่ระบุจังหวัด

  // ดึงข้อมูลไปยัง API ไม่ใช้แคชของเบราว์เซอร์ ระบุรับ JSON
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  // แปลงผลลัพธ์เป็น JSON
  const data = (await res.json()) as DashboardResponse;

  // ตรวจสอบความสำเร็จ
  if (!res.ok || !data.success) {
    const message = data.success ? `Fetch failed: ${res.status}` : data.message;
    throw new Error(message);
  }

  return data;
}

// ดึงจังหวัดจาก GPS
export async function fetchGPSProvince(setNote: (s: string) => void): Promise<string> {
  // ตรวจสอบว่าเบราว์เซอร์รองรับ Geolocation หรือไม่
  if (!navigator.geolocation) {
    setNote("อุปกรณ์ไม่รองรับการระบุตำแหน่ง (GPS)");
    return "";
  }

  // Function ระบุตำแหน่งแบบ Promise
  const getPosition = (opt: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, opt)
    );

  try {
    setNote("กำลังระบุตำแหน่ง (GPS)...");

    // พยายามระบุตำแหน่งด้วย timeout สั้นก่อน
    let pos: GeolocationPosition;
    try {
      pos = await getPosition({ // การตั้งค่าระบุตำแหน่ง
        enableHighAccuracy: false, // ไม่ต้องการความแม่นยำสูง
        timeout: 3500, // รอได้ไม่เกิน 3.5 วินาที
        maximumAge: 600000, // ใช้ตำแหน่งที่เก่าที่สุดไม่เกิน 10 นาที
      });
      // ถ้าสำเร็จ ให้ใช้ตำแหน่งนี้
    } catch {
      pos = await getPosition({ // การตั้งค่าระบุตำแหน่ง (สำรอง)
        enableHighAccuracy: false, // ไม่ต้องการความแม่นยำสูง
        timeout: 12000, // รอได้ไม่เกิน 12 วินาที
        maximumAge: 0, // ไม่ใช้ตำแหน่งเก่า
      });
    }

    // ถ้าสำเร็จ
    const res = await fetch(
      `${REVERSE_ROUTE}?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
    );

    // ตรวจสอบผลลัพธ์ กรณีไม่สำเร็จ
    if (!res.ok) {
      setNote("หา GPS ได้ แต่แปลงเป็นจังหวัดไม่สำเร็จ");
      return "";
    }

    const json = (await res.json()) as ProvinceResponse;

    if (!json || !json.success || !json.provinceThai) {
      setNote("หา GPS ได้ แต่แปลงเป็นจังหวัดไม่สำเร็จ");
      return "";
    }

    // กรณีสำเร็จ จะแจ้งจังหวัดที่พบ
    setNote(`พบจังหวัดจาก GPS: ${json.provinceThai}`);
    return json.provinceThai; // คืนชื่อจังหวัด
  } catch (err: unknown) { // กรณีล้มเหลว
    const code = // ตรวจสอบรหัสข้อผิดพลาด
      typeof err === "object" && // กรณีเป็น object
      err && // ไม่เป็น null
      // Check if err ในกรณีต่างๆ มี property
      "code" in err &&
      typeof (err as { code?: unknown }).code === "number" // property code เป็น number
        ? (err as { code: number }).code // ดึงรหัสข้อผิดพลาด
        : -1;

    // แจ้งข้อผิดพลาดตามรหัสในกรณีที่ล้มเหลวต่างๆ
    if (code === 1) setNote("ผู้ใช้ไม่อนุญาตให้เข้าถึงตำแหน่ง (GPS)"); 
    else if (code === 2) setNote("ไม่สามารถระบุตำแหน่งได้"); 
    else if (code === 3) setNote("หมดเวลาในการระบุตำแหน่ง"); 
    else setNote("ไม่สามารถใช้ GPS ได้"); 

    return "";
  }
}
