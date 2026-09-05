/** Performance is always neon — lite mode removed. Kept for legacy localStorage cleanup. */

export type PerfMode = "neon";

export function getStoredPerfMode(): PerfMode {
  return "neon";
}

export function applyPerfMode() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-perf", "neon");
  try {
    localStorage.setItem("apex_perf_mode", "neon");
  } catch {
    /* ignore */
  }
}
