import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  approved: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  live: "bg-[var(--live)]/15 text-[var(--live)] border-[var(--live)]/30",
  listed: "bg-secondary text-muted-foreground border-border/50",
  sold: "bg-muted text-muted-foreground border-border/50",
  ended: "bg-destructive/10 text-destructive/80 border-destructive/20",
};

export function AdminStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium capitalize border px-1.5 py-0",
        STATUS_STYLES[key] ?? "bg-secondary/30 text-foreground border-border/40",
        className,
      )}
    >
      {status}
    </Badge>
  );
}
