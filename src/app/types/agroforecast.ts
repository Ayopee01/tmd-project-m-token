// Type ข้อมูลจาก API
export type Agro7DaysItem = {
  title: string;
  description: string | null;
  alt: string;
  url: string;
  contentdate: string; 
};

// Type response ที่ได้จาก API
export type Agro7DaysResponse = {
  success: boolean;
  data: Agro7DaysItem[];
  message?: string;
};

// Type ของค่าที่ใช้กรองปี
export type YearFilter = "all" | `${number}`;