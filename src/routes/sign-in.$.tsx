import { createFileRoute } from "@tanstack/react-router";
import { SignInWidget } from "@/components/auth/SignInWidget";

export const Route = createFileRoute("/sign-in/$")({
  head: () => ({ meta: [{ title: "Sign In — APEXAuto" }] }),
  component: SignInPage,
});

function SignInPage() {
  return <SignInWidget />;
}
