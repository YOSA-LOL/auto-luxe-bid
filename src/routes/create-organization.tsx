import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOrganizationList } from "@clerk/tanstack-react-start";
import { useEffect } from "react";
import { Gavel } from "lucide-react";

export const Route = createFileRoute("/create-organization")({
  component: CreateOrganizationPage,
});

function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { createOrganization, isLoaded } = useOrganizationList();

  useEffect(() => {
    if (!isLoaded) return;

    const setup = async () => {
      try {
        await createOrganization({ name: "APEXAuto" });
      } catch {
        // org may already exist — ignore
      } finally {
        navigate({ to: "/" });
      }
    };

    setup();
  }, [isLoaded]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060610]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 shadow-[0_0_24px_rgba(124,58,237,0.4)] animate-pulse">
        <Gavel className="h-5 w-5 text-white" />
      </div>
    </div>
  );
}
