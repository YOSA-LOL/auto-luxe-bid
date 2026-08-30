import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { getUser } from "@/lib/auth.server";
import type { SessionUser } from "@/lib/auth";
import { getAdminEmails } from "@/lib/admin-access.server";
import { FavoritesProvider } from "@/lib/favorites";
import { LanguageProvider } from "@/lib/language";
import { BottomNav } from "@/components/layout/BottomNav";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/login", "/create-organization"];

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
        className="h-full bg-gradient-to-r from-primary via-purple-400 to-primary animate-[progress_1.2s_ease-in-out_infinite]"
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn&apos;t load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "APEXAuto — Premium Used Car Auctions" },
      { name: "description", content: "Live auctions for verified used cars. Browse, bid, and win premium vehicles from trusted dealerships." },
      { property: "og:title", content: "APEXAuto — Premium Used Car Auctions" },
      { property: "og:description", content: "Live auctions for verified used cars. Browse, bid, and win premium vehicles from trusted dealerships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "APEXAuto — Premium Used Car Auctions" },
      { name: "twitter:description", content: "Live auctions for verified used cars. Browse, bid, and win premium vehicles from trusted dealerships." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=Cairo:wght@400;500;600;700;800&display=swap" },
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
    return { user, adminEmails: getAdminEmails() };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGuard({ user }: { user?: SessionUser | null }) {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isPublic) {
      navigate({ to: "/sign-in", replace: true });
    }
  }, [isLoaded, isSignedIn, isPublic]);

  const loadingSplash = (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: "linear-gradient(180deg, #060610 0%, #0a0a18 100%)" }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 shadow-[0_0_24px_rgba(124,58,237,0.4)]">
        <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
      <span className="text-sm text-[#8888aa]">Loading…</span>
    </div>
  );

  // Hydration-safe auth gate:
  // The server knows the auth state via Clerk middleware. If the server confirmed
  // a signed-in user (`user` prop is set), we must render <Outlet /> on the
  // initial client render too — not loadingSplash — or React will see a
  // server/client mismatch (server: Outlet, client: loadingSplash).
  // Once Clerk's JS loads on the client, isSignedIn takes over and the effect
  // above handles any redirect needed.
  if (!isPublic && !user && !isSignedIn) {
    return loadingSplash;
  }

  return <Outlet />;
}

function RootComponent() {
  const { queryClient, user } = Route.useRouteContext();

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_ZXZvbHZpbmctbXVkZmlzaC00OC5jbGVyay5hY2NvdW50cy5kZXYk"}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <FavoritesProvider userId={user?.id}>
            <NavigationProgress />
            <AuthGuard user={user} />
            <BottomNav />
            <Toaster theme="dark" position="bottom-center" className="mb-20 md:mb-0" />
          </FavoritesProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
