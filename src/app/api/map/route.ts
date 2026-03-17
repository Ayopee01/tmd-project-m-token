import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

const TMD_URL = "https://data.tmd.go.th/api/TmdUpperWindMap/v1/";

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
    const sourceData = json?.data;

    if (!sourceData?.UpperWind925hPa) {
      return NextResponse.json(
        { success: false, message: "Invalid API response" },
        { status: 500 }
      );
    }

    const data =
      mode === "initial"
        ? { UpperWind925hPa: sourceData.UpperWind925hPa }
        : sourceData;

    return NextResponse.json({
      success: true,
      data,
      message: json?.message ?? "Successfully , Data found",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch Map API" },
      { status: 500 }
    );
  }
}