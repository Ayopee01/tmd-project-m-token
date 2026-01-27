import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import type { DashboardFail, DashboardResponse } from "@/app/types/tmd";
import { buildDashboardResponse } from "@/app/lib/province";

export const revalidate = 300;

// URL API Weather Forecast 7 Days
const TMD_URL = "https://data.tmd.go.th/api/WeatherForecast7Days/v2/?uid=api&ukey=api12345";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province") ?? undefined;

    const res = await fetch(TMD_URL, {
      headers: { Accept: "application/xml" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const out: DashboardFail = {
        success: false,
        message: `Upstream error: ${res.status}`,
      };
      return NextResponse.json(out, { status: 502 });
    }

    const rawXml = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
    });

    const parsed = parser.parse(rawXml);

    const out: DashboardResponse = buildDashboardResponse(parsed, province);

    return NextResponse.json(out);
  } catch (err: unknown) {
    const out: DashboardFail = {
      success: false,
      message: "Failed to fetch dashboard",
      snippet: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(out, { status: 500 });
  }
}
