import { SignIn } from "@clerk/tanstack-react-start";
import { BrandLogo } from "@/components/BrandLogo";
import { useLanguage } from "@/lib/language";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { useThemeMode } from "@/lib/theme-mode";

export function SignInWidget() {
  const { t } = useLanguage();
  const { isLight } = useThemeMode();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 flex w-full flex-col items-center justify-center text-center">
          <BrandLogo variant="centered" size="lg" accentClass="text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{t("auth_tagline")}</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
          appearance={getClerkAppearance(isLight ? "light" : "dark")}
        />
      </div>
    </div>
  );
}
