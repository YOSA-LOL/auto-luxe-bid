import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { getCarFromDb, getCarsFromDb, getBidsForCar, placeBidInDb, type DbBid } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart, Share2, Flag, Radio, Users, Gavel, CircleCheck,
  Gauge, Fuel, Cog, Palette, Hash, MapPin, TrendingUp, Plus,
  MessageCircle, Phone, Mail, X,
} from "lucide-react";
import { toast } from "sonner";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/cars/$carId")({
  loader: async ({ params }) => {
    const [dbCar, allCars, bids] = await Promise.all([
      getCarFromDb({ data: params.carId }),
      getCarsFromDb(),
      getBidsForCar({ data: params.carId }),
    ]);
    if (!dbCar) throw notFound();
    const car = dbCarToApp(dbCar);
    const related = allCars
      .filter((c) => c.id !== params.carId)
      .slice(0, 3)
      .map(dbCarToApp);
    return { car, related, initialBids: bids };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Car not found</h1>
        <Link to="/browse" search={{ q: "" }} className="text-primary-glow underline mt-4 inline-block">
          Back to browse
        </Link>
      </div>
    </div>
  ),
  component: CarPage,
});

function CarPage() {
  const { car, related, initialBids } = Route.useLoaderData();
  const { isFavorited, toggle } = useFavorites();
  const liked = isFavorited(car.id);

  const [currentBid, setCurrentBid] = useState(car.currentBid ?? car.price);
  const [bidInput, setBidInput] = useState(
    car.isLive ? (car.currentBid ?? 0) + car.minRaise : car.price
  );
  const [bids, setBids] = useState<DbBid[]>(initialBids);
  const [viewers, setViewers] = useState(car.viewers ?? 0);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showReserve, setShowReserve] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ from: "you" | "dealer"; text: string }[]>([
    { from: "dealer", text: `Hi! I'm the dealer for ${car.title}. How can I help you today?` },
  ]);

  const galleryImages = [car.image, ...related.map((c) => c.image)];

  useEffect(() => {
    if (!car.isLive) return;
    const t = setInterval(() => {
      setViewers((v) => Math.max(1, v + (Math.random() > 0.5 ? 1 : -1)));
    }, 3500);
    return () => clearInterval(t);
  }, [car.isLive]);

  const minNext = currentBid + (car.isLive ? car.minRaise : 0);

  const placeBid = async () => {
    if (bidInput < minNext) {
      toast.error(`Minimum bid is ${formatPrice(minNext)}`);
      return;
    }
    setIsPlacingBid(true);
    try {
      const updated = await placeBidInDb({
        data: { carId: car.id, amount: bidInput, userName: "You" },
      });
      if (updated) {
        setCurrentBid(updated.amount);
        setBidInput(updated.amount + car.minRaise);
      }
      const freshBids = await getBidsForCar({ data: car.id });
      setBids(freshBids);
      toast.success(`Bid placed: ${formatPrice(bidInput)} ✓`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: car.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    setChatHistory((h) => [...h, { from: "you", text: chatMsg }]);
    setChatMsg("");
    setTimeout(() => {
      setChatHistory((h) => [
        ...h,
        { from: "dealer", text: "Thanks for your message! I'll get back to you shortly." },
      ]);
    }, 1200);
  };

  return (
    <div className="min-h-screen pb-nav md:pb-0">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="text-sm text-muted-foreground mb-4 md:mb-6">
          <Link to="/browse" search={{ q: "" }} className="hover:text-foreground">Browse</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground truncate">{car.title}</span>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 md:gap-8">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="relative rounded-3xl overflow-hidden border border-border/60 shadow-elegant">
              <img src={galleryImages[selectedImg]} alt={car.title} width={1280} height={896} className="w-full h-auto" />
              <div className="absolute top-4 left-4 flex gap-2">
                {car.isLive && (
                  <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
                    <Radio className="h-3 w-3" /> LIVE AUCTION
                  </Badge>
                )}
                <Badge variant="outline" className="glass border-primary/40 gap-1">
                  <CircleCheck className="h-3 w-3 text-primary-glow" /> Verified
                </Badge>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => { toggle(car.id); toast.success(liked ? "Removed from favorites" : "Added to favorites ♥"); }}
                  className={`h-10 w-10 rounded-full glass flex items-center justify-center transition-smooth ${liked ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                </button>
                <button onClick={handleShare} className="h-10 w-10 rounded-full glass flex items-center justify-center">
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toast.info("Report submitted. Our team will review this listing within 24 hours.")}
                  className="h-10 w-10 rounded-full glass flex items-center justify-center"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`aspect-[16/11] rounded-xl overflow-hidden border transition-smooth ${selectedImg === i ? "border-primary shadow-glow" : "border-border/40 hover:border-primary/60"}`}
                >
                  <img src={img} alt="" loading="lazy" width={400} height={275} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{car.brand} · {car.year} · {car.color}</div>
              <h1 className="font-display text-4xl font-bold mt-1">{car.title}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {car.city}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {car.dealership}</span>
                {car.isLive && (
                  <span className="inline-flex items-center gap-1 text-[var(--live)]">
                    <Radio className="h-3.5 w-3.5" /> {viewers} watching now
                  </span>
                )}
              </div>
              {car.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{car.description}</p>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Specifications</h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { i: Cog, l: "Engine", v: car.engine },
                  { i: TrendingUp, l: "Horsepower", v: car.hp ? `${car.hp} hp` : null },
                  { i: Fuel, l: "Fuel", v: car.fuel },
                  { i: Cog, l: "Transmission", v: car.transmission },
                  { i: Gauge, l: "Mileage", v: `${formatNumber(car.mileage)} km` },
                  { i: Palette, l: "Color", v: car.color },
                  { i: Users, l: "Seats", v: car.seats.toString() },
                  { i: Hash, l: "VIN", v: car.vin },
                ]
                  .filter((s) => s.v)
                  .map((s) => (
                    <div key={s.l} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                        <s.i className="h-3.5 w-3.5" /> {s.l}
                      </span>
                      <span className="font-display text-sm font-semibold">{s.v}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Condition Report</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { l: "Overall", v: car.condition },
                  { l: "Accidents", v: "None reported" },
                  { l: "Service history", v: "Complete" },
                ].map((r) => (
                  <div key={r.l} className="glass rounded-xl p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{r.l}</div>
                    <div className="font-display font-semibold mt-1 inline-flex items-center gap-1.5">
                      <CircleCheck className="h-4 w-4 text-[var(--success)]" /> {r.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-5 lg:sticky lg:top-20 h-fit">
            {car.isLive ? (
              <div className="rounded-2xl glass-strong border border-primary/30 p-6 shadow-elegant">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Current Bid</span>
                  <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
                    <Radio className="h-3 w-3" /> LIVE
                  </Badge>
                </div>
                <div className="font-display text-4xl font-bold text-gradient-primary">{formatPrice(currentBid)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bids.length} bids · Min raise +{formatPrice(car.minRaise)}
                </div>

                {car.endsAt && (
                  <div className="mt-5 glass rounded-xl p-4 text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Ends in</div>
                    <CountdownTimer endsAt={car.endsAt} className="text-3xl text-gradient-primary" />
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Your bid</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bidInput}
                      onChange={(e) => setBidInput(Number(e.target.value))}
                      className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-3 font-display font-semibold tabular-nums outline-none focus:border-primary"
                    />
                    <Button
                      onClick={() => setBidInput((b) => b + car.minRaise)}
                      variant="outline"
                      size="icon"
                      className="glass h-auto"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={placeBid}
                    disabled={isPlacingBid}
                    className="w-full bg-gradient-primary border-0 text-primary-foreground shadow-glow h-12 text-base"
                  >
                    <Gavel className="h-4 w-4" />
                    {isPlacingBid ? "Placing…" : "Place Bid"}
                  </Button>
                  <div className="text-xs text-muted-foreground text-center">
                    Entry fee {formatPrice(500)} · refunded if you don't win
                  </div>
                </div>

                {bids.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border/40">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Live activity</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {bids.map((b, i) => (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg ${i === 0 ? "bg-primary/10 border border-primary/30" : ""}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-[var(--live)] animate-pulse-live" : "bg-muted-foreground/40"}`} />
                            <span className="font-medium">{b.user_name}</span>
                          </span>
                          <span className="font-display font-semibold tabular-nums">{formatPrice(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl glass-strong p-6 shadow-elegant space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Buy Now Price</div>
                <div className="font-display text-4xl font-bold text-gradient-primary">{formatPrice(car.price)}</div>

                {!showReserve ? (
                  <Button
                    onClick={() => setShowReserve(true)}
                    className="w-full mt-2 bg-gradient-primary border-0 text-primary-foreground h-12"
                  >
                    Reserve this car
                  </Button>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <p className="text-sm font-medium">Confirm reservation</p>
                    <p className="text-xs text-muted-foreground">
                      We'll contact you within 2 hours to complete your reservation for {car.title}.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => { setShowReserve(false); toast.success("Reservation confirmed! We'll contact you shortly."); }}
                        className="flex-1 bg-gradient-primary border-0 text-primary-foreground"
                        size="sm"
                      >
                        Confirm
                      </Button>
                      <Button onClick={() => setShowReserve(false)} variant="outline" size="sm" className="glass">Cancel</Button>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full glass"
                  onClick={() => setShowContact(!showContact)}
                >
                  <Phone className="h-4 w-4" /> Contact dealer
                </Button>

                {showContact && (
                  <div className="rounded-xl glass border border-border/40 p-4 space-y-2 text-sm">
                    <p className="font-medium">{car.dealership}</p>
                    <a href="tel:+20212345678" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
                      <Phone className="h-3.5 w-3.5" /> +20 2 1234 5678
                    </a>
                    <a href="mailto:info@apexauto.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
                      <Mail className="h-3.5 w-3.5" /> info@apexauto.com
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-gradient-card border border-border/60 p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center">
                  <CircleCheck className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-display font-semibold">{car.dealership}</div>
                  <div className="text-xs text-muted-foreground">Verified dealer · 4.9 ★ (218 reviews)</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 glass gap-2"
                onClick={() => setShowChat(true)}
              >
                <MessageCircle className="h-4 w-4" /> Chat with dealer
              </Button>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-2xl font-bold mb-5">You might also like</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((c) => <CarCard key={c.id} car={c} />)}
            </div>
          </div>
        )}
      </div>

      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowChat(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md glass-strong border border-border/60 rounded-2xl shadow-elegant flex flex-col"
            style={{ maxHeight: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <p className="font-display font-semibold text-sm">Chat with dealer</p>
                <p className="text-xs text-muted-foreground">{car.dealership}</p>
              </div>
              <button onClick={() => setShowChat(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center hover:bg-secondary/60 transition-smooth">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: "280px" }}>
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.from === "you" ? "bg-gradient-primary text-primary-foreground" : "glass border border-border/40"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} className="flex gap-2 p-4 border-t border-border/40">
              <input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="sm" className="bg-gradient-primary border-0 text-primary-foreground px-4">
                Send
              </Button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
