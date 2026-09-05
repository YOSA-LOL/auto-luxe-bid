import { createFileRoute } from "@tanstack/react-router";
import { SignInWidget } from "@/components/auth/SignInWidget";
import { brandPageTitle } from "@/lib/brand";

export const Route = createFileRoute("/sign-in/$")({
  head: () => ({ meta: [{ title: brandPageTitle("Sign In") }] }),
  component: SignInPage,
});

function SignInPage() {
  return <SignInWidget />;
}
