import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageMeta } from "@/components/PageMeta";
import { CarChatView } from "@/components/chat/CarChatView";
import { getCarFromDb, type DbCar } from "@/lib/cars.server";
import { brandPageTitle } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat/$carId")({
  head: ({ params }) => ({ meta: [{ title: brandPageTitle(`Chat — ${params.carId}`) }] }),
  loader: async ({ params }): Promise<{ car: DbCar }> => {
    const car = await getCarFromDb({ data: params.carId });
    if (!car) throw redirect({ to: "/browse", search: { q: "" } });
    return { car };
  },
  component: ChatPage,
});

function ChatPage() {
  const { car } = Route.useLoaderData() as { car: DbCar };
  const { carId } = Route.useParams();
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();

  const buyerEmail = user?.emailAddresses[0]?.emailAddress ?? "";
  const buyerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    buyerEmail ||
    "";

  if (isLoaded && !user) {
    return (
      <div className="min-h-screen pb-nav">
        <PageMeta titleKey="car_chat_title" />
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{t("chat_sign_in")}</p>
          <Button asChild className="bg-gradient-primary border-0 text-primary-foreground">
            <Link to="/login">
              {t("chat_sign_in")}
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav flex flex-col">
      <PageMeta
        titleKey="chat_page_title"
        titleVars={{ title: car.title }}
      />
      <Header />
      <div className="flex-1 flex flex-col min-h-0 w-full max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-gradient-card border border-border/60 shadow-elegant overflow-hidden">
          <CarChatView
            carId={carId}
            carTitle={car.title}
            buyerEmail={buyerEmail}
            buyerName={buyerName}
            senderRole="buyer"
            backLink={
              <Link
                to="/cars/$carId"
                params={{ carId }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("chat_back_listing")}
              </Link>
            }
            peerLabel={t("chat_dealer")}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
