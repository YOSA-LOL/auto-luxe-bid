import { SignIn } from "@clerk/tanstack-react-start";
import { Gavel } from "lucide-react";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function SignInWidget() {
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
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 shadow-[0_0_24px_rgba(124,58,237,0.4)]">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              APEX<span className="text-purple-400">Auto</span>
            </span>
          </div>
          <p className="text-sm text-[#8888aa] mt-2">Premium used car auctions</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}
