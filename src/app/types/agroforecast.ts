export type Agro7DaysItem = {
  title: string;
  description: string | null;
  alt: string;
  url: string;
  contentdate: string; // "2026-02-11 13:41:00.0000000"
};

export type Agro7DaysResponse = {
  success: boolean;
  data: Agro7DaysItem[];
  message?: string;
};
