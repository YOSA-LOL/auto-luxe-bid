import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";
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
  const [first, second] = BRAND_NAME.split(" ");

  const mark = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-violet-800 p-2 shadow-[0_0_28px_rgba(124,58,237,0.45)]",
        markSizes[size],
        linkToHome && "group-hover:scale-105 transition-transform",
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
        <div className="text-white">{name}</div>
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
        to="/"
        className={cn("group block w-fit", variant === "centered" && "mx-auto", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(variant === "centered" && "mx-auto w-full", className)}>{content}</div>;
}
