import { NextResponse } from "next/server";
import type { NormalizedWarning, TmdWarningApiResponse, WarningSource } from "@/app/types/warning";

export const dynamic = "force-dynamic";

function txt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWarning(raw: TmdWarningApiResponse | null): NormalizedWarning {
  if (!raw || raw.success === false || !raw.data) {
    return null;
  }

  const source = Array.isArray(raw.data) ? raw.data[0] : raw.data;

  if (!source || typeof source !== "object") {
    return null;
  }

  const item = source as WarningSource;

  const title =
    txt(item.title) ||
    txt(item.TitleThai) ||
    txt(item.headline) ||
    txt(item.subject) ||
    "ประกาศ";

  const description =
    txt(item.description) ||
    txt(item.DescriptionThai) ||
    txt(item.detail) ||
    txt(item.message) ||
    "";

  const publishedAt =
    txt(item.publishedAt) ||
    txt(item.publishDate) ||
    txt(item.announceDate) ||
    txt(item.AnnounceDateTime) ||
    txt(item.date) ||
    null;

  const key = String(
    item.id ??
      item.IssueNo ??
      publishedAt ??
      title
  );

  return {
    key,
    title,
    description,
    publishedAt,
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

    const raw = (await res.json().catch(() => null)) as TmdWarningApiResponse | null;
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