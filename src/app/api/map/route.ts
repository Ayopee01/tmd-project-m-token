import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const TMD_UPPER_WIND_URL = process.env.TMD_UPPER_WIND_URL;

    if (!TMD_UPPER_WIND_URL) {
      return NextResponse.json(
        { success: false, message: "Missing TMD_UPPER_WIND_URL in environment variables" },
        { status: 500 }
      );
    }

    const mode = req.nextUrl.searchParams.get("mode");

    const res = await fetch(TMD_UPPER_WIND_URL, {
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

    if (!sourceData?.AirmapSurface) {
      return NextResponse.json(
        { success: false, message: "Invalid API response" },
        { status: 500 }
      );
    }

    const data =
      mode === "initial"
        ? { AirmapSurface: sourceData.AirmapSurface }
        : sourceData;

    return NextResponse.json({
      success: true,
      data,
      message: json?.message ?? "Successfully, Data found",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Map API",
        snippet: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}