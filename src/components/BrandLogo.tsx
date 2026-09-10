import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";
import { useThemeMode } from "@/lib/theme-mode";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "inline" | "centered";
  size?: "sm" | "md" | "lg";
  linkToHome?: boolean;
  accentClass?: string;
  className?: string;
  /** Hide brand name on small screens — icon only */
  compact?: boolean;
};

const markSizes = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-14 w-14" };
const textSizes = { sm: "text-base", md: "text-lg", lg: "text-3xl" };

export function BrandLogo({
  variant = "inline",
  size = "md",
  linkToHome = false,
  accentClass = "text-gradient-primary",
  className,
  compact = false,
}: BrandLogoProps) {
  const { isLight } = useThemeMode();
  const [first, second] = BRAND_NAME.split(" ");

  const mark = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl p-2 transition-transform",
        isLight
          ? "bg-gradient-to-br from-[#2a323a] to-[#14171a] shadow-[0_8px_24px_rgba(20,23,26,0.2)] ring-1 ring-[#b8956c]/40"
          : "bg-gradient-to-br from-purple-600 to-violet-800 shadow-[0_0_28px_rgba(124,58,237,0.45)]",
        markSizes[size],
        linkToHome && "group-hover:scale-105",
      )}
    >
      <BrandMark />
    </div>
  );

  const name = (
    <span className={cn(
      "font-display font-bold tracking-tight whitespace-nowrap",
      textSizes[size],
      compact && "hidden min-[400px]:inline",
    )}>
      {first}
      <span className={accentClass}> {second}</span>
    </span>
  );

  const content =
    variant === "centered" ? (
      <div className="flex w-full flex-col items-center justify-center gap-4 text-center">
        {mark}
        <div className="text-foreground">{name}</div>
      </div>
    ) : (
      <div className="flex items-center gap-2.5">
        {mark}
        {name}
      </div>
    );

  if (linkToHome) {
    return (
      <Link
        to="/home"
        className={cn("group block w-fit", variant === "centered" && "mx-auto", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(variant === "centered" && "mx-auto w-full", className)}>{content}</div>;
}
