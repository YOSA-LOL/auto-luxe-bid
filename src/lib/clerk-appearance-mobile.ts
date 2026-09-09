import type { Appearance } from "@clerk/types";

/** Clerk chrome tuned for the mobile blue-gradient auth shell. */
export function getClerkMobileAppearance(): Appearance {
  return {
    variables: {
      colorBackground: "transparent",
      colorInputBackground: "rgba(255,255,255,0.1)",
      colorText: "#ffffff",
      colorTextSecondary: "rgba(255,255,255,0.65)",
      colorPrimary: "#4A90E2",
      colorDanger: "#f87171",
      colorSuccess: "#4ade80",
      colorTextOnPrimaryBackground: "#0A1628",
      borderRadius: "1.5rem",
      fontFamily: "Manrope, sans-serif",
      fontSize: "14px",
    },
    elements: {
      rootBox: "w-full",
      card: "!bg-transparent !border-0 !shadow-none !p-0",
      header: "hidden",
      logoBox: "hidden",
      socialButtons: "!gap-3 !grid !grid-cols-2",
      socialButtonsBlockButton:
        "!bg-white/10 !border-0 !ring-1 !ring-white/10 !text-white hover:!bg-white/15 !h-12 !rounded-2xl",
      socialButtonsBlockButtonText: "!text-white !font-medium",
      formFieldInput:
        "!bg-white/10 !border-0 !ring-1 !ring-white/10 !text-white placeholder:!text-white/45 focus:!ring-2 focus:!ring-[#80E8FF]/50 !h-12 !rounded-full",
      formFieldLabel: "!text-white/60 !text-xs",
      formButtonPrimary:
        "!bg-[linear-gradient(90deg,#4A90E2_0%,#80E8FF_100%)] hover:opacity-95 !text-[#0A1628] !font-bold !h-12 !rounded-full !shadow-[0_8px_28px_rgba(74,144,226,0.35)]",
      dividerLine: "!bg-white/20",
      dividerText: "!text-white/60",
      footerActionLink: "!text-white hover:!underline !font-semibold",
      footerActionText: "!text-white/70",
      identityPreviewText: "!text-white",
      identityPreviewEditButton: "!text-[#80E8FF]",
      otpCodeFieldInput: "!bg-white/10 !border-0 !ring-1 !ring-white/10 !text-white !rounded-xl",
      formFieldErrorText: "!text-red-300",
      formFieldSuccessText: "!text-green-300",
      footer: "!bg-transparent",
      main: "!gap-5",
    },
  };
}
