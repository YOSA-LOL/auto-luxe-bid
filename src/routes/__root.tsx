import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SITE_TITLE } from "@/lib/brand";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/clerk-config";

import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { getUser } from "@/lib/auth.server";
import type { SessionUser } from "@/lib/auth";
import { getMergedAdminEmailsForLoader } from "@/lib/admin.server";
import { FavoritesProvider } from "@/lib/favorites";
import { LanguageProvider, useLanguage, getStoredLang, translate, type Lang } from "@/lib/language";
import { BottomNav } from "@/components/layout/BottomNav";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { FuturisticAmbient } from "@/components/FuturisticAmbient";
import { ThemeModeProvider, useThemeMode } from "@/lib/theme-mode";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/login"];

function NavigationProgress() {
  const [mounted, setMounted] = useState(false);
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-primary to-violet-400 animate-[progress_1.2s_ease-in-out_infinite] shadow-neon"
        style={{ width: "100%" }}
      />
      <style>{`
        @keyframes progress {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function NotFoundComponent() {
  const lang = typeof window !== "undefined" ? getStoredLang() : "ar";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{translate("notfound_title", lang)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{translate("notfound_p", lang)}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {translate("notfound_btn", lang)}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ar");
  const isDev = import.meta.env.DEV;
  useEffect(() => setLang(getStoredLang()), []);

  const errorText = [error.message, error.stack].filter(Boolean).join("\n\n");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className={`w-full ${isDev ? "max-w-3xl" : "max-w-md"} ${isDev ? "text-start" : "text-center"}`}>
        <h1 className={`text-xl font-semibold tracking-tight text-foreground ${isDev ? "" : "text-center"}`}>
          {isDev ? "Development error" : translate("error_title", lang)}
        </h1>
        {isDev ? (
          <>
            <p className="mt-2 text-sm text-destructive font-medium">{error.message || "Unknown error"}</p>
            <pre className="mt-4 max-h-[min(60vh,32rem)] overflow-auto rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words select-all">
              {errorText}
            </pre>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Development mode — full error shown for debugging. Production will show a friendly message only.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground text-center">{translate("error_p", lang)}</p>
        )}
        <div className={`mt-6 flex flex-wrap gap-2 ${isDev ? "" : "justify-center"}`}>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {translate("error_retry", lang)}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {translate("error_home", lang)}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user?: SessionUser | null;
  adminEmails?: string[];
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: SITE_TITLE },
      { name: "description", content: translate("site_description", "ar") },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: translate("site_description", "ar") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: translate("site_description", "ar") },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=Cairo:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  beforeLoad: async ({ location, context }) => {
    const user = context.user !== undefined ? context.user : await getUser();
    const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));
    // Only redirect server-side when the server is confident the user IS logged in
    // and they're trying to visit a public page (e.g. /sign-in while already authed).
    // The "not logged in → /sign-in" redirect is handled client-side via AuthGuard
    // because clerkMiddleware may run in passthrough mode (no valid CLERK_SECRET_KEY),
    // causing getUser() to return null even when the user is genuinely signed in.
    if (user && isPublic) throw redirect({ to: "/" });
    const adminEmails = await getMergedAdminEmailsForLoader();
    return { user, adminEmails };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" data-perf="neon">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.setAttribute("data-perf","neon");localStorage.setItem("apex_perf_mode","neon");var t=localStorage.getItem("apex_theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="relative">
        <FuturisticAmbient />
        <div className="relative z-[1]">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function AuthGuard({ user }: { user?: SessionUser | null }) {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isPublic) {
      navigate({ to: "/sign-in/$", replace: true });
    }
  }, [isLoaded, isSignedIn, isPublic]);

  const loadingSplash = (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-glow">
        <div className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
      </div>
      <span className="text-sm text-muted-foreground">{t("loading_text")}</span>
    </div>
  );

  // Wait for Clerk client SDK on protected routes; redirect runs in useEffect above.
  if (!isPublic && !user && !isLoaded) {
    return loadingSplash;
  }

  return <Outlet />;
}

function ThemeAwareToaster() {
  const { isLight } = useThemeMode();
  return <Toaster theme={isLight ? "light" : "dark"} position="bottom-center" className="mb-20 md:mb-0" />;
}

function RootComponent() {
  const { queryClient, user } = Route.useRouteContext();

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ThemeModeProvider>
              <FavoritesProvider userId={user?.id}>
                <NavigationProgress />
                <AuthGuard user={user} />
                <BottomNav />
                <PwaInstallPrompt />
                <ThemeAwareToaster />
              </FavoritesProvider>
          </ThemeModeProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
