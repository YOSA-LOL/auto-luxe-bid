import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { brandPageTitle } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { getClerkMobileAppearance } from "@/lib/clerk-appearance-mobile";
import { AuthMobileShell } from "@/components/auth/AuthMobileShell";

export const Route = createFileRoute("/sign-up/$")({
  head: () => ({ meta: [{ title: brandPageTitle("Create Account") }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = useLanguage();

  return (
    <AuthMobileShell>
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="font-display text-[1.75rem] font-bold text-white">{t("auth_create_title")}</h1>
          <p className="mt-2 text-sm text-white/65">{t("auth_create_subtitle")}</p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/login"
          forceRedirectUrl="/"
          appearance={getClerkMobileAppearance()}
        />
      </div>
    </AuthMobileShell>
  );
}
