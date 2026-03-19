import { NextRequest, NextResponse } from "next/server";
// lib
import { buildNominatimUrl, normalizeProvinceThai, pickProvinceThai } from "src/app/lib/province";
// types
import type { NominatimResponse, ProvinceFail, ProvinceResponse } from "@/app/types/dashboard";

// Route นี้จะทำหน้าที่รับ lat/lng จาก query, ไปเรียก Nominatim API เพื่อ reverse geocode, แล้วดึงชื่อจังหวัดไทยออกมาให้
export const dynamic = "force-dynamic";

// Function GET จะถูกเรียกเมื่อมี request เข้ามาที่ /api/province?lat=...&lng=...
export async function GET(req: NextRequest) {
  try {
    // ดึง lat/lng จาก query parameters
    const searchParams = req.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    // ตรวจสอบว่ามี lat/lng หรือไม่ ถ้าไม่มีก็ส่ง error response กลับไป
    if (!lat || !lng) {
      const out: ProvinceFail = { success: false, message: "Missing lat/lng" };
      return NextResponse.json(out, { status: 400 });
    }

    // สร้าง URL สำหรับเรียก Nominatim API ด้วย lat/lng ที่ได้รับมา
    const url = buildNominatimUrl(lat, lng);

    // เรียก Nominatim API เพื่อ reverse geocode
    const res = await fetch(url, {
      headers: { "User-Agent": "TMD_Project/1.0" },
      // ยิง Request ใหม่ทุกๆ 24 ชั่วโมง
      next: { revalidate: 86400 },

    });

    // ถ้าไม่สำเร็จให้ส่ง error response กลับไป status 502 (Bad Gateway)
    if (!res.ok) {
      const out: ProvinceFail = {
        success: false,
        message: `Reverse geocode error: ${res.status}`,
      };
      return NextResponse.json(out, { status: 502 });
    }

    // ถ้าเรียกสำเร็จ ให้แปลง response เป็น JSON และดึงข้อมูลจังหวัดไทยออกมา
    const data = (await res.json()) as NominatimResponse;

    // เรียกใช้ Function จาก lib/province.ts เพื่อดึงชื่อจังหวัดไทยจาก response ของ Nominatim และ normalize ชื่อให้เป็นรูปแบบที่ต้องการ
    const rawProvince = pickProvinceThai(data);
    const finalName = normalizeProvinceThai(rawProvince);

    // สร้าง response object ที่จะส่งกลับไปยัง client
    const out: ProvinceResponse = {
      success: true,
      provinceThai: finalName,
    };

    // ส่ง response กลับไปยัง client พร้อมกับ header สำหรับ caching
    return NextResponse.json(out, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err: unknown) {
    console.error("reverse-province error:", err);
    const out: ProvinceFail = { success: false, message: "Reverse geocode failed" };
    return NextResponse.json(out, { status: 500 });
  }
}
