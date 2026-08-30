const KEY = "apex_compare";
const MAX = 3;

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToCompare(id: string): string[] {
  const ids = getCompareIds();
  if (ids.includes(id)) return ids;
  const next = [...ids, id].slice(-MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("apex_compare_changed"));
  return next;
}

export function removeFromCompare(id: string): string[] {
  const next = getCompareIds().filter((i) => i !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("apex_compare_changed"));
  return next;
}

export function clearCompare() {
  localStorage.setItem(KEY, "[]");
  window.dispatchEvent(new Event("apex_compare_changed"));
}

export function isInCompare(id: string): boolean {
  return getCompareIds().includes(id);
}
