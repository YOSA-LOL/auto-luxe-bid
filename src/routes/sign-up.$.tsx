import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { brandPageTitle } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { useThemeMode } from "@/lib/theme-mode";

export const Route = createFileRoute("/sign-up/$")({
  head: () => ({ meta: [{ title: brandPageTitle("Create Account") }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = useLanguage();
  const { isLight } = useThemeMode();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 flex w-full flex-col items-center justify-center text-center">
          <BrandLogo variant="centered" size="lg" linkToHome accentClass="text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{t("auth_signup_tagline")}</p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/"
          appearance={getClerkAppearance(isLight ? "light" : "dark")}
        />
      </div>
    </div>
  );
}
