import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

type AuthMobileShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Optional full-bleed background image (e.g. luxury car photo on login). */
  backgroundImage?: string;
};

/** Mobile-first auth layout matching the blue gradient Create Account / Login design. */
export function AuthMobileShell({ children, className, backgroundImage }: AuthMobileShellProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col overflow-hidden text-white",
        !backgroundImage &&
          "bg-[linear-gradient(180deg,#2B6BFF_0%,#1A45A0_28%,#0A1628_62%,#000000_100%)]",
        className,
      )}
    >
      {backgroundImage ? (
        <>
          <img
            src={backgroundImage}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_32%] md:object-[center_10%] lg:object-[center_6%]"
          />
          {/* Mobile: fade down into the form. Desktop: keep the car framed higher. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,16,32,0.28)_0%,rgba(8,16,32,0.4)_28%,rgba(4,8,18,0.78)_58%,rgba(0,0,0,0.94)_100%)] md:bg-[linear-gradient(180deg,rgba(8,16,32,0.22)_0%,rgba(8,16,32,0.35)_40%,rgba(0,0,0,0.78)_72%,rgba(0,0,0,0.94)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(74,144,226,0.22),transparent_70%)]"
          />
        </>
      ) : (
        <>
          {/* Soft diagonal light streak */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.12)_48%,transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-full bg-[#4A90E2]/25 blur-3xl"
          />
        </>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-center gap-2.5 pt-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
            <BrandMark className="h-6 w-6" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            {BRAND_NAME}
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-end py-8 sm:justify-center">{children}</div>

        <footer className="flex items-center justify-center gap-2 pb-2 text-center text-xs text-white/55">
          <button
            type="button"
            className="underline underline-offset-2 transition-colors hover:text-white/80"
            onClick={() => toast.message(t("footer_toast_terms"))}
          >
            {t("auth_terms")}
          </button>
          <span aria-hidden className="text-white/35">
            |
          </span>
          <button
            type="button"
            className="underline underline-offset-2 transition-colors hover:text-white/80"
            onClick={() => toast.message(t("footer_toast_privacy"))}
          >
            {t("auth_privacy")}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function AuthSocialButton({
  provider,
  label,
  onClick,
  disabled,
}: {
  provider: "google" | "apple";
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-white/12 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/18 disabled:opacity-50"
    >
      {provider === "google" ? <GoogleIcon /> : <AppleIcon />}
      {label}
    </button>
  );
}

export function AuthPrimaryButton({
  children,
  disabled,
  type = "submit",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#4A90E2_0%,#80E8FF_100%)] text-base font-bold text-[#0A1628] shadow-[0_8px_28px_rgba(74,144,226,0.35)] transition-transform active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AuthTextField({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      autoComplete={autoComplete}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-full bg-white/12 px-5 text-sm text-white outline-none ring-1 ring-white/15 backdrop-blur-md placeholder:text-white/45 focus:ring-2 focus:ring-[#80E8FF]/50"
    />
  );
}

export function AuthOrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/20" />
      <span className="text-sm text-white/60">{label}</span>
      <div className="h-px flex-1 bg-white/20" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.6 6.5l.1.1 6.3 5.3C36.8 41.2 44 36 44 24c0-1.3-.1-2.7-.4-3.9z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="white" aria-hidden>
      <path d="M13.2 6.1c-.1.1-1.8 1-1.8 3.1 0 2.4 2.1 3.3 2.2 3.3-.1.2-.3.7-.7 1.4-.5.8-1.1 1.7-2 1.7-.8 0-1.1-.5-2.1-.5s-1.3.5-2.1.5c-.9 0-1.5-.9-2.1-1.7C3.5 12.2 2.7 9.3 3.8 7.3c.6-1.1 1.7-1.8 2.8-1.8.9 0 1.7.6 2.1.6.4 0 1.4-.7 2.4-.6.4 0 1.6.2 2.3 1.3-.1 0-.1.1-.2.3zM10.7 2.4c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.6-.4 2.2-1.1z" />
    </svg>
  );
}

/** Optional link helper used by forms */
export function AuthSwitchLink({
  prompt,
  action,
  to,
}: {
  prompt: string;
  action: string;
  to: "/login" | "/";
}) {
  return (
    <p className="text-center text-sm text-white/70">
      {prompt}{" "}
      <Link to={to} className="font-semibold text-white hover:underline">
        {action}
      </Link>
    </p>
  );
}
