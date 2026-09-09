import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSignUp } from "@clerk/tanstack-react-start";
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

export function GetStartedForm() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password" | "verify">("email");
  const [code, setCode] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const busy = localBusy || fetchStatus === "fetching";

  async function oauth(strategy: "oauth_google" | "oauth_apple") {
    if (!signUp) return;
    setLocalBusy(true);
    try {
      const { error } = await signUp.sso({
        strategy,
        redirectUrl: "/",
        redirectCallbackUrl: "/sign-up/sso-callback",
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

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;

    if (step === "email") {
      if (!email.trim()) {
        toast.error(t("auth_email_required"));
        return;
      }
      setStep("password");
      return;
    }

    if (step === "password") {
      if (password.length < 8) {
        toast.error(t("auth_password_short"));
        return;
      }
      setLocalBusy(true);
      try {
        const { error } = await signUp.password({
          emailAddress: email.trim(),
          password,
        });
        if (error) {
          toast.error(error.message || t("auth_error_generic"));
          return;
        }
        const send = await signUp.verifications.sendEmailCode();
        if (send.error) {
          toast.error(send.error.message || t("auth_error_generic"));
          return;
        }
        setStep("verify");
      } catch {
        toast.error(t("auth_error_generic"));
      } finally {
        setLocalBusy(false);
      }
      return;
    }

    setLocalBusy(true);
    try {
      const verified = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verified.error) {
        toast.error(verified.error.message || t("auth_error_generic"));
        return;
      }
      if (signUp.status === "complete") {
        const fin = await signUp.finalize({
          navigate: async ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url?.startsWith("http")) window.location.href = url;
            else navigate({ to: "/" });
          },
        });
        if (fin.error) {
          toast.error(fin.error.message || t("auth_error_generic"));
          return;
        }
        navigate({ to: "/" });
        return;
      }
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
            {t("auth_create_title")}
          </h1>
          <p className="mx-auto mt-3 max-w-[20rem] text-sm leading-relaxed text-white/75">
            {t("auth_create_subtitle")}
          </p>
        </div>

        {step !== "verify" && (
          <div className="flex gap-3">
            <AuthSocialButton
              provider="google"
              label={t("auth_google")}
              disabled={busy || !signUp}
              onClick={() => void oauth("oauth_google")}
            />
            <AuthSocialButton
              provider="apple"
              label={t("auth_apple")}
              disabled={busy || !signUp}
              onClick={() => void oauth("oauth_apple")}
            />
          </div>
        )}

        {step !== "verify" && <AuthOrDivider label={t("auth_or")} />}

        <form onSubmit={(e) => void onContinue(e)} className="flex flex-col gap-4">
          {step === "email" && (
            <AuthTextField
              id="get-started-email"
              type="email"
              placeholder={t("auth_email_placeholder")}
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
          )}

          {step === "password" && (
            <>
              <p className="text-center text-sm text-white/60">{email}</p>
              <AuthTextField
                id="get-started-password"
                type="password"
                placeholder={t("auth_password_placeholder")}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="text-sm text-white/55 underline-offset-2 hover:text-white/80 hover:underline"
                onClick={() => {
                  void signUp?.reset();
                  setStep("email");
                }}
              >
                {t("auth_change_email")}
              </button>
            </>
          )}

          {step === "verify" && (
            <>
              <p className="text-center text-sm text-white/65">{t("auth_verify_hint")}</p>
              <AuthTextField
                id="get-started-code"
                type="text"
                placeholder={t("auth_code_placeholder")}
                value={code}
                onChange={setCode}
                autoComplete="one-time-code"
              />
            </>
          )}

          <AuthPrimaryButton disabled={busy || !signUp}>
            {busy ? t("auth_please_wait") : step === "verify" ? t("auth_verify") : t("auth_continue")}
          </AuthPrimaryButton>
        </form>

        <AuthSwitchLink prompt={t("auth_have_account")} action={t("auth_log_in")} to="/login" />
      </div>
    </AuthMobileShell>
  );
}
