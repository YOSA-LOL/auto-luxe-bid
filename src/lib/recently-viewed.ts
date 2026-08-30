const KEY = "apex_recently_viewed";
const MAX = 10;

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addRecentlyViewed(carId: string) {
  const ids = getRecentlyViewed().filter((id) => id !== carId);
  const next = [carId, ...ids].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}
