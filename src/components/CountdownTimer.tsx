import { useEffect, useState } from "react";

export function useCountdown(endsAt: number) {
  // Start with null so SSR and client initial render are identical (no timestamp mismatch).
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return { m: 0, s: 0, done: false, ready: false };
  const diff = Math.max(0, endsAt - now);
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { m, s, done: diff === 0, ready: true };
}

export function CountdownTimer({ endsAt, className }: { endsAt: number; className?: string }) {
  const { m, s, ready } = useCountdown(endsAt);
  // Render a stable placeholder on SSR / before hydration to avoid mismatch
  if (!ready) {
    return (
      <div className={className}>
        <span className="font-display tabular-nums font-bold">--:--</span>
      </div>
    );
  }
  return (
    <div className={className}>
      <span className="font-display tabular-nums font-bold">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}
