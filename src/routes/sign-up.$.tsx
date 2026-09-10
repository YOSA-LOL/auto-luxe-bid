import { HandleSSOCallback } from "@clerk/tanstack-react-start";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

/**
 * Legacy `/sign-up` path. User-facing registration is `/` (Get Started).
 * Kept only so OAuth can complete at `/sign-up/sso-callback`.
 */
export const Route = createFileRoute("/sign-up/$")({
  beforeLoad: ({ params }) => {
    if (params._splat !== "sso-callback") {
      throw redirect({ to: "/" });
    }
  },
  component: SsoCallbackPage,
});

function SsoCallbackPage() {
  const navigate = useNavigate();

  return (
    <HandleSSOCallback
      navigateToApp={({ decorateUrl }) => {
        const destination = decorateUrl("/home");
        if (destination?.startsWith("http")) {
          window.location.href = destination;
          return;
        }
        void navigate({ to: "/home" });
      }}
      navigateToSignIn={() => {
        void navigate({ to: "/login" });
      }}
      navigateToSignUp={() => {
        void navigate({ to: "/" });
      }}
    />
  );
}
