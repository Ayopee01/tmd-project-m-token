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
