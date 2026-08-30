const KEY = "apex_price_alerts";

export type PriceAlert = {
  carId: string;
  carTitle: string;
  targetPrice: number;
  createdAt: number;
};

export function getPriceAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function setPriceAlert(alert: PriceAlert) {
  const all = getPriceAlerts().filter((a) => a.carId !== alert.carId);
  localStorage.setItem(KEY, JSON.stringify([...all, alert]));
}

export function removePriceAlert(carId: string) {
  const all = getPriceAlerts().filter((a) => a.carId !== carId);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function hasPriceAlert(carId: string): boolean {
  return getPriceAlerts().some((a) => a.carId === carId);
}

export function getPriceAlertTarget(carId: string): number | null {
  return getPriceAlerts().find((a) => a.carId === carId)?.targetPrice ?? null;
}
