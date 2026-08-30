export type SessionUser = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  isAdmin?: boolean;
};

export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
