import { useState } from "react";

export type SpecHotspotItem = {
  id: string;
  label: string;
  value: string;
  top: string;
  left: string;
};

export function SpecHotspots({
  imageSrc,
  alt,
  title,
  items,
}: {
  imageSrc: string;
  alt: string;
  title?: string;
  items: SpecHotspotItem[];
}) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-elegant">
      <img src={imageSrc} alt={alt} className="w-full h-auto object-cover min-h-[280px] sm:min-h-[400px]" />
      {title && (
        <div className="absolute bottom-6 start-6 end-6 pointer-events-none">
          <h2 className="text-headline-xl font-display font-bold text-white drop-shadow-md">{title}</h2>
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute"
          style={{ top: item.top, left: item.left }}
        >
          <button
            type="button"
            onClick={() => setActive(active === item.id ? null : item.id)}
            className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-smooth ${
              active === item.id
                ? "bg-[var(--primary-container)] border-[var(--neon)] text-[var(--on-primary-container)] scale-110"
                : "bg-[var(--surface-elevated)]/95 border-border text-foreground hover:scale-105"
            }`}
            aria-label={item.label}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
          </button>
          {active === item.id && (
            <div className="absolute top-full mt-2 start-1/2 -translate-x-1/2 z-10 w-44 aether-glass-panel rounded-xl p-3 text-start animate-fade-up">
              <div className="text-label-caps text-muted-foreground">{item.label}</div>
              <div className="text-sm font-semibold text-foreground mt-1">{item.value}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
