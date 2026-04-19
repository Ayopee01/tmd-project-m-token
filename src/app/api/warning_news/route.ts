import { NextResponse } from "next/server";
import type { NormalizedWarning, TmdWarningApiResponse, WarningSource } from "@/app/types/warning";

export const dynamic = "force-dynamic";

function txt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWarning(raw: TmdWarningApiResponse | null): NormalizedWarning {
  if (!raw || raw.success === false || !raw.data?.length) {
    return null;
  }

  const item = raw.data[0] as WarningSource;

  const title = txt(item.title) || "ประกาศ";
  const description = txt(item.description);
  const contentdate = txt(item.contentdate) || null;
  const url = txt(item.url) || null;
  const alt = txt(item.alt) || null;

  return {
    key: contentdate || title,
    title,
    description,
    contentdate,
    url,
    alt,
    raw: item,
  };
}

export async function GET() {
  try {
    const TMD_WARNING_NEWS_URL = process.env.TMD_WARNING_NEWS_URL;

    if (!TMD_WARNING_NEWS_URL) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing TMD_WARNING_NEWS_URL in environment variables",
        },
        { status: 500 }
      );
    }

    const res = await fetch(TMD_WARNING_NEWS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const raw =
      (await res.json().catch(() => null)) as TmdWarningApiResponse | null;

    const warning = normalizeWarning(raw);

    return NextResponse.json({
      success: true,
      warning,
    });
  } catch {
    return NextResponse.json({
      success: true,
      warning: null,
    });
  }
}