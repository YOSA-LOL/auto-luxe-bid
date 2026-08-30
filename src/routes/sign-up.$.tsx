import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const Route = createFileRoute("/sign-up/$")({
  head: () => ({ meta: [{ title: "Create Account — APEXAuto" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 60%), linear-gradient(180deg, #060610 0%, #0a0a18 100%)",
      }}
    >
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 shadow-[0_0_24px_rgba(124,58,237,0.4)] group-hover:scale-105 transition-transform">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              APEX<span className="text-purple-400">Auto</span>
            </span>
          </Link>
          <p className="text-sm text-[#8888aa] mt-2">Join the premium auction platform</p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}
