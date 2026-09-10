import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSignIn } from "@clerk/tanstack-react-start";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import loginCarBg from "@/assets/login-car-bg.jpg";
import {
  AuthMobileShell,
  AuthOrDivider,
  AuthPrimaryButton,
  AuthSocialButton,
  AuthSwitchLink,
  AuthTextField,
} from "@/components/auth/AuthMobileShell";

export function LoginForm() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const busy = localBusy || fetchStatus === "fetching";

  async function oauth(strategy: "oauth_google" | "oauth_apple") {
    if (!signIn) return;
    setLocalBusy(true);
    try {
      const { error } = await signIn.sso({
        strategy,
        redirectUrl: "/home",
        redirectCallbackUrl: "/sign-in/sso-callback",
      });
      if (error) {
        toast.error(error.message || t("auth_error_generic"));
        setLocalBusy(false);
      }
    } catch {
      toast.error(t("auth_error_generic"));
      setLocalBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    if (!email.trim() || !password) {
      toast.error(t("auth_login_required"));
      return;
    }

    setLocalBusy(true);
    try {
      const { error } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message || t("auth_error_generic"));
        return;
      }

      if (signIn.status === "complete") {
        const fin = await signIn.finalize({
          navigate: async ({ decorateUrl }) => {
            const url = decorateUrl("/home");
            if (url?.startsWith("http")) window.location.href = url;
            else navigate({ to: "/home" });
          },
        });
        if (fin.error) {
          toast.error(fin.error.message || t("auth_error_generic"));
          return;
        }
        navigate({ to: "/home" });
        return;
      }

      // Extra factors (2FA, etc.) — custom login does not cover these yet
      toast.error(t("auth_error_generic"));
    } catch {
      toast.error(t("auth_error_generic"));
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <AuthMobileShell backgroundImage={loginCarBg}>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-3xl">
            {t("auth_login_title")}
          </h1>
          <p className="mx-auto mt-3 max-w-[20rem] text-sm leading-relaxed text-white/75">
            {t("auth_login_subtitle")}
          </p>
        </div>

        <div className="flex gap-3">
          <AuthSocialButton
            provider="google"
            label={t("auth_google")}
            disabled={busy || !signIn}
            onClick={() => void oauth("oauth_google")}
          />
          <AuthSocialButton
            provider="apple"
            label={t("auth_apple")}
            disabled={busy || !signIn}
            onClick={() => void oauth("oauth_apple")}
          />
        </div>

        <AuthOrDivider label={t("auth_or")} />

        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <AuthTextField
            id="login-email"
            type="email"
            placeholder={t("auth_email_placeholder")}
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <AuthTextField
            id="login-password"
            type="password"
            placeholder={t("auth_password_placeholder")}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <AuthPrimaryButton disabled={busy || !signIn}>
            {busy ? t("auth_please_wait") : t("auth_log_in")}
          </AuthPrimaryButton>
        </form>

        <AuthSwitchLink
          prompt={t("auth_no_account")}
          action={t("auth_create_action")}
          to="/"
        />
      </div>
    </AuthMobileShell>
  );
}
