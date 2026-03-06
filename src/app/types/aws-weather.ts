// app/types/aws-weather.ts

export type AwsWeatherItem = {
  provinceId: number;
  provinceNameTh: string;
  provinceNameEn: string;
  regionNameTh: string;
  regionNameEn: string;

  stationId: number;
  stationNameTh: string;
  stationNameEn: string;
  stationLat: number;
  stationLon: number;

  temperature: number | null;
  temperatureMinToday: number | null;
  temperatureMaxToday: number | null;
  humidity: number | null;

  windDirection: number | null;
  windSpeed: number | null;

  precip15Mins: number | null;
  precip1Hr: number | null;
  precipToday: number | null;

  pressure: number | null;
  weatherType: string | null;
  tempType: string | null;
  waveType: string | null;

  stationName: string;
  temperatureText: string;
  windSpeedText: string;
  precip15Text: string;
  precipTodayText: string;
  precipTodayNote: string;

  dateTimeUtc7: string; // "2026-02-19T15:51:00.000+0700"
};

export type AwsApiResponse = {
  success: boolean;
  data: AwsWeatherItem[];
  message: string;
};

/** response ตอนเรียก /api/aws-weather?all=1 */
export type AwsAllResponse = {
  success: true;
  count: number; // 81
  data: Record<
    string,
    AwsApiResponse | { success: false; data: []; message: string }
  >;
};