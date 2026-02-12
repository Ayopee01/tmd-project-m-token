export type WeekRegionKey =
  | "north"
  | "northeast"
  | "central"
  | "east"
  | "south_east_coast"
  | "south_west_coast"
  | "bangkok_vicinity";

export type WeekRegionDetail = {
  description: string | null;
  max_rain: string | null;
  max_temp: string | null;
  min_temp: string | null;
};

export type ClimateWeeklyItem = {
  title: string;
  alt: string;
  url: string;
  contentdate: string; // "2026-02-09 10:57:00.0000000"

  thailand: string | null;
  regions?: Partial<Record<WeekRegionKey, WeekRegionDetail>>;
};

export type ClimateWeeklyResponse = {
  success: boolean;
  data: ClimateWeeklyItem[];
  message?: string;
};
