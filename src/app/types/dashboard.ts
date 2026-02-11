// พยากรณ์อากาศจากกรมอุตุนิยมวิทยา (TMD)
export type DailyForecast = {
  forecastDate: string;
  maxTempC: number | null;
  minTempC: number | null;
  windDirectionDeg: number | null;
  windSpeedKmh: number | null;
  percentRainCover: number | null;
  descriptionThai?: string;
  descriptionEnglish?: string;
  temperatureThai?: string;
  temperatureEnglish?: string;
};
// ข้อมูลพยากรณ์อากาศของจังหวัด
export type ProvinceForecast = {
  provinceNameThai: string;
  provinceNameEnglish: string;
  sevenDays: DailyForecast[];
};
// ผลลัพธ์เมื่อสำเร็จ API Dashboard
export type DashboardOK = {
  success: true;
  lastBuildDate?: string;
  provincesIndex: Array<{ provinceNameThai: string; provinceNameEnglish: string }>;
  province: ProvinceForecast | null;
};
export type DashboardResponse = DashboardOK | DashboardFail;
// ผลลัพธ์เมื่อเกิดข้อผิดพลาด API Dashboard
export type DashboardFail = {
  success: false;
  message: string;
  snippet?: string;
};
// ผลลัพธ์เมื่อแปลงพิกัดเป็นจังหวัดสำเร็จ
export type ProvinceOK = {
  success: true;
  provinceThai: string;
};
// ผลลัพธ์เมื่อแปลงพิกัดเป็นจังหวัดไม่สำเร็จ
export type ProvinceFail = {
  success: false;
  message: string;
};
export type ProvinceResponse = ProvinceOK | ProvinceFail;
// ผลลัพธ์จาก Nominatim API
export type NominatimResponse = {
  address?: {
    state?: string;
    province?: string;
    county?: string;
    region?: string;
  };
};
// ตัวเลือกการทำงานของฟังก์ชัน normalizeProvinceThai
export type NormalizeProvinceOptions = {
  forKey?: boolean; // true = ใช้เทียบ/ค้นหา, false = ใช้แสดงผล
};

export type JsonRecord = Record<string, unknown>;