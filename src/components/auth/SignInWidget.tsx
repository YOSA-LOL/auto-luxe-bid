import { SignIn } from "@clerk/tanstack-react-start";
import { useLanguage } from "@/lib/language";
import { getClerkMobileAppearance } from "@/lib/clerk-appearance-mobile";
import { AuthMobileShell } from "@/components/auth/AuthMobileShell";

export function SignInWidget() {
  const { t } = useLanguage();

  return (
    <AuthMobileShell>
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="font-display text-[1.75rem] font-bold text-white">{t("auth_login_title")}</h1>
          <p className="mt-2 text-sm text-white/65">{t("auth_tagline")}</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/get-started"
          forceRedirectUrl="/"
          appearance={getClerkMobileAppearance()}
        />
      </div>
    </AuthMobileShell>
  );
}
