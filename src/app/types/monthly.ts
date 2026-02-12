export type ClimateMonthlyItem = {
  content: string;
  title: string;
  description: string | null;
  alt: string;
  url: string;
  contentdate: string; // "2026-01-31 13:53:00.0000000"
};

export type ClimateMonthlyResponse = {
  success: boolean;
  data: ClimateMonthlyItem[];
  message?: string;
};