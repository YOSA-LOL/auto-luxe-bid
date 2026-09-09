import { createFileRoute } from "@tanstack/react-router";
import { GetStartedForm } from "@/components/auth/GetStartedForm";
import { brandPageTitle } from "@/lib/brand";

export const Route = createFileRoute("/get-started")({
  head: () => ({ meta: [{ title: brandPageTitle("Create Account") }] }),
  component: GetStartedPage,
});

function GetStartedPage() {
  return <GetStartedForm />;
}
