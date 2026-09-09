import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/LoginForm";
import { brandPageTitle } from "@/lib/brand";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: brandPageTitle("Sign In") }] }),
  component: LoginPage,
});

function LoginPage() {
  return <LoginForm />;
}
