import { NextResponse } from "next/server";
import type { NominatimResponse, ProvinceFail, ProvinceResponse } from "@/app/types/dashboard";
import { buildNominatimUrl, normalizeProvinceThai, pickProvinceThai ,  } from "src/app/lib/province";

export const revalidate = 86400; // 1 day (route cache)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      const out: ProvinceFail = { success: false, message: "Missing lat/lng" };
      return NextResponse.json(out, { status: 400 });
    }

    const url = buildNominatimUrl(lat, lng);

    const res = await fetch(url, {
      headers: { "User-Agent": "TMD_Project/1.0" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      const out: ProvinceFail = {
        success: false,
        message: `Reverse geocode error: ${res.status}`,
      };
      return NextResponse.json(out, { status: 502 });
    }

    const data = (await res.json()) as NominatimResponse;

    const rawProvince = pickProvinceThai(data);
    const finalName = normalizeProvinceThai(rawProvince);

    const out: ProvinceResponse = {
      success: true,
      provinceThai: finalName,
    };

    return NextResponse.json(out);
  } catch (err: unknown) {
    console.error("reverse-province error:", err);
    const out: ProvinceFail = { success: false, message: "Reverse geocode failed" };
    return NextResponse.json(out, { status: 500 });
  }
}
