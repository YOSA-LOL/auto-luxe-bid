---
name: Date.now() in render body (map callbacks)
description: Using Date.now() inside .map() or any render-body expression causes SSR hydration mismatch, which cascades to "Invalid hook call".
---

## Rule
Never call `Date.now()` (or `Math.random()`, `new Date()` without args) directly inside a component's render body — including inside `.map()` callbacks, computed `const` variables, or JSX expressions that run on every render.

**Why:** During SSR the server records one timestamp; during client hydration `Date.now()` returns a different value → text content mismatch → React hydration error → can cascade to "Invalid hook call".

## How to apply
Use the existing `now` state pattern that is already standard in this codebase:

```tsx
const [now, setNow] = useState<number | null>(null);
useEffect(() => { setNow(Date.now()); }, []);
```

Then in render:
```tsx
const diffH = now ? Math.floor((now - date.getTime()) / 3_600_000) : 0;
const timeStr = !now ? "" : diffH < 1 ? date.toLocaleTimeString(...) : `${diffH}h`;
```

Starting with `null` means server and client both render the same empty/fallback state initially. After hydration, the `useEffect` fires and sets the real time, which is a pure client update with no mismatch.

**Applies to:** any relative-time display, countdown, "X minutes ago" label, or any value derived from the current wall-clock time rendered in JSX.
