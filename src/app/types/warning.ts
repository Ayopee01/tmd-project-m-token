export type WarningSource = {
  title?: string;
  description?: string;
  url?: string;
  alt?: string;
  contentdate?: string;
};

export type TmdWarningApiResponse =
  | {
    success: boolean;
    data?: WarningSource[] | null;
    message?: string;
  }
  | null;

export type WarningItem = {
  key: string;
  title: string;
  description: string;
  contentdate: string | null;
  url: string | null;
  alt: string | null;
  raw: WarningSource;
};

export type WarningData = WarningItem[];