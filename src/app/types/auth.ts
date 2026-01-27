export type DgaUser = {
  userId?: string | number;
  citizenId?: string;
  firstName?: string;
  lastName?: string;

  // เผื่อมี field อื่น ๆ จาก API
  [key: string]: unknown;
};

export type AuthContextValue = {
  user: DgaUser | null;
  loading: boolean;
  setUser: (user: DgaUser | null) => void;
  logout: () => void;
};

/////////////////////////////////////////////////

export interface SessionUser {
  userId: string;
  firstName: string;
  lastName: string;
}

export type LoginResponseBody =
  | { success: true; user: SessionUser }
  | { success: false; message: string; detail?: unknown };

export type MeResponseBody =
  | { success: true; user: SessionUser }
  | { success: false; message: string };
