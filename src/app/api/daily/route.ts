import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

// URL API พยากรณ์อากาศรายวัน
const TMD_URL = "https://data.tmd.go.th/api/TMDForecastDaily/v1/";

export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get("mode");

    const res = await fetch(TMD_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Upstream error: ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const sourceData = Array.isArray(json?.data) ? json.data : [];

    const data = [...sourceData].sort(
      (a, b) =>
        new Date(String(b.contentdate).replace(" ", "T").replace(/\.\d+$/, "")).getTime() -
        new Date(String(a.contentdate).replace(" ", "T").replace(/\.\d+$/, "")).getTime()
    );

    return NextResponse.json({
      success: true,
      data: mode === "initial" ? data.slice(0, 1) : data,
      message: json?.message ?? "Successfully , Data found",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch Daily API" },
      { status: 500 }
    );
  }
}