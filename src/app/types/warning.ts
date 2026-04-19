export type WarningSource = {
  title?: string;
  description?: string;
  url?: string;
  alt?: string;
  contentdate?: string;
};

export type NormalizedWarning =
  | {
    key: string;
    title: string;
    description: string;
    contentdate: string | null;
    url: string | null;
    alt: string | null;
    raw: WarningSource;
  }
  | null;

export type TmdWarningApiResponse =
  | {
    success: boolean;
    data?: WarningSource[] | null;
    message?: string;
  }
  | null;

export type WarningData = {
  key: string;
  title: string;
  description: string;
  contentdate: string | null;
  url: string | null;
  alt: string | null;
  raw: unknown;
} | null;