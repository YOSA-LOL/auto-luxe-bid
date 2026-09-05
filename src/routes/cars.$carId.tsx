import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { submitAuctionEntryRequest, getAuctionEntryStatus, getAuctionDepositSettings, type DepositSettings, type AuctionEntryRequest } from "@/lib/auction-entry.server";
import { uploadImage } from "@/lib/upload.server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { getCarFromDb, getCarsFromDb, getBidsForCar, placeBidInDb, setProxyBid, getProxyBid, type DbBid } from "@/lib/cars.server";
import { Route as RootRoute } from "@/routes/__root";
import { useUser } from "@clerk/tanstack-react-start";
import { dbCarToApp } from "@/lib/types";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart, Radio, Users, Gavel, CircleCheck,
  Gauge, Fuel, Cog, Palette, Hash, MapPin, TrendingUp, Plus,
  MessageCircle, Phone, Mail, X, Play, ExternalLink,
  FileText, Printer, Download, MessageSquare,
  Bell, BellOff, Trophy, ShoppingCart,
  Upload, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useFavorites } from "@/lib/favorites";
import { useLanguage } from "@/lib/language";
import { addNotification } from "@/lib/notifications";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { setPriceAlert, removePriceAlert, hasPriceAlert, getPriceAlertTarget } from "@/lib/price-alerts";
import { PageMeta } from "@/components/PageMeta";
import { SpecHotspots } from "@/components/SpecHotspots";
import { useThemeMode } from "@/lib/theme-mode";
import { BRAND_NAME, INFO_EMAIL } from "@/lib/brand";

function AuctionEntryModal({
  carId,
  carTitle,
  userName,
  userEmail,
  depositSettings,
  onClose,
  onSubmitted,
}: {
  carId: string;
  carTitle: string;
  userName: string;
  userEmail: string;
  depositSettings: DepositSettings;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useLanguage();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [instapayNumber, setInstapayNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const original = ev.target?.result as string;
      // Compress client-side so the base64 payload stays under the server fn limit
      const img = new Image();
      img.onload = () => {
        const MAX = 480;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        setProofPreview(compressed);
      };
      img.onerror = () => setProofPreview(original);
      img.src = original;
    };
    reader.readAsDataURL(file);
  };

  const refundAmount = Math.round(depositSettings.depositAmount * 0.8);
  const feeAmount = Math.round(depositSettings.depositAmount * 0.2);
  const transferTarget = depositSettings.transferNumber.trim();

  const handleSubmit = async () => {
    if (!proofFile || !proofPreview) {
      toast.error(t("toast_upload_proof"));
      return;
    }
    if (!instapayNumber.trim()) {
      toast.error(t("toast_instapay_required"));
      return;
    }
    setSubmitting(true);
    try {
      await submitAuctionEntryRequest({
        data: {
          userName,
          userEmail,
          carId,
          carTitle,
          proofImageUrl: proofPreview,
          instapayNumber: instapayNumber.trim(),
          depositAmount: depositSettings.depositAmount,
        },
      });
      toast.success(t("toast_entry_submitted"));
      addNotification({
        type: "entry_submitted",
        title: t("notif_entry_submitted_title"),
        body: t("notif_entry_submitted_body", { car: carTitle }),
        carId,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_submit_fail"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-strong rounded-3xl border border-border/60 p-6 shadow-elegant max-w-md w-full animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">{t("entry_title")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t("common_close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-3">
          <p className="text-xs text-muted-foreground mb-1">{t("entry_deposit_required")}</p>
          <p className="text-2xl font-display font-bold text-primary-glow" dir="ltr">
            EGP {depositSettings.depositAmount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("entry_refund_note", {
              pct: t("entry_refund_pct"),
              amount: refundAmount.toLocaleString(),
            })}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20 mb-4">
          <p className="text-[11px] text-yellow-400/90 leading-relaxed">
            {t("entry_fee_note", { amount: feeAmount.toLocaleString() })}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50 border border-border/40 mb-5">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t("entry_transfer_to")}</p>
          {transferTarget ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("entry_transfer_instapay")}</p>
              <p className="text-xl font-display font-bold text-primary-glow font-mono tracking-wide" dir="ltr">
                {transferTarget}
              </p>
              {depositSettings.paymentInfo.trim() && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">{depositSettings.paymentInfo}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t("entry_pay_not_configured")}</p>
          )}
        </div>

        <div className="mb-5">
          <label className="text-sm font-semibold block mb-1">{t("entry_instapay")}</label>
          <p className="text-xs text-muted-foreground mb-2">
            {t("entry_instapay_hint")}
          </p>
          <Input
            value={instapayNumber}
            onChange={(e) => setInstapayNumber(e.target.value)}
            placeholder={t("entry_instapay_ph")}
            className="bg-background/50"
            dir="ltr"
          />
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold mb-1">{t("entry_upload_proof")}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {t("entry_upload_hint")}
          </p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {proofPreview ? (
            <div className="relative">
              <img
                src={proofPreview}
                alt={t("entry_upload_proof")}
                className="w-full rounded-xl border border-border/40 max-h-52 object-contain bg-black/20"
              />
              <button
                onClick={() => { setProofFile(null); setProofPreview(null); }}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border/60 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("entry_upload_click")}</span>
            </button>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!proofFile || !instapayNumber.trim() || submitting}
          className="w-full bg-gradient-primary border-0 text-primary-foreground h-11"
        >
          {submitting ? t("common_submitting") : t("entry_submit")}
        </Button>
      </div>
    </div>
  );
}


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
  const { user: ssrUser } = RootRoute.useRouteContext();
  const { user: clerkUser, isLoaded } = useUser();

  const user = isLoaded && clerkUser
    ? {
        id: clerkUser.id,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "User",
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        picture: clerkUser.imageUrl ?? undefined,
      }
    : ssrUser;

  const { isFavorited, toggle } = useFavorites();
  const liked = isFavorited(car.id);
  const { t } = useLanguage();
  const { isLight } = useThemeMode();

  const [currentBid, setCurrentBid] = useState(car.currentBid ?? car.price);
  const [bidInput, setBidInput] = useState(
    car.isLive ? (car.currentBid ?? 0) + car.minRaise : car.price
  );
  const [bids, setBids] = useState<DbBid[]>(initialBids);
  const [viewers, setViewers] = useState(car.viewers ?? 0);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [showProxyBid, setShowProxyBid] = useState(false);
  const [proxyBidInput, setProxyBidInput] = useState(0);
  const [isSettingProxy, setIsSettingProxy] = useState(false);
  const [existingProxy, setExistingProxy] = useState<number | null>(null);
  const [priceAlertActive, setPriceAlertActive] = useState(false);
  const [priceAlertTarget, setPriceAlertTargetState] = useState(0);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [showAuctionEntryModal, setShowAuctionEntryModal] = useState(false);
  const [depositSettings, setDepositSettings] = useState<DepositSettings>({ depositAmount: 500, transferNumber: "", paymentInfo: "" });
  const [entryStatus, setEntryStatus] = useState<AuctionEntryRequest | null>(null);
  // Deferred Date.now() — start at 0 on SSR, set after hydration to avoid mismatch
  const [now, setNow] = useState<number>(0);
  useEffect(() => { setNow(Date.now()); }, []);

  useEffect(() => {
    addRecentlyViewed(car.id);
    const active = hasPriceAlert(car.id);
    setPriceAlertActive(active);
    const target = getPriceAlertTarget(car.id);
    setPriceAlertTargetState(target ?? Math.round((car.currentBid ?? car.price) * 0.9));
    getProxyBid({ data: { carId: car.id, userName: user?.name ?? "You" } }).then((p) => {
      if (p) setExistingProxy(p.max_amount);
    }).catch(() => {});
    if (car.isLive) {
      getAuctionDepositSettings().then(setDepositSettings).catch(() => {});
      if (user?.email) {
        getAuctionEntryStatus({ data: { carId: car.id, userEmail: user.email } }).then((status) => {
          setEntryStatus(status);
          if (status?.status === "approved") setDepositPaid(true);
        }).catch(() => {});
      }
    }
    return () => {};
  }, [car.id, car.isLive, user?.email, user?.name]);

  const galleryImages = [car.image, ...car.images].filter((u) => u && u.trim() !== "");

  const getVideoEmbed = (url: string): { type: "youtube" | "video" | "link"; src: string } => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
    if (ytMatch) return { type: "youtube", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: "video", src: url };
    return { type: "link", src: url };
  };

  useEffect(() => {
    if (!car.isLive) return;
    const t = setInterval(() => {
      setViewers((v) => Math.max(1, v + (Math.random() > 0.5 ? 1 : -1)));
    }, 3500);
    return () => clearInterval(t);
  }, [car.isLive]);

  const minNext = currentBid + (car.isLive ? car.minRaise : 0);

  const executeBid = async (amount: number) => {
    setIsPlacingBid(true);
    try {
      const updated = await placeBidInDb({
        data: { carId: car.id, amount },
      });
      if (updated) {
        const amt = Number(updated.amount);
        setCurrentBid(amt);
        setBidInput(amt + car.minRaise);
      }
      const freshBids = await getBidsForCar({ data: car.id });
      setBids(freshBids);
      toast.success(`Bid placed: ${formatPrice(amount)} ✓`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setIsPlacingBid(false);
    }
  };

  const placeBid = async () => {
    if (!user) {
      toast.error("Please sign in to place a bid");
      return;
    }
    if (bidInput < minNext) {
      toast.error(`Minimum bid is ${formatPrice(minNext)}`);
      return;
    }
    if (car.isLive && !depositPaid) {
      if (entryStatus?.status === "pending") {
        toast.info(t("toast_entry_pending"));
        return;
      }
      setShowAuctionEntryModal(true);
      return;
    }
    await executeBid(bidInput);
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

  const handleWhatsApp = () => {
    const url = window.location.href;
    const text = encodeURIComponent(`Check out this ${car.title} on ${BRAND_NAME}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleProxyBid = async () => {
    if (proxyBidInput <= currentBid) {
      toast.error(`Max bid must be greater than current bid of ${formatPrice(currentBid)}`);
      return;
    }
    setIsSettingProxy(true);
    try {
      await setProxyBid({ data: { carId: car.id, maxAmount: proxyBidInput } });
      setExistingProxy(proxyBidInput);
      setShowProxyBid(false);
      toast.success(`Proxy bid set to ${formatPrice(proxyBidInput)}. We'll bid automatically up to this amount.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set proxy bid");
    } finally {
      setIsSettingProxy(false);
    }
  };

  const handlePriceAlertToggle = () => {
    if (priceAlertActive) {
      removePriceAlert(car.id);
      setPriceAlertActive(false);
      toast.info("Price alert removed");
    } else {
      setShowPriceAlert(true);
    }
  };

  const confirmPriceAlert = () => {
    setPriceAlert({ carId: car.id, carTitle: car.title, targetPrice: priceAlertTarget, createdAt: Date.now() });
    setPriceAlertActive(true);
    setShowPriceAlert(false);
    toast.success(`Price alert set for ${formatPrice(priceAlertTarget)}`);
  };

  const handlePrint = () => {
    const specs = [
      { l: "Engine", v: car.engine },
      { l: "Horsepower", v: car.hp ? `${car.hp} hp` : null },
      { l: "Fuel", v: car.fuel },
      { l: "Transmission", v: car.transmission },
      { l: "Mileage", v: `${formatNumber(car.mileage)} km` },
      { l: "Color", v: car.color },
      { l: "Seats", v: String(car.seats) },
      { l: "VIN", v: car.vin },
    ].filter((s) => s.v);

    const conditionItems = [
      { l: "Overall Condition", v: car.condition, warn: false, note: car.conditionNotes?.overall },
      { l: "Accident History", v: car.accidentHistory ? "Has Accidents" : "No Accidents", warn: car.accidentHistory, note: car.conditionNotes?.accident },
      { l: "Service History", v: car.serviceHistory ?? null, warn: false, note: car.conditionNotes?.service },
      ...(car.engineCondition ? [{ l: "Engine", v: car.engineCondition, warn: false, note: car.conditionNotes?.engine }] : []),
      ...(car.transmissionCondition ? [{ l: "Transmission", v: car.transmissionCondition, warn: false, note: car.conditionNotes?.transmission }] : []),
      ...(car.suspensionCondition ? [{ l: "Suspension", v: car.suspensionCondition, warn: false, note: car.conditionNotes?.suspension }] : []),
      ...(car.batteryCondition ? [{ l: "Battery", v: car.batteryCondition, warn: false, note: car.conditionNotes?.battery }] : []),
      ...(car.tireCondition ? [{ l: "Tires", v: car.tireCondition, warn: false, note: car.conditionNotes?.tires }] : []),
      ...(car.chassisCondition ? [{ l: "Chassis", v: car.chassisCondition, warn: false, note: car.conditionNotes?.chassis }] : []),
      ...(car.interiorCondition ? [{ l: "Interior", v: car.interiorCondition, warn: false, note: car.conditionNotes?.interior }] : []),
      ...(car.paintCondition ? [{ l: "Paint", v: car.paintCondition, warn: false, note: car.conditionNotes?.paint }] : []),
      ...(car.previousOwners != null ? [{ l: "Previous Owners", v: String(car.previousOwners), warn: false }] : []),
      ...(car.licenseExpiry ? [{ l: "License Expiry", v: car.licenseExpiry, warn: false }] : []),
    ].filter((r) => r.v);

    const optionsList = car.carOptions.map((key) => CAR_OPTION_LABELS[key] ?? key);

    const imagesHtml = galleryImages
      .map(
        (src) =>
          `<img src="${src}" alt="${car.title}" style="width:100%;max-height:340px;object-fit:cover;border-radius:10px;margin-bottom:10px;" />`
      )
      .join("");

    const specsHtml = specs
      .map(
        (s) =>
          `<tr><td style="padding:8px 12px;color:#666;font-size:13px;">${s.l}</td><td style="padding:8px 12px;font-weight:600;font-size:13px;text-align:right;">${s.v}</td></tr>`
      )
      .join("");

    const conditionHtml = conditionItems
      .map(
        (r) =>
          `<div style="border:1px solid ${r.warn ? "#f59e0b" : "#e5e7eb"};border-radius:8px;padding:12px 14px;background:${r.warn ? "#fffbeb" : "#f9fafb"};">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">${r.l}</div>
            <div style="font-weight:600;font-size:14px;margin-top:4px;color:${r.warn ? "#d97706" : "#111"};">${r.v}</div>
            ${r.note ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;font-style:italic;">${r.note}</div>` : ""}
          </div>`
      )
      .join("");

    const optionsHtml = optionsList
      .map(
        (o) =>
          `<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:999px;border:1px solid #c7d2fe;background:#eef2ff;color:#4f46e5;font-size:12px;font-weight:500;margin:3px;">&#10003; ${o}</span>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${car.title} — ${BRAND_NAME}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 12mm; }
    body { font-family: system-ui, sans-serif; color: #111; background: #fff; padding: 0; max-width: 860px; margin: 0 auto; }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 16px; font-weight: 700; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; color: #111; }
    .meta { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .section { margin-bottom: 28px; }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 20px; color: #4f46e5; }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) td { background: #f9fafb; }
    .condition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 600px) { .condition-grid { grid-template-columns: 1fr 1fr; } }
    @media print {
      body { padding: 0; margin: 0; }
      .section { page-break-inside: avoid; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="logo">${BRAND_NAME}</div>
  <h1>${car.title}</h1>
  <div class="meta">${car.brand} &middot; ${car.year} &middot; ${car.color} &middot; ${car.city}</div>

  <div class="section">
    <h2>Photos</h2>
    ${imagesHtml}
  </div>

  ${car.description ? `<div class="section"><h2>Description</h2><p style="font-size:14px;line-height:1.7;color:#374151;">${car.description}</p></div>` : ""}

  <div class="section">
    <h2>Specifications</h2>
    <table>${specsHtml}</table>
  </div>

  <div class="section">
    <h2>Condition Report</h2>
    <div class="condition-grid">${conditionHtml}</div>
  </div>

  ${optionsList.length > 0 ? `<div class="section"><h2>Options &amp; Features</h2><div>${optionsHtml}</div></div>` : ""}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
    Generated by ${BRAND_NAME} &middot; ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) { toast.error("Please allow popups to print"); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };


  useEffect(() => {
    if (!car.isLive) return;
    const interval = setInterval(async () => {
      try {
        const [freshBids, freshCar] = await Promise.all([
          getBidsForCar({ data: car.id }),
          getCarFromDb({ data: car.id }),
        ]);
        if (freshBids.length > bids.length) {
          setBids(freshBids);
          const freshBid = freshCar?.current_bid != null ? Number(freshCar.current_bid) : null;
          if (freshBid != null && freshBid > currentBid) {
            setCurrentBid(freshBid);
            setBidInput(freshBid + car.minRaise);
          }
        }
      } catch {
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [car.isLive, car.id, car.minRaise, bids.length, currentBid]);

  const CAR_OPTION_LABELS: Record<string, string> = {
    sunroof: t("opt_sunroof"),
    rear_camera: t("opt_rear_camera"),
    parking_sensors: t("opt_parking_sensors"),
    infotainment: t("opt_infotainment"),
    navigation: t("opt_navigation"),
    leather_seats: t("opt_leather_seats"),
    heated_seats: t("opt_heated_seats"),
    ventilated_seats: t("opt_ventilated_seats"),
    cruise_control: t("opt_cruise_control"),
    keyless_entry: t("opt_keyless_entry"),
    push_start: t("opt_push_start"),
    auto_ac: t("opt_auto_ac"),
    abs: t("opt_abs"),
    esp: t("opt_esp"),
    airbags: t("opt_airbags"),
  };

  return (
    <div className="min-h-screen pb-nav">
      <PageMeta
        titleKey="car_page_title"
        descriptionKey="seo_car_desc"
        titleVars={{ title: car.title }}
        descriptionVars={{ title: car.title, year: car.year, brand: car.brand, model: car.model }}
      />
      <Header />
      <div className="page-content max-w-7xl py-4 md:py-8">
        <div className="text-sm text-muted-foreground mb-4 md:mb-6">
          <Link to="/browse" search={{ q: "" }} className="hover:text-foreground">{t("car_back")}</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground truncate">{car.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 md:gap-8">
          {/* MAIN — images, specs (right in RTL) */}
          <div className="flex-1 min-w-0 space-y-6">
            {isLight ? (
              <SpecHotspots
                imageSrc={galleryImages[selectedImg]}
                alt={car.title}
                title={car.title}
                items={[
                  ...(car.hp ? [{ id: "hp", label: "Horsepower", value: `${car.hp} hp`, top: "30%", left: "28%" }] : []),
                  ...(car.engine ? [{ id: "engine", label: "Engine", value: car.engine, top: "52%", left: "62%" }] : []),
                  ...(car.transmission ? [{ id: "trans", label: "Transmission", value: car.transmission, top: "68%", left: "40%" }] : []),
                ]}
              />
            ) : (
            <div className="relative rounded-3xl overflow-hidden border border-border/60 shadow-elegant">
              <img src={galleryImages[selectedImg]} alt={car.title} width={1280} height={896} className="w-full h-auto" />
              <div className="absolute top-4 start-4 flex gap-2">
                {car.isLive && (
                  <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
                    <Radio className="h-3 w-3" /> {t("car_live_badge")}
                  </Badge>
                )}
                <Badge variant="outline" className="glass border-primary/40 gap-1">
                  <CircleCheck className="h-3 w-3 text-primary-glow" /> {t("car_verified")}
                </Badge>
              </div>
              <div className="absolute top-4 end-4 flex gap-2">
                <button
                  onClick={() => { toggle(car.id); toast.success(liked ? t("card_fav_remove") : t("card_fav_add")); }}
                  className={`h-10 w-10 rounded-full glass flex items-center justify-center transition-smooth ${liked ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                </button>
                <button onClick={handlePrint} title="Print listing" className="h-10 w-10 rounded-full glass flex items-center justify-center">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
            )}

            {galleryImages.length > 1 && (
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`aspect-[16/11] rounded-xl overflow-hidden border transition-smooth ${selectedImg === i ? "border-primary shadow-glow" : "border-border/40 hover:border-primary/60"}`}
                  >
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      width={400}
                      height={275}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div>
              {!isLight && (
                <>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{car.brand} · {car.year} · {car.color}</div>
              <h1 className="font-display text-2xl md:text-4xl font-bold mt-1 leading-tight">{car.title}</h1>
                </>
              )}
              {isLight && (
                <p className="text-sm text-muted-foreground">{car.brand} · {car.model} · {car.year}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {car.city}</span>
                {car.isLive && (
                  <span className="inline-flex items-center gap-1 text-[var(--live)]">
                    <Radio className="h-3.5 w-3.5" /> {viewers} {t("car_watching")}
                  </span>
                )}
              </div>
              {car.description && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 relative overflow-hidden">
                  <div className="absolute start-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary-glow to-primary/40 rounded-s-xl" />
                  <p className="text-sm leading-relaxed text-foreground/90 ps-1">{car.description}</p>
                </div>
              )}
            </div>

            {car.documents.length > 0 && (
              <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
                <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-glow" /> Documents
                </h2>
                <div className="space-y-2">
                  {car.documents.map((url, i) => {
                    const name = url.split("/").pop()?.split("?")[0] || `Document ${i + 1}`;
                    const isPdf = /\.pdf(\?.*)?$/i.test(url);
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/50 transition-smooth group"
                      >
                        <FileText className={`h-5 w-5 shrink-0 ${isPdf ? "text-red-400" : "text-primary-glow"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate group-hover:text-primary-glow transition-colors">{name}</div>
                          <div className="text-xs text-muted-foreground">{isPdf ? "PDF Document" : "Document"}</div>
                        </div>
                        <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary-glow transition-colors shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {car.videos.length > 0 && (
              <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
                <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary-glow" /> Videos
                </h2>
                <div className="space-y-4">
                  {car.videos.map((url, i) => {
                    const embed = getVideoEmbed(url);
                    if (embed.type === "youtube") {
                      return (
                        <div key={i} className="rounded-xl overflow-hidden border border-border/40 aspect-video">
                          <iframe
                            src={embed.src}
                            title={`Video ${i + 1}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    if (embed.type === "video") {
                      return (
                        <div key={i} className="rounded-xl overflow-hidden border border-border/40 aspect-video bg-black">
                          <video src={embed.src} controls className="w-full h-full" />
                        </div>
                      );
                    }
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/50 transition-smooth group"
                      >
                        <Play className="h-4 w-4 text-primary-glow shrink-0" />
                        <span className="text-sm text-muted-foreground truncate flex-1 group-hover:text-foreground transition-colors">{url}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
              <h2 className="font-display font-semibold text-lg mb-4">{t("car_specs")}</h2>
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
              <h2 className="font-display font-semibold text-lg mb-4">{t("car_condition")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {[
                  { l: t("car_overall"), v: car.condition, note: car.conditionNotes?.overall },
                  { l: t("car_accidents"), v: car.accidentHistory ? t("car_accident_yes") : t("car_no_accidents"), warn: car.accidentHistory, note: car.conditionNotes?.accident },
                  { l: t("car_service"), v: car.serviceHistory ?? "—", note: car.conditionNotes?.service },
                  ...(car.engineCondition ? [{ l: t("cond_engine"), v: car.engineCondition, note: car.conditionNotes?.engine }] : []),
                  ...(car.transmissionCondition ? [{ l: t("cond_transmission"), v: car.transmissionCondition, note: car.conditionNotes?.transmission }] : []),
                  ...(car.suspensionCondition ? [{ l: t("cond_suspension"), v: car.suspensionCondition, note: car.conditionNotes?.suspension }] : []),
                  ...(car.batteryCondition ? [{ l: t("cond_battery"), v: car.batteryCondition, note: car.conditionNotes?.battery }] : []),
                  ...(car.tireCondition ? [{ l: t("cond_tires"), v: car.tireCondition, note: car.conditionNotes?.tires }] : []),
                  ...(car.chassisCondition ? [{ l: t("cond_chassis"), v: car.chassisCondition, note: car.conditionNotes?.chassis }] : []),
                  ...(car.interiorCondition ? [{ l: t("cond_interior"), v: car.interiorCondition, note: car.conditionNotes?.interior }] : []),
                  ...(car.paintCondition ? [{ l: t("cond_paint"), v: car.paintCondition, note: car.conditionNotes?.paint }] : []),
                  ...(car.previousOwners != null ? [{ l: t("cond_prev_owners"), v: String(car.previousOwners) }] : []),
                  ...(car.licenseExpiry ? [{ l: t("cond_license"), v: car.licenseExpiry }] : []),
                ].map((r) => (
                  <div key={r.l} className={`glass rounded-xl p-2.5 sm:p-4 ${(r as { warn?: boolean }).warn ? "border border-yellow-500/40" : ""}`}>
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">{r.l}</div>
                    <div className={`font-display font-semibold mt-1 inline-flex items-center gap-1 text-sm sm:text-base ${(r as { warn?: boolean }).warn ? "text-yellow-400" : ""}`}>
                      <CircleCheck className={`h-3.5 w-3.5 shrink-0 ${(r as { warn?: boolean }).warn ? "text-yellow-400" : "text-[var(--success)]"}`} /> {r.v}
                    </div>
                    {(r as { note?: string }).note && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 leading-relaxed italic break-words whitespace-pre-wrap">{(r as { note?: string }).note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {car.carOptions.length > 0 && (
              <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
                <h2 className="font-display font-semibold text-lg mb-4">{t("opt_options_title")}</h2>
                <div className="flex flex-wrap gap-2">
                  {car.carOptions.map((key) => (
                    <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium glass border border-primary/30 text-primary-glow">
                      <CircleCheck className="h-3 w-3" />
                      {CAR_OPTION_LABELS[key] ?? key}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR — price/bid panel (left in RTL), sticks while scrolling main content */}
          <aside className="w-full lg:w-80 xl:w-96 shrink-0 lg:self-stretch">
            <div className={`space-y-5 lg:sticky-below-header${isLight ? " aether-glass-panel rounded-2xl p-4" : ""}`}>
            {car.isLive ? (
              <div className={isLight ? "aether-glass-panel rounded-[2rem] p-6" : "rounded-2xl glass-strong border border-primary/30 p-6 shadow-elegant"}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("car_current_bid")}</span>
                  <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
                    <Radio className="h-3 w-3" /> LIVE
                  </Badge>
                </div>
                <div className="font-display text-3xl md:text-4xl font-bold text-gradient-primary">{formatPrice(currentBid)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bids.length} {t("auctions_bids")} · Min raise +{formatPrice(car.minRaise)}
                </div>

                {car.endsAt && (
                  <div className="mt-5 glass rounded-xl p-4 text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("car_ends_in")}</div>
                    <CountdownTimer endsAt={car.endsAt} className="text-3xl text-gradient-primary" />
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("car_your_bid")}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bidInput.toLocaleString("en-US")}
                      onChange={(e) => {
                        const raw = Number(e.target.value.replace(/[^0-9]/g, ""));
                        if (!isNaN(raw)) setBidInput(raw);
                      }}
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
                    {isPlacingBid ? t("car_placing") : t("car_place_bid")}
                  </Button>
                  {entryStatus?.status === "pending" && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {t("entry_pending")}
                    </div>
                  )}
                  {entryStatus?.status === "rejected" && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {entryStatus.rejection_reason
                        ? t("entry_rejected_with_reason", { reason: entryStatus.rejection_reason })
                        : t("entry_rejected_short")}
                    </div>
                  )}
                  {depositPaid && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-xs text-[var(--success)]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {t("entry_approved")}
                    </div>
                  )}
                  {!depositPaid && !entryStatus && (
                    <div className="text-xs text-muted-foreground text-center">
                      {t("car_entry_fee", { n: formatPrice(depositSettings.depositAmount) })}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/30 space-y-2">
                    <button
                      onClick={() => { setShowProxyBid(!showProxyBid); if (!proxyBidInput) setProxyBidInput(currentBid + car.minRaise * 3); }}
                      className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-smooth py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-primary-glow" />
                        {existingProxy ? `Proxy bid: ${formatPrice(existingProxy)}` : "Set max proxy bid"}
                      </span>
                      <span className="text-primary-glow">{showProxyBid ? "Close" : "Set"}</span>
                    </button>

                    {showProxyBid && (
                      <div className="glass rounded-xl p-3 space-y-2 animate-fade-up border border-primary/20">
                        <div className="text-xs text-muted-foreground">We'll automatically bid up to your max amount</div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={proxyBidInput}
                            onChange={(e) => setProxyBidInput(Number(e.target.value))}
                            className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 font-display font-semibold tabular-nums text-sm outline-none focus:border-primary"
                            placeholder={`Min ${formatPrice(currentBid + car.minRaise)}`}
                          />
                          <Button onClick={handleProxyBid} disabled={isSettingProxy} size="sm" className="bg-gradient-primary border-0 text-primary-foreground">
                            {isSettingProxy ? "..." : "Set"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {bids.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border/40">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("car_bid_history")}</div>
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
            ) : car.auctionStatus === "ended_with_winner" ? (
              <div className={isLight ? "aether-glass-panel rounded-[2rem] p-6 space-y-3" : "rounded-2xl glass-strong p-6 shadow-elegant space-y-3"}>
                <Badge variant="outline">{t("car_auction_ended")}</Badge>
                <div className="font-display text-3xl font-bold text-gradient-primary">{formatPrice(currentBid || car.price)}</div>
                {user?.email && car.winnerEmail === user.email ? (
                  <>
                    <p className="text-sm font-medium text-[var(--success)]">{t("car_you_won")}</p>
                    <p className="text-xs text-muted-foreground">{t("car_you_won_sub")}</p>
                    <Button asChild className="w-full bg-gradient-primary border-0 text-primary-foreground">
                      <Link to="/chat/$carId" params={{ carId: car.id }}>{t("car_chat_admin")}</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("car_winner_masked")}</p>
                )}
              </div>
            ) : car.auctionStatus === "no_sale" ? (
              <div className={isLight ? "aether-glass-panel rounded-[2rem] p-6 space-y-3" : "rounded-2xl glass-strong p-6 shadow-elegant space-y-3"}>
                <Badge variant="outline">{t("car_auction_ended")}</Badge>
                <p className="text-sm text-muted-foreground">{t("car_reserve_not_met")}</p>
                <div className="font-display text-2xl font-bold">{formatPrice(car.price)}</div>
              </div>
            ) : (
              <div className={isLight ? "aether-glass-panel rounded-[2rem] p-6 space-y-3" : "rounded-2xl glass-strong p-6 shadow-elegant space-y-3"}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("car_buy_now_price")}</div>
                <div className="font-display text-3xl md:text-4xl font-bold text-gradient-primary">{formatPrice(car.price)}</div>

                <Button
                  onClick={() => setShowBuyNow(true)}
                  className="w-full mt-2 bg-gradient-primary border-0 text-primary-foreground h-12 gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {t("car_buy_now")}
                </Button>

                <button
                  onClick={handlePriceAlertToggle}
                  className={`w-full flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-smooth border ${priceAlertActive ? "border-primary/40 bg-primary/10 text-primary-glow" : "glass border-border/40 text-muted-foreground hover:text-foreground"}`}
                >
                  {priceAlertActive ? <Bell className="h-4 w-4 fill-primary-glow text-primary-glow" /> : <Bell className="h-4 w-4" />}
                  {priceAlertActive ? `Alert set: ${formatPrice(priceAlertTarget)}` : "Set price alert"}
                  {priceAlertActive && <BellOff className="h-3.5 w-3.5 ms-auto opacity-60" />}
                </button>

                <Button
                  variant="outline"
                  className="w-full glass"
                  onClick={() => setShowContact(!showContact)}
                >
                  <Phone className="h-4 w-4" /> {t("car_contact")}
                </Button>

                {showContact && (
                  <div className="rounded-xl glass border border-border/40 p-4 space-y-2 text-sm">
                    <p className="font-medium">{BRAND_NAME}</p>
                    <a href="tel:+20212345678" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
                      <Phone className="h-3.5 w-3.5" /> +20 2 1234 5678
                    </a>
                    <a href={`mailto:${INFO_EMAIL}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
                      <Mail className="h-3.5 w-3.5" /> {INFO_EMAIL}
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
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold truncate">{BRAND_NAME}</p>
                  <div className="text-xs text-muted-foreground">Verified showroom</div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline" className="flex-1 glass gap-2 text-xs">
                  <Link to="/chat/$carId" params={{ carId: car.id }}>
                    <MessageCircle className="h-3.5 w-3.5" /> {t("car_chat")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 glass gap-2 text-xs text-green-500 border-green-500/30 hover:border-green-500/60"
                  onClick={handleWhatsApp}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              </div>
            </div>

            </div>
          </aside>
        </div>

        {bids.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Gavel className="h-5 w-5 text-primary-glow" />
              <h2 className="font-display text-2xl font-bold">Bid History</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary-glow font-medium border border-primary/25">
                {bids.length} bid{bids.length !== 1 ? "s" : ""}
              </span>
              {car.isLive && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--live)] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
                  Live
                </span>
              )}
            </div>

            <div className="rounded-2xl glass-strong border border-border/40 overflow-hidden shadow-elegant">
              <div className="grid grid-cols-[1.5rem_1fr_auto_auto] sm:grid-cols-[2rem_1fr_auto_auto] gap-x-2 sm:gap-x-4 px-3 sm:px-5 py-3 border-b border-border/40 bg-muted/20">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">#</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bidder</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">Amount</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">Time</span>
              </div>

              <div className="divide-y divide-border/30">
                {bids.map((b, i) => {
                  const timeAgo = (() => {
                    const diff = now - new Date(b.created_at).getTime();
                    const mins = Math.floor(diff / 60000);
                    const hrs = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    if (days > 0) return `${days}d ago`;
                    if (hrs > 0) return `${hrs}h ago`;
                    if (mins > 0) return `${mins}m ago`;
                    return "just now";
                  })();
                  const isTop = i === 0;
                  const isCurrentUser = user?.name && b.user_name === user.name;
                  return (
                    <div
                      key={b.id}
                      className={`grid grid-cols-[1.5rem_1fr_auto_auto] sm:grid-cols-[2rem_1fr_auto_auto] gap-x-2 sm:gap-x-4 px-3 sm:px-5 py-3 items-center transition-colors ${isTop ? "bg-primary/8" : "hover:bg-muted/10"}`}
                    >
                      <span className="flex items-center justify-center">
                        {isTop ? (
                          <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums font-medium">{i + 1}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <span className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${isTop ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30" : "bg-muted/40 text-muted-foreground border border-border/40"}`}>
                          {b.user_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className={`text-xs sm:text-sm font-semibold truncate ${isTop ? "text-foreground" : "text-muted-foreground"}`}>
                            {b.user_name}
                            {isCurrentUser && (
                              <span className="ml-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-glow font-medium border border-primary/25 align-middle">You</span>
                            )}
                          </span>
                          {isTop && <span className="text-[10px] text-yellow-400/80 font-medium">Leading</span>}
                        </span>
                      </span>
                      <span className={`font-display font-bold tabular-nums text-right text-xs sm:text-sm ${isTop ? "text-gradient-primary" : "text-muted-foreground"}`}>
                        {formatPrice(b.amount)}
                      </span>
                      <span className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-muted-foreground justify-end">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        {timeAgo}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-2xl font-bold mb-5">{t("car_related")}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((c) => <CarCard key={c.id} car={c} />)}
            </div>
          </div>
        )}
      </div>

      {showBuyNow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowBuyNow(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-strong border border-border/60 rounded-2xl shadow-elegant p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-xl">Buy Now</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Purchase reservation for {car.title}</p>
              </div>
              <button onClick={() => setShowBuyNow(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            {car.image && <img src={car.image} alt={car.title} className="w-full aspect-[16/9] object-cover rounded-xl mb-5 border border-border/40" />}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Vehicle</span>
                <span className="font-display font-semibold text-sm">{car.title}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Year · Color</span>
                <span className="font-semibold text-sm">{car.year} · {car.color}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Total Price</span>
                <span className="font-display font-bold text-xl text-gradient-primary">{formatPrice(car.price)}</span>
              </div>
            </div>
            <div className="glass rounded-xl p-3 mb-4 border border-primary/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clicking confirm will submit a reservation request. Our team will contact you within 2 hours to arrange payment and vehicle handover.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBuyNow(false)} variant="outline" className="flex-1 glass">Cancel</Button>
              <Button
                onClick={() => { setShowBuyNow(false); toast.success("Reservation confirmed! We'll contact you within 2 hours."); }}
                className="flex-1 bg-gradient-primary border-0 text-primary-foreground gap-2"
              >
                <ShoppingCart className="h-4 w-4" /> Confirm Purchase
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPriceAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPriceAlert(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-strong border border-border/60 rounded-2xl shadow-elegant p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Set Price Alert</h3>
              <button onClick={() => setShowPriceAlert(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Get notified when the price drops to or below your target price.</p>
            <div className="space-y-1.5 mb-5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Target Price</label>
              <Input
                type="number"
                value={priceAlertTarget}
                onChange={(e) => setPriceAlertTargetState(Number(e.target.value))}
                className="bg-background/40 font-display font-semibold"
              />
              <p className="text-xs text-muted-foreground">Current price: {formatPrice(car.price)}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowPriceAlert(false)} variant="outline" className="flex-1 glass">Cancel</Button>
              <Button onClick={confirmPriceAlert} className="flex-1 bg-gradient-primary border-0 text-primary-foreground gap-2">
                <Bell className="h-4 w-4" /> Set Alert
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAuctionEntryModal && (
        <AuctionEntryModal
          carId={car.id}
          carTitle={car.title}
          userName={user?.name ?? ""}
          userEmail={user?.email ?? ""}
          depositSettings={depositSettings}
          onClose={() => setShowAuctionEntryModal(false)}
          onSubmitted={() => {
            setEntryStatus({
              id: 0,
              user_name: user?.name ?? "",
              user_email: user?.email ?? "",
              car_id: car.id,
              car_title: car.title,
              proof_image_url: "",
              instapay_number: "",
              status: "pending",
              deposit_amount: depositSettings.depositAmount,
              rejection_reason: null,
              created_at: new Date().toISOString(),
            });
          }}
        />
      )}

      <Footer />
    </div>
  );
}
