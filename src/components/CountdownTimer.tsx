import { useEffect, useState } from "react";

export function useCountdown(endsAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, endsAt - now);
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { m, s, done: diff === 0 };
}

export function CountdownTimer({ endsAt, className }: { endsAt: number; className?: string }) {
  const { m, s } = useCountdown(endsAt);
  return (
    <div className={className}>
      <span className="font-display tabular-nums font-bold">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}
