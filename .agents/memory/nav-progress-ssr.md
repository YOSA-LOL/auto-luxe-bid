---
name: NavigationProgress SSR mismatch
description: useRouterState status is "pending" during SSR; renders progress bar server-side that client won't match on hydration.
---

## The Rule
Any component that conditionally renders based on `useRouterState` must guard with a `mounted` state so server and client initial renders both produce the same output (null).

```tsx
function NavigationProgress() {
  const [mounted, setMounted] = useState(false);
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || !isLoading) return null;
  return <ProgressBar />;
}
```

**Why:** During SSR, TanStack Router status is `"pending"` while it loads data, so the progress bar renders into the SSR HTML. On the client's first render the router is already `"idle"` (data came from SSR), so the client renders null — server/client tree mismatch → React hydration error → cascading "Invalid hook call".

**How to apply:** Wherever `useRouterState` drives conditional rendering of non-trivial markup, add `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])` and gate the render on `mounted`. Also ensure `useState` is imported from React alongside `useEffect`.
