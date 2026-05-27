import { createServerFn } from "@tanstack/react-start";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  picture?: string;
};

const DEMO_USER: SessionUser = {
  id: "demo-user-1",
  name: "Alex Hassan",
  email: "alex@apexauto.com",
  picture: undefined,
};

export const getUser = createServerFn().handler(async (): Promise<SessionUser | null> => {
  return DEMO_USER;
});

export const signOut = createServerFn().handler(async (): Promise<void> => {
  // No-op in demo mode
});
