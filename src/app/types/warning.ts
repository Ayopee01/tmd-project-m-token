export type WarningSource = Record<string, unknown> & {
  id?: string | number;
  IssueNo?: string | number;
  title?: string;
  TitleThai?: string;
  headline?: string;
  subject?: string;
  description?: string;
  DescriptionThai?: string;
  detail?: string;
  message?: string;
  publishedAt?: string;
  publishDate?: string;
  announceDate?: string;
  AnnounceDateTime?: string;
  date?: string;
};

export type TmdWarningApiResponse = {
  success?: boolean;
  data?: WarningSource | WarningSource[] | null;
  message?: string;
};

export type WarningPopupItem = {
  key: string;
  title: string;
  description: string;
  publishedAt: string | null;
  raw: WarningSource;
};

export type NormalizedWarning = WarningPopupItem | null;