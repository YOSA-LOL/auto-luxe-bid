export const clerkAppearance = {
  variables: {
    colorBackground: "#0d0d1a",
    colorInputBackground: "#12122a",
    colorText: "#ffffff",
    colorTextSecondary: "#8888aa",
    colorPrimary: "#7c3aed",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorTextOnPrimaryBackground: "#ffffff",
    borderRadius: "0.75rem",
    fontFamily: "Manrope, sans-serif",
    fontSize: "14px",
  },
  elements: {
    rootBox: "w-full",
    card: "!bg-[#0d0d1a] !border !border-purple-900/40 !shadow-[0_0_60px_rgba(124,58,237,0.08)] !rounded-2xl",
    headerTitle: "!text-white !font-bold",
    headerSubtitle: "!text-[#8888aa]",
    logoBox: "hidden",

    socialButtons: "!gap-2.5",
    socialButtonsBlockButton:
      "!bg-[#16162e] !border !border-purple-800/40 !text-white hover:!bg-[#1f1f42] hover:!border-purple-600/50 !transition-colors !h-11",
    socialButtonsBlockButtonText: "!text-white !font-medium",
    socialButtonsBlockButtonArrow: "!text-white",

    socialButtonsIconButton:
      "!bg-[#16162e] !border !border-purple-800/40 hover:!bg-[#1f1f42] hover:!border-purple-600/50 !transition-colors !h-11 !w-11",
    socialButtonsProviderIcon: "!opacity-100",

    socialButtonsIconButton__apple:
      "!bg-[#1c1c1e] !border !border-[#48484a] hover:!bg-[#2c2c2e] hover:!border-[#636366] !transition-colors [&_svg]:!invert [&_svg]:!brightness-[10]",

    socialButtonsIconButton__facebook:
      "!bg-[#1877F2] !border !border-[#1877F2] hover:!bg-[#166FE5] hover:!border-[#166FE5] !transition-colors",

    formFieldInput:
      "!bg-[#111126] !border !border-purple-800/30 !text-white placeholder:!text-[#555577] focus:!border-purple-500 !h-11",
    formFieldLabel: "!text-[#aaaacc] !text-xs !uppercase !tracking-wider",
    formButtonPrimary:
      "!bg-[#7c3aed] hover:!bg-[#6d28d9] !text-white !font-semibold !transition-colors !shadow-[0_0_20px_rgba(124,58,237,0.3)] !h-11",
    dividerLine: "!bg-purple-900/40",
    dividerText: "!text-[#555577]",
    footerActionLink: "!text-purple-400 hover:!text-purple-300",
    footerActionText: "!text-[#8888aa]",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-purple-400",
    otpCodeFieldInput: "!bg-[#111126] !border !border-purple-800/30 !text-white",
    formFieldErrorText: "!text-red-400",
    formFieldSuccessText: "!text-green-400",
    badge: "!bg-purple-900/30 !text-purple-300",
    alternativeMethodsBlockButton:
      "!bg-[#1a1a35] !border !border-purple-800/30 !text-white hover:!bg-[#1f1f42]",
    footer: "!bg-transparent",
    main: "!gap-5",
  },
};
