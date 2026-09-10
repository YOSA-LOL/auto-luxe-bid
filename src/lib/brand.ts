export const BRAND_NAME = "Cars Auction";
export const BRAND_TAGLINE = "Premium used car auctions";
export const BRAND_TAGLINE_AR = "مزادات سيارات مميزة";
export const CONTACT_EMAIL = "hello@carsauction.com";
export const INFO_EMAIL = "info@carsauction.com";
export const SITE_TITLE = `${BRAND_NAME} — مزادات سيارات مميزة`;
export const SITE_TITLE_EN = `${BRAND_NAME} — Premium Used Car Auctions`;

const PAGE_TITLES_AR: Record<string, string> = {
  "Sign In": "تسجيل الدخول",
  "Create Account": "إنشاء حساب",
  "Browse Cars": "تصفح السيارات",
  "Live Auctions": "المزادات المباشرة",
  "Sell Your Car": "بيع سيارتك",
  "My Account": "حسابي",
  "My Favorites": "المفضلة",
  "Compare Cars": "مقارنة السيارات",
  "Auction Calendar": "تقويم المزادات",
  "Sold Listings": "السيارات المباعة",
  Admin: "لوحة التحكم",
};

export function brandPageTitle(page: string): string {
  const label = PAGE_TITLES_AR[page] ?? page;
  return `${label} — ${BRAND_NAME}`;
}
