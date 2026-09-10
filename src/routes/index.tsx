import { createFileRoute } from "@tanstack/react-router";
import { GetStartedForm } from "@/components/auth/GetStartedForm";
import { brandPageTitle } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: brandPageTitle("Get Started") }] }),
  component: GetStartedPage,
});

function GetStartedPage() {
  return <GetStartedForm />;
}
