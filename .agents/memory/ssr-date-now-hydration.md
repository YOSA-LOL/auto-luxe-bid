---
name: SSR Date.now() hydration crash
description: Using Date.now() or Math.random() during render (including useState initializer) causes React hydration mismatch and cascading Invalid hook call errors. Always defer time to useEffect.
---

## The rule
Never call `Date.now()` or `Math.random()` during render or as a `useState` initializer in any SSR-rendered component.

**Wrong:**
```tsx
const [now, setNow] = useState(Date.now());         // useState initializer
const now = Date.now();                              // render-body constant
const isExpired = c.endsAt != null && c.endsAt < Date.now();
```

**Correct:**
```tsx
const [now, setNow] = useState<number | null>(null);  // null = stable placeholder
useEffect(() => {
  setNow(Date.now());
  const t = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(t);
}, []);
if (now === null) return <Placeholder />;             // SSR and first client render match
```

**Why:** The server renders with a fixed timestamp at request time. React hydration re-runs the component on the client with a *different* `Date.now()`, producing different text nodes. React throws a hydration error, which cascades into "Invalid hook call" as the component tree is torn down and rebuilt mid-render.

**How to apply:**
- `CountdownTimer`/`useCountdown` — use `useState<number | null>(null)` + guard `ready` flag; show `--:--` until mounted.
- Any page-level "isExpired" / "isLive" check based on timestamp — use `useState(0)` and set in `useEffect`.
- Never pass `Date.now()` as a `useState()` argument anywhere in the codebase.

**Also applies to:** `Math.random()` in render, locale-based date formatting that differs between server and browser locale.
