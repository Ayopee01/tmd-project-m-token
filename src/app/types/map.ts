export type UpperWindItem = {
  title: string;
  description: string | null;
  alt: string | null;
  url: string;
  contentdate: string; // e.g. "2026-01-30 07:00:00.0000000"
};

export type UpperWindResponse = {
  success: boolean;
  // รองรับทั้งแบบ item เดี่ยว หรือ array ของ item
  data: Record<string, UpperWindItem | UpperWindItem[] | null | undefined>;
  message?: string;
};
