export type DailyForecastItem = {
  title: string;
  description: string;
  pdf_url: string;
  contentdate: string;
  infographic_url: string;

  general_climate: string;
  north: string;
  northeast: string;
  central: string;
  east: string;
  south_east_coast: string;
  south_west_coast: string;
  bangkok_vicinity: string;
};

export type DailyForecastResponse = {
  success: boolean;
  data: DailyForecastItem[];
  message?: string;
};

export type DailyForecastSection = { key: keyof DailyForecastItem; label: string };

export const DAILY_SECTIONS: DailyForecastSection[] = [
  { key: "north", label: "ภาคเหนือ" },
  { key: "northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { key: "central", label: "ภาคกลาง" },
  { key: "east", label: "ภาคตะวันออก" },
  { key: "south_east_coast", label: "ภาคใต้ฝั่งตะวันออก" },
  { key: "south_west_coast", label: "ภาคใต้ฝั่งตะวันตก" },
  { key: "bangkok_vicinity", label: "กรุงเทพมหานครและปริมณฑล" },
];
