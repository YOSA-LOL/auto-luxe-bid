import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useRouter, useNavigate, redirect } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  getCarsFromDb, getLiveCarsFromDb, createCar, updateCar, deleteCar,
  getListingRequests, updateListingRequestStatus,
  getUsersFromDb, getSoldCarsFromDb, markExpiredAuctions,
  type DbCar, type CarInput, type ListingRequest, type DbUser,
} from "@/lib/cars.server";
import { getUser } from "@/lib/auth.server";
import { getAdminEmails } from "@/lib/admin-access.server";
import { getAdminChats, sendChatMessage, type ChatConversation } from "@/lib/chat.server";
import {
  getAuctionEntryRequests, updateAuctionEntryStatus,
  getAuctionDepositSettings, updateAuctionDepositSettings,
  getHeroCarPin, setHeroCarPin,
  type AuctionEntryRequest, type DepositSettings,
} from "@/lib/auction-entry.server";
import { uploadImage } from "@/lib/upload.server";
import { dbCarToApp, generateCarId } from "@/lib/types";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Car as CarIcon, Gavel, DollarSign, TrendingUp,
  ShieldCheck, Activity, Download, Plus, X, Edit2, Trash2,
  Radio, ChevronDown, ChevronUp, Star, Clock, ImagePlus,
  FileText, Video, AlertTriangle, Wrench, Zap, Shield,
  Timer, Eye, RotateCcw, Upload, MessageCircle, Send,
} from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "@/lib/notifications";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/ops-x7k9m2")({
  head: () => ({ meta: [{ title: "Admin — APEXAuto" }] }),
  loader: async ({ context }) => {
    // Resolve admin status — server is the authoritative source when Clerk keys
    // are correctly configured. When getUser() returns null (Clerk passthrough /
    // key-mismatch mode), we allow the page through so the client-side Clerk
    // check can gate access using adminEmails (from ADMIN_EMAIL env var).
    const user = context.user ?? await getUser();
    if (user && !user.isAdmin) throw redirect({ to: "/" });
    const isAdmin = user?.isAdmin ?? false;
    const adminEmails = getAdminEmails();

    await markExpiredAuctions();
    const [cars, live, submissions, users, soldCars, entryRequests, depositSettings, chats, heroCarPin] = await Promise.all([
      getCarsFromDb(), getLiveCarsFromDb(), getListingRequests(),
      getUsersFromDb(), getSoldCarsFromDb(),
      getAuctionEntryRequests(), getAuctionDepositSettings(),
      getAdminChats(), getHeroCarPin(),
    ]);
    return { cars, live, submissions, users, soldCars, entryRequests, depositSettings, chats, isAdmin, adminEmails, heroCarPin };
  },
  component: AdminPage,
});

type FormState = Omit<CarInput, "id" | "condition_notes"> & {
  id: string;
  condition_notes: Record<string, string>;
};

const EMPTY_FORM: FormState = {
  id: "", title: "", brand: "", model: "", year: new Date().getFullYear(),
  trim: null, price: 0, currency: "EGP", mileage: 0, fuel: "Petrol",
  transmission: "Automatic", drivetrain: "RWD", color: "", condition: "Excellent",
  is_new: false,
  image_url: null, images: [], videos: [], documents: [],
  dealership: "", city: "", hp: null, engine: null, vin: null,
  plate_status: "Clean", seats: 5, is_live: false,
  current_bid: null, starting_price: null, buy_now_price: null,
  reserve_price: null, min_raise: 10000, ends_at: null,
  featured: false, accident_history: false, paint_condition: "Original",
  tire_condition: "Good", battery_health: null, service_history: "Full",
  description: null,
  engine_condition: null, transmission_condition: null, suspension_condition: null,
  battery_condition: null, chassis_condition: null, interior_condition: null,
  previous_owners: null, license_expiry: null, car_options: [],
  condition_notes: {},
};

const CONDITION_GRADES = ["Excellent", "Good", "Fair", "Poor", "Unknown"];

const CAR_OPTIONS_LIST: { key: string; label: string }[] = [
  { key: "sunroof", label: "فتحة سقف / Sunroof" },
  { key: "rear_camera", label: "كاميرا خلفية / Rear Camera" },
  { key: "parking_sensors", label: "حساسات ركن / Parking Sensors" },
  { key: "infotainment", label: "شاشة داخلية / Infotainment Screen" },
  { key: "navigation", label: "نظام ملاحة / Navigation System" },
  { key: "leather_seats", label: "فرش جلد / Leather Seats" },
  { key: "heated_seats", label: "تسخين مقاعد / Heated Seats" },
  { key: "ventilated_seats", label: "تبريد مقاعد / Ventilated Seats" },
  { key: "cruise_control", label: "مثبت سرعة / Cruise Control" },
  { key: "keyless_entry", label: "دخول بدون مفتاح / Keyless Entry" },
  { key: "push_start", label: "زر تشغيل / Push Start Button" },
  { key: "auto_ac", label: "تكييف أوتوماتيك / Automatic AC" },
  { key: "abs", label: "ABS / ABS Brakes" },
  { key: "esp", label: "ESP / Electronic Stability Program" },
  { key: "airbags", label: "وسائد هوائية / Airbags" },
];

type Tab = "basic" | "mechanical" | "condition" | "options" | "media" | "auction";
type AdminSectionTab = "overview" | "cars" | "requests" | "people";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: CarIcon },
  { id: "mechanical", label: "Mechanical", icon: Wrench },
  { id: "condition", label: "Condition", icon: Shield },
  { id: "options", label: "Options", icon: Zap },
  { id: "media", label: "Media", icon: ImagePlus },
  { id: "auction", label: "Auction", icon: Gavel },
];

function sel(className = "") {
  return `w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors ${className}`;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-muted-foreground mb-1 block font-medium">{children}</label>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.15em] text-primary-glow font-bold border-b border-border/40 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function GalleryThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative group">
      {broken ? (
        <div className="w-full h-24 rounded-lg border border-border/40 flex items-center justify-center text-xs text-muted-foreground bg-secondary/30">
          No image
        </div>
      ) : (
        <img
          src={url}
          alt="Gallery"
          className="w-full h-24 object-cover rounded-lg border border-border/40"
          onError={() => setBroken(true)}
        />
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AdminPage() {
  const { cars, live, submissions, users, soldCars, entryRequests: initialEntryRequests, depositSettings: initialDepositSettings, chats: initialChats, isAdmin: serverIsAdmin, adminEmails, heroCarPin: initialHeroCarPin } = Route.useLoaderData();
  const { user: clerkUser, isLoaded } = useUser();
  const navigate = useNavigate();
  const router = useRouter();
  const { t, lang } = useLanguage();

  // Admin only if email is listed in ADMIN_EMAIL (.env). Server is authoritative when available.
  const clerkEmail = clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? "";
  const isAdmin =
    serverIsAdmin ||
    (clerkEmail !== "" && adminEmails.includes(clerkEmail));

  useEffect(() => {
    // Once Clerk has finished loading, anyone who is not an ADMIN_EMAIL account is sent home.
    if (isLoaded && !isAdmin) {
      navigate({ to: "/", replace: true });
    }
  }, [isLoaded, isAdmin, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<DbCar | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("basic");
  const [adminTab, setAdminTab] = useState<AdminSectionTab>("overview");
  const [mediaInput, setMediaInput] = useState({ image: "", video: "", doc: "" });
  const [customOptionInput, setCustomOptionInput] = useState("");

  const [now, setNow] = useState<number | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const mainImgRef = useRef<HTMLInputElement>(null);
  const galleryImgRef = useRef<HTMLInputElement>(null);

  const handleUpload = (file: File | undefined, target: "primary" | "gallery") => {
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const fileData = ev.target?.result as string;
      try {
        const { url } = await uploadImage({ data: { fileData, fileName: file.name } });
        if (target === "primary") {
          set("image_url", url);
        } else {
          setForm((f) => ({ ...f, images: [...f.images, url] }));
        }
        toast.success("Image uploaded successfully");
      } catch {
        toast.error("Image upload failed");
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (showForm) {
      const t = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setDrawerVisible(false);
    }
  }, [showForm]);

  const closeForm = () => {
    setDrawerVisible(false);
    setTimeout(() => setShowForm(false), 320);
  };

  const [submissionsList, setSubmissionsList] = useState<ListingRequest[]>(submissions);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [chatsList, setChatsList] = useState<ChatConversation[]>(initialChats);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);
  const [chatReplyText, setChatReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);

  // Go Live modal
  const [goLiveTarget, setGoLiveTarget] = useState<DbCar | null>(null);
  const [goLiveEndsAt, setGoLiveEndsAt] = useState("");
  const [goLiveConfirming, setGoLiveConfirming] = useState(false);

  const [entryRequestsList, setEntryRequestsList] = useState<AuctionEntryRequest[]>(initialEntryRequests);
  const [updatingEntryId, setUpdatingEntryId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<number>>(new Set());
  const [shownProofIds, setShownProofIds] = useState<Set<number>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [depositSettingsForm, setDepositSettingsForm] = useState<DepositSettings>(initialDepositSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Hero Spotlight
  const [heroPinId, setHeroPinId] = useState<string>(initialHeroCarPin ?? "");
  const [savingHeroPin, setSavingHeroPin] = useState(false);

  const handleSaveHeroPin = async (carId: string | null) => {
    setSavingHeroPin(true);
    try {
      await setHeroCarPin({ data: { carId } });
      setHeroPinId(carId ?? "");
      toast.success(carId ? "Hero spotlight updated" : "Hero spotlight set to auto");
      router.invalidate();
    } catch {
      toast.error("Failed to update hero spotlight");
    } finally {
      setSavingHeroPin(false);
    }
  };

  const handleEntryStatus = async (req: AuctionEntryRequest, status: string) => {
    setUpdatingEntryId(req.id);
    try {
      await updateAuctionEntryStatus({
        data: {
          id: req.id,
          status,
          rejectionReason: status === "rejected" ? (rejectionReason[req.id] ?? "") : undefined,
          userEmail: req.user_email,
          carId: req.car_id,
        },
      });
      setEntryRequestsList((prev) => prev.map((r) => r.id === req.id ? { ...r, status, rejection_reason: rejectionReason[req.id] ?? null } : r));
      toast.success(status === "approved" ? "Entry approved — user can now bid" : `Entry ${status}`);
      if (status === "approved") {
        addNotification({
          type: "entry_approved",
          title: "Auction entry approved",
          body: `You've been approved to bid on ${req.car_title}. You can now place bids on this live auction.`,
          carId: req.car_id,
        });
      } else if (status === "rejected") {
        addNotification({
          type: "entry_rejected",
          title: "Auction entry not approved",
          body: `Your entry request for ${req.car_title} was not approved${rejectionReason[req.id] ? `: ${rejectionReason[req.id]}` : "."}`,
          carId: req.car_id,
        });
      }
    } catch {
      toast.error("Failed to update entry status");
    } finally {
      setUpdatingEntryId(null);
    }
  };

  const handleSaveDepositSettings = async () => {
    setSavingSettings(true);
    try {
      await updateAuctionDepositSettings({ data: depositSettingsForm });
      toast.success("Deposit settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmissionStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateListingRequestStatus({ data: { id, status } });
      setSubmissionsList((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      toast.success(`Request ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdminReply = async (convo: ChatConversation) => {
    const key = `${convo.car_id}::${convo.buyer_email}`;
    const text = chatReplyText[key]?.trim();
    if (!text) return;
    setSendingReply(key);
    try {
      const msg = await sendChatMessage({
        data: {
          carId: convo.car_id,
          buyerEmail: convo.buyer_email,
          buyerName: convo.buyer_name,
          senderRole: "admin",
          message: text,
        },
      });
      setChatsList((prev) =>
        prev.map((c) =>
          c.car_id === convo.car_id && c.buyer_email === convo.buyer_email
            ? { ...c, messages: [...c.messages, msg], last_message: text, last_at: msg.created_at }
            : c
        )
      );
      setChatReplyText((r) => ({ ...r, [key]: "" }));
      toast.success("Reply sent");
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(null);
    }
  };

  const totalCars = cars.length;
  const liveCars = live.length;
  const featuredCount = cars.filter((c) => c.featured).length;
  const bars = [42, 58, 71, 49, 88, 95, 76, 102, 89, 124, 110, 138];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleExport = () => {
    const rows = [
      ["Title", "Brand", "Model", "Year", "VIN", "Status", "Price", "Current Bid", "Dealership", "City", "Condition", "Mileage", "Featured"],
      ...cars.map((c) => [
        c.title, c.brand, c.model, c.year, c.vin ?? "",
        c.is_live ? "Live" : "Listed",
        c.price, c.current_bid ?? "",
        c.dealership, c.city, c.condition,
        c.mileage, c.featured ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "apexauto-inventory.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory exported as CSV");
  };

  const openNew = () => {
    setEditingCar(null);
    setForm({ ...EMPTY_FORM });
    setTab("basic");
    setShowForm(true);
  };

  const openEdit = (car: DbCar) => {
    setEditingCar(car);
    setForm({
      id: car.id, title: car.title, brand: car.brand, model: car.model,
      year: car.year, trim: car.trim ?? null, price: car.price,
      currency: car.currency ?? "EGP", mileage: car.mileage, fuel: car.fuel,
      transmission: car.transmission, drivetrain: car.drivetrain ?? "RWD",
      color: car.color, condition: car.condition, image_url: car.image_url ?? null,
      images: car.images ?? [], videos: car.videos ?? [], documents: car.documents ?? [],
      dealership: car.dealership, city: car.city,
      hp: car.hp ?? null, engine: car.engine ?? null, vin: car.vin ?? null,
      plate_status: car.plate_status ?? "Clean", seats: car.seats ?? 5,
      is_live: car.is_live ?? false,
      current_bid: car.current_bid ?? null, starting_price: car.starting_price ?? null,
      buy_now_price: car.buy_now_price ?? null, reserve_price: car.reserve_price ?? null,
      min_raise: car.min_raise ?? 10000, ends_at: car.ends_at ?? null,
      is_new: car.is_new ?? false,
      featured: car.featured ?? false, accident_history: car.accident_history ?? false,
      paint_condition: car.paint_condition ?? "Original",
      tire_condition: car.tire_condition ?? "Good",
      battery_health: car.battery_health ?? null,
      service_history: car.service_history ?? "Full",
      description: car.description ?? null,
      engine_condition: car.engine_condition ?? null,
      transmission_condition: car.transmission_condition ?? null,
      suspension_condition: car.suspension_condition ?? null,
      battery_condition: car.battery_condition ?? null,
      chassis_condition: car.chassis_condition ?? null,
      interior_condition: car.interior_condition ?? null,
      previous_owners: car.previous_owners ?? null,
      license_expiry: car.license_expiry ?? null,
      car_options: car.car_options ?? [],
      condition_notes: (() => {
        if (!car.condition_notes) return {};
        try { return JSON.parse(car.condition_notes); } catch { return {}; }
      })(),
    });
    setTab("basic");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.brand || !form.model || !form.dealership || !form.city) {
      toast.error("Fill required fields: Title, Brand, Model, Dealership, City");
      setTab("basic");
      return;
    }
    setSaving(true);
    try {
      const id = form.id || generateCarId(form.brand, form.model, form.year);
      const payload: CarInput = {
        ...form,
        id,
        condition_notes: Object.keys(form.condition_notes).some((k) => form.condition_notes[k])
          ? JSON.stringify(form.condition_notes)
          : null,
      };
      if (editingCar) {
        await updateCar({ data: payload });
        toast.success(`${form.title} updated`);
      } else {
        await createCar({ data: payload });
        toast.success(`${form.title} added to inventory`);
      }
      closeForm();
      router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteCar({ data: id });
      toast.success(`${title} deleted`);
      setDeleteConfirm(null);
      router.invalidate();
    } catch { toast.error("Failed to delete"); }
  };

  /** Convert a timestamp to the 'YYYY-MM-DDThh:mm' format that datetime-local expects (local time, not UTC). */
  const toLocalDT = (ms: number) => {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleToggleLive = (car: DbCar) => {
    if (car.is_live) {
      // Unlist directly — no modal needed
      updateCar({ data: { id: car.id, is_live: false } })
        .then(() => { toast.success(`${car.title} unlisted`); router.invalidate(); })
        .catch(() => toast.error("Failed to update"));
    } else {
      // Open end-time modal before going live (default: 24h from now, local time)
      setGoLiveEndsAt(toLocalDT(Date.now() + 24 * 60 * 60 * 1000));
      setGoLiveTarget(car);
    }
  };

  const handleConfirmGoLive = async () => {
    if (!goLiveTarget || goLiveConfirming) return;
    const endsAt = goLiveEndsAt ? new Date(goLiveEndsAt).getTime() : null;
    if (!endsAt || isNaN(endsAt)) { toast.error("Please set a valid end date & time"); return; }
    if (endsAt <= Date.now()) { toast.error("End time must be in the future"); return; }
    setGoLiveConfirming(true);
    try {
      await updateCar({ data: { id: goLiveTarget.id, is_live: true, ends_at: endsAt } });
      toast.success(`${goLiveTarget.title} is now LIVE!`);
      setGoLiveTarget(null);
      router.invalidate();
    } catch { toast.error("Failed to go live"); }
    finally { setGoLiveConfirming(false); }
  };

  const handleToggleFeatured = async (car: DbCar) => {
    try {
      await updateCar({ data: { id: car.id, featured: !car.featured } });
      toast.success(`${car.title} ${!car.featured ? "featured" : "unfeatured"}`);
      router.invalidate();
    } catch { toast.error("Failed to update"); }
  };

  const endsAtDisplay = form.ends_at
    ? new Date(form.ends_at).toISOString().slice(0, 16)
    : "";

  const setEndsAt = (val: string) => {
    set("ends_at", val ? new Date(val).getTime() : null);
  };

  const setQuickTimer = (minutes: number) => {
    set("ends_at", Date.now() + minutes * 60 * 1000);
    toast.success(`Auction end time set to ${minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`} from now`);
  };

  const addMedia = (type: "image" | "video" | "doc") => {
    const url = mediaInput[type].trim();
    if (!url) return;
    if (type === "image") {
      set("images", [...form.images, url]);
      if (!form.image_url) set("image_url", url);
    } else if (type === "video") set("videos", [...form.videos, url]);
    else set("documents", [...form.documents, url]);
    setMediaInput((m) => ({ ...m, [type]: "" }));
  };

  const removeMedia = (type: "images" | "videos" | "documents", idx: number) => {
    const arr = [...(form[type] as string[])];
    arr.splice(idx, 1);
    set(type, arr);
  };

  const soldCount = soldCars.length;
  const soldValue = soldCars.reduce((s, c) => s + (c.current_bid ?? c.price), 0);
  const registeredUsers = users.length;

  const stats = [
    { icon: DollarSign, l: t("admin_stat_sold_val"), v: `EGP ${(soldValue / 1_000_000).toFixed(1)}M`, d: `${soldCount} sold`, color: "text-green-400" },
    { icon: Gavel, l: t("admin_stat_live"), v: liveCars.toString(), d: `${liveCars} active`, color: "text-[var(--live)]" },
    { icon: CarIcon, l: t("admin_stat_cars"), v: formatNumber(totalCars), d: `${totalCars} listed`, color: "text-blue-400" },
    { icon: Users, l: t("admin_stat_users"), v: registeredUsers.toString(), d: "all time", color: "text-yellow-400" },
  ];

  const pendingRequestsCount =
    submissionsList.filter((s) => s.status === "pending").length +
    entryRequestsList.filter((r) => r.status === "pending").length;
  const unreadChatCount = chatsList.reduce((sum, c) => sum + c.unread, 0);

  const adminTabs = [
    { id: "overview" as const, label: t("admin_tab_overview"), icon: Activity },
    { id: "cars" as const, label: t("admin_tab_cars"), icon: CarIcon },
    { id: "requests" as const, label: t("admin_tab_requests"), icon: FileText, badge: pendingRequestsCount },
    { id: "people" as const, label: t("admin_tab_people"), icon: Users, badge: unreadChatCount },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen pb-nav md:pb-0">
        <Header />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav md:pb-0" onClick={() => setDeleteConfirm(null)}>
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-glow" />
              <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">{t("admin_super")}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold mt-1">{t("admin_ctrl")} <span className="text-gradient-primary">{t("admin_ctrl2")}</span></h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="glass gap-1.5" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("admin_export_csv")}</span>
            </Button>
            <Button size="sm" className="bg-gradient-primary border-0 text-primary-foreground gap-1.5" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> {t("admin_add_car")}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {adminTabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setAdminTab(tabItem.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-smooth shrink-0 ${
                adminTab === tabItem.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass hover:bg-secondary/50"
              }`}
            >
              <tabItem.icon className="h-3.5 w-3.5" />
              {tabItem.label}
              {tabItem.badge ? (
                <span className="h-4 min-w-4 px-1 rounded-full bg-[var(--live)] text-white text-[10px] flex items-center justify-center font-bold">
                  {tabItem.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {adminTab === "overview" && (
        <>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-xl sm:rounded-2xl bg-gradient-card border border-border/60 p-3 sm:p-5 hover-lift">
              <div className="flex items-start justify-between gap-1">
                <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                  <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                </div>
                <Badge variant="outline" className={`text-[9px] sm:text-[10px] border-current/40 ${s.color} shrink-0`}>{s.d}</Badge>
              </div>
              <div className="mt-2 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">{s.l}</div>
              <div className="font-display text-lg sm:text-2xl font-bold mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Chart + Live */}
        <div className="grid lg:grid-cols-3 gap-5 mt-5">
          <div className="lg:col-span-2 rounded-2xl bg-gradient-card border border-border/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-semibold">{t("admin_chart_title")}</h3>
                <p className="text-xs text-muted-foreground">{t("admin_chart_sub")}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-primary-glow" />
            </div>
            <div className="flex items-end gap-2 h-48">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-primary opacity-80 hover:opacity-100 transition-smooth cursor-pointer"
                  style={{ height: `${(b / Math.max(...bars)) * 100}%`, boxShadow: "var(--shadow-glow)" }}
                  onClick={() => toast.info(`Week ${i + 1}: EGP ${(b * 100_000).toLocaleString()}`)}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl glass-strong border border-border/60 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-[var(--live)] animate-pulse-live" />
              <h3 className="font-display font-semibold">{t("admin_live_mon")}</h3>
            </div>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin_no_live")}</p>
            ) : (
              <div className="space-y-3">
                {live.slice(0, 5).map((c) => (
                  <Link key={c.id} to="/cars/$carId" params={{ carId: c.id }}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 hover:opacity-80 transition-smooth">
                    <div>
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{c.bids_count} bids</span>
                        <span>·</span>
                        <Eye className="h-3 w-3" />{c.viewers}
                        {c.ends_at && now && (
                          <>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>{Math.max(0, Math.round((c.ends_at - now) / 60000))}m left</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-semibold text-sm text-gradient-primary">
                        {formatPrice(c.current_bid ?? c.price)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Analytics Chart */}
        <div className="mt-6 rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg">{t("admin_breakdown")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_by_brand")}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary-glow" />
          </div>
          {(() => {
            const brandCount: Record<string, number> = {};
            cars.forEach((c) => { brandCount[c.brand] = (brandCount[c.brand] ?? 0) + 1; });
            const sorted = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const max = sorted[0]?.[1] ?? 1;
            return (
              <div className="space-y-3">
                {sorted.map(([brand, count]) => (
                  <div key={brand} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium truncate text-right shrink-0">{brand}</div>
                    <div className="flex-1 h-6 rounded-full bg-secondary/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <div className="w-8 text-xs font-display font-bold text-end shrink-0">{count}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        </>
        )}

        {adminTab === "cars" && (
        <>
        {/* Car Inventory Table */}
        <div className="rounded-2xl bg-gradient-card border border-border/60 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">{t("admin_inventory")}</h3>
            <Badge variant="outline">{totalCars} cars</Badge>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {cars.map((c) => (
              <div key={c.id} className="rounded-xl border border-border/30 bg-secondary/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.featured && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                      {c.is_live
                        ? <Badge className="bg-[var(--live)] text-white border-0 gap-0.5 text-[10px] px-1.5 py-0.5"><Radio className="h-2.5 w-2.5" /> Live</Badge>
                        : <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Listed</Badge>}
                      {c.ends_at && now && (
                        <span className={`text-[10px] ${c.ends_at < now ? "text-destructive" : "text-muted-foreground"}`}>
                          {c.ends_at < now ? "Ended" : `${Math.round((c.ends_at - now) / 60000)}m`}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm mt-1 truncate">{c.title}</div>
                    <div className="text-[11px] text-muted-foreground">{c.city} · {c.year}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-sm text-gradient-primary">
                      {formatPrice(c.is_live ? (c.current_bid ?? c.price) : c.price)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="glass text-[11px] h-7 px-2 flex-1" onClick={() => handleToggleLive(c)}>
                    {c.is_live ? "Unlist" : "Go Live"}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleFeatured(c)}>
                    <Star className={`h-3 w-3 ${c.featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {deleteConfirm === c.id && (
                  <div className="mt-2 p-3 rounded-xl border border-destructive/40 bg-destructive/5" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs font-medium mb-2">Delete "{c.title}"?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => handleDelete(c.id, c.title)}>Delete</Button>
                      <Button size="sm" variant="outline" className="glass h-7 text-xs" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="pb-3 pr-4">Car</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Auction Ends</th>
                  <th className="pb-3 pr-4 text-right">Price / Bid</th>
                  <th className="pb-3 pr-4">City</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr
                      className="border-t border-border/20 hover:bg-secondary/20 transition-smooth cursor-pointer"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {c.featured && <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />}
                          <div>
                            <div className="font-medium">{c.title}</div>
                            <div className="text-[11px] text-muted-foreground">{c.dealership} · {c.year}{c.trim ? ` · ${c.trim}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {c.is_live
                          ? <Badge className="bg-[var(--live)] text-white border-0 gap-1"><Radio className="h-3 w-3" /> Live</Badge>
                          : <Badge variant="outline">Listed</Badge>}
                      </td>
                      <td className="py-3 pr-4">
                        {c.ends_at && now ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Timer className="h-3 w-3 text-muted-foreground" />
                            <span className={c.ends_at < now ? "text-destructive" : "text-muted-foreground"}>
                              {c.ends_at < now ? "Ended" : `${Math.round((c.ends_at - now) / 60000)}m`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right font-display font-semibold tabular-nums">
                        {formatPrice(c.is_live ? (c.current_bid ?? c.price) : c.price)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{c.city}</td>
                      <td className="py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleToggleLive(c)}>
                            {c.is_live ? "Unlist" : "Go Live"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={c.featured ? "Unfeature" : "Feature"} onClick={() => handleToggleFeatured(c)}>
                            <Star className={`h-3.5 w-3.5 ${c.featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        {deleteConfirm === c.id && (
                          <div className="absolute right-0 mt-1 w-60 glass-strong border border-destructive/40 rounded-xl shadow-elegant z-20 p-3 text-left" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm font-medium mb-1">Delete "{c.title}"?</p>
                            <p className="text-xs text-muted-foreground mb-3">Cannot be undone. All bids removed.</p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(c.id, c.title)}>Delete</Button>
                              <Button size="sm" variant="outline" className="glass" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr key={`${c.id}-exp`} className="bg-secondary/10">
                        <td colSpan={6} className="py-3 px-4">
                          <div className="grid sm:grid-cols-5 gap-3 text-xs text-muted-foreground">
                            <span><strong className="text-foreground">Engine:</strong> {c.engine ?? "—"}</span>
                            <span><strong className="text-foreground">HP:</strong> {c.hp ?? "—"}</span>
                            <span><strong className="text-foreground">Drivetrain:</strong> {c.drivetrain ?? "—"}</span>
                            <span><strong className="text-foreground">Fuel:</strong> {c.fuel}</span>
                            <span><strong className="text-foreground">Transmission:</strong> {c.transmission}</span>
                            <span><strong className="text-foreground">Mileage:</strong> {formatNumber(c.mileage)} km</span>
                            <span><strong className="text-foreground">VIN:</strong> {c.vin ?? "—"}</span>
                            <span><strong className="text-foreground">Plate:</strong> {c.plate_status ?? "—"}</span>
                            <span><strong className="text-foreground">Accident:</strong> {c.accident_history ? "Yes" : "No"}</span>
                            <span><strong className="text-foreground">Paint:</strong> {c.paint_condition ?? "—"}</span>
                            <span><strong className="text-foreground">Tires:</strong> {c.tire_condition ?? "—"}</span>
                            <span><strong className="text-foreground">Service:</strong> {c.service_history ?? "—"}</span>
                            <span><strong className="text-foreground">Min Raise:</strong> {formatPrice(c.min_raise ?? 10000)}</span>
                            <span><strong className="text-foreground">Reserve:</strong> {c.reserve_price ? formatPrice(c.reserve_price) : "None"}</span>
                            <span><strong className="text-foreground">Images:</strong> {(c.images ?? []).length}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button asChild size="sm" variant="outline" className="glass text-xs h-7">
                              <Link to="/cars/$carId" params={{ carId: c.id }}>View listing</Link>
                            </Button>
                            <Button size="sm" variant="outline" className="glass text-xs h-7" onClick={() => openEdit(c)}>
                              <Edit2 className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Hero Spotlight ─────────────────────────────────────── */}
        <div className="mt-6 rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-start justify-between mb-5 gap-3">
            <div>
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Star className="h-4 w-4 text-primary-glow" />
                {t("admin_hero_spot")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_hero_sub")}</p>
            </div>
            {heroPinId && (
              <Badge className="bg-primary/20 text-primary-glow border-primary/30 shrink-0">{t("admin_pinned")}</Badge>
            )}
          </div>

          {/* Currently pinned car preview */}
          {(() => {
            const pinned = heroPinId ? cars.find((c) => c.id === heroPinId) : null;
            if (pinned) {
              return (
                <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-primary/20">
                  {pinned.image_url && (
                    <img src={pinned.image_url} alt={pinned.title} className="h-14 w-20 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{pinned.title}</div>
                    <div className="text-xs text-muted-foreground">{pinned.brand} · {pinned.year} · EGP {formatNumber(pinned.current_bid ?? pinned.price)}</div>
                    {pinned.is_live && (
                      <Badge className="mt-1 bg-[var(--live)] text-white border-0 text-[10px] px-1.5 py-0 gap-1">
                        <Radio className="h-2.5 w-2.5" /> LIVE
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="glass text-xs shrink-0"
                    disabled={savingHeroPin}
                    onClick={() => handleSaveHeroPin(null)}
                  >
                    <X className="h-3.5 w-3.5 me-1" /> Clear (Auto)
                  </Button>
                </div>
              );
            }
            // Auto mode — show what would be selected
            const soonestLive = [...cars]
              .filter((c) => c.is_live && c.ends_at != null)
              .sort((a, b) => (a.ends_at ?? 0) - (b.ends_at ?? 0))[0]
              ?? cars.find((c) => c.is_live)
              ?? [...cars].sort((a, b) => {
                if (b.featured !== a.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
                return (b.hp ?? 0) - (a.hp ?? 0) || b.price - a.price;
              })[0];
            return soonestLive ? (
              <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/40">
                {soonestLive.image_url && (
                  <img src={soonestLive.image_url} alt={soonestLive.title} className="h-14 w-20 object-cover rounded-lg shrink-0 opacity-70" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Auto-selected</div>
                  <div className="font-medium text-sm truncate">{soonestLive.title}</div>
                  <div className="text-xs text-muted-foreground">{soonestLive.brand} · {soonestLive.year}</div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Car picker */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Pin a specific car to the hero spotlight</label>
              <select
                value={heroPinId}
                onChange={(e) => setHeroPinId(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">— Auto (soonest live or best car) —</option>
                {[...cars]
                  .sort((a, b) => {
                    if (a.is_live !== b.is_live) return a.is_live ? -1 : 1;
                    return a.title.localeCompare(b.title);
                  })
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.is_live ? "🔴 " : ""}{c.title} · {c.year} · EGP {formatNumber(c.current_bid ?? c.price)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="bg-gradient-primary border-0 text-primary-foreground h-9"
                disabled={savingHeroPin}
                onClick={() => handleSaveHeroPin(heroPinId || null)}
              >
                {savingHeroPin ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Sold Cars Section */}
        <div className="mt-6 rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg">{t("admin_sold_arch")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_sold_sub")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{soldCount} sold</Badge>
              <Badge className="bg-green-500/20 text-green-400 border-0">
                {soldCount > 0 ? `EGP ${(soldValue / 1_000_000).toFixed(1)}M total` : "—"}
              </Badge>
            </div>
          </div>
          {soldCars.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("admin_no_sold")}</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {soldCars.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/30 bg-secondary/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to="/cars/$carId" params={{ carId: c.id }} className="font-medium text-sm hover:text-primary-glow block truncate">{c.title}</Link>
                        <div className="text-[11px] text-muted-foreground">{c.brand} · {c.year} · {c.city}</div>
                        <div className="text-[11px] text-muted-foreground">{c.sold_at ? new Date(c.sold_at).toLocaleDateString() : "—"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-sm text-gradient-primary">{formatPrice(c.current_bid ?? c.price)}</div>
                        {c.current_bid && c.current_bid > c.price && (
                          <div className="text-[10px] text-green-400">+{Math.round(((c.current_bid - c.price) / c.price) * 100)}%</div>
                        )}
                        <div className="text-[10px] text-muted-foreground">{formatPrice(c.price)} start</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                      <th className="pb-3 pr-4">Car</th>
                      <th className="pb-3 pr-4">Dealership</th>
                      <th className="pb-3 pr-4">Sold Date</th>
                      <th className="pb-3 pr-4 text-right">Starting Price</th>
                      <th className="pb-3 text-right">Final Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldCars.map((c) => (
                      <tr key={c.id} className="border-t border-border/20 hover:bg-secondary/20 transition-smooth">
                        <td className="py-3 pr-4">
                          <Link to="/cars/$carId" params={{ carId: c.id }} className="font-medium hover:text-primary-glow transition-smooth block">{c.title}</Link>
                          <div className="text-[11px] text-muted-foreground">{c.brand} · {c.year} · {c.city}</div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{c.dealership}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{c.sold_at ? new Date(c.sold_at).toLocaleDateString() : "—"}</td>
                        <td className="py-3 pr-4 text-right font-display tabular-nums text-xs text-muted-foreground">{formatPrice(c.price)}</td>
                        <td className="py-3 text-right font-display font-semibold tabular-nums text-gradient-primary">
                          {formatPrice(c.current_bid ?? c.price)}
                          {c.current_bid && c.current_bid > c.price && (
                            <div className="text-[10px] text-green-400 font-normal">+{Math.round(((c.current_bid - c.price) / c.price) * 100)}%</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </>
        )}

        {adminTab === "requests" && (
        <>
        {/* Listing Submissions */}
        <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg">{t("admin_submissions")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_submissions_sub")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{submissionsList.length} {t("admin_total")}</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                {submissionsList.filter((s) => s.status === "pending").length} {t("admin_pending")}
              </Badge>
            </div>
          </div>

          {submissionsList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("admin_no_subs")}</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {submissionsList.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border/30 bg-secondary/10 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{s.email}</div>
                        <div className="text-xs font-semibold mt-0.5">{s.brand} {s.model} · {s.year ?? "—"}</div>
                        {s.price && <div className="text-xs text-primary-glow font-display font-bold">EGP {s.price}</div>}
                      </div>
                      <Badge className={`shrink-0 text-[10px] ${
                        s.status === "approved" ? "bg-[var(--success)]/20 text-[var(--success)] border-0" :
                        s.status === "rejected" ? "bg-destructive/20 text-destructive border-0" :
                        "bg-yellow-500/20 text-yellow-400 border-0"
                      }`}>{s.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {s.status !== "approved" && (
                        <Button size="sm" variant="outline" className="text-[11px] h-7 flex-1 glass text-[var(--success)] border-[var(--success)]/30" disabled={updatingId === s.id} onClick={() => handleSubmissionStatus(s.id, "approved")}>Approve</Button>
                      )}
                      {s.status !== "rejected" && (
                        <Button size="sm" variant="outline" className="text-[11px] h-7 flex-1 glass text-destructive border-destructive/30" disabled={updatingId === s.id} onClick={() => handleSubmissionStatus(s.id, "rejected")}>Reject</Button>
                      )}
                      {s.status !== "pending" && (
                        <Button size="sm" variant="outline" className="text-[11px] h-7 glass" disabled={updatingId === s.id} onClick={() => handleSubmissionStatus(s.id, "pending")}>Reset</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                      <th className="pb-3 pr-4">Seller</th>
                      <th className="pb-3 pr-4">Car</th>
                      <th className="pb-3 pr-4">Price</th>
                      <th className="pb-3 pr-4">Submitted</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsList.map((s) => (
                      <tr key={s.id} className="border-t border-border/20 hover:bg-secondary/20 transition-smooth">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground">{s.email}</div>
                          {s.phone && <div className="text-[11px] text-muted-foreground">{s.phone}</div>}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{s.brand} {s.model}</div>
                          <div className="text-[11px] text-muted-foreground">{s.year ?? "Year N/A"}</div>
                          {s.notes && <div className="text-[11px] text-muted-foreground italic mt-0.5 max-w-[180px] truncate">{s.notes}</div>}
                        </td>
                        <td className="py-3 pr-4"><span className="text-xs font-display font-semibold">{s.price ? `EGP ${s.price}` : "—"}</span></td>
                        <td className="py-3 pr-4"><span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span></td>
                        <td className="py-3 pr-4">
                          <Badge className={s.status === "approved" ? "bg-[var(--success)]/20 text-[var(--success)] border-0" : s.status === "rejected" ? "bg-destructive/20 text-destructive border-0" : "bg-yellow-500/20 text-yellow-400 border-0"}>{s.status}</Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {s.status !== "approved" && <Button size="sm" variant="outline" className="text-[11px] h-7 glass text-[var(--success)] border-[var(--success)]/30 hover:border-[var(--success)]/60" disabled={updatingId === s.id} onClick={() => handleSubmissionStatus(s.id, "approved")}>Approve</Button>}
                            {s.status !== "rejected" && <Button size="sm" variant="outline" className="text-[11px] h-7 glass text-destructive border-destructive/30 hover:border-destructive/60" disabled={updatingId === s.id} onClick={() => handleSubmissionStatus(s.id, "rejected")}>Reject</Button>}
                            {s.status !== "pending" && <Button size="sm" variant="outline" className="text-[11px] h-7 glass" disabled={updatingId === s.id} onClick={() => handleSubmissionStatus(s.id, "pending")}>Reset</Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Auction Entry Requests */}
        <div className="mt-6 rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg">{t("admin_entry_req")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_entry_sub")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{entryRequestsList.length} {t("admin_total")}</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                {entryRequestsList.filter((r) => r.status === "pending").length} {t("admin_pending")}
              </Badge>
            </div>
          </div>

          {/* Deposit Settings */}
          <div className="mb-6 p-4 rounded-xl bg-secondary/40 border border-border/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-glow mb-3">{t("admin_deposit_cfg")}</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_deposit_amt")}</label>
                <Input
                  type="number"
                  value={depositSettingsForm.depositAmount}
                  onChange={(e) => setDepositSettingsForm((f) => ({ ...f, depositAmount: Number(e.target.value) }))}
                  className="bg-background/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_pay_info")}</label>
                <Input
                  value={depositSettingsForm.paymentInfo}
                  onChange={(e) => setDepositSettingsForm((f) => ({ ...f, paymentInfo: e.target.value }))}
                  placeholder="e.g. Instapay: 01012345678 — APEXAuto"
                  className="bg-background/50"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-3 bg-gradient-primary border-0 text-primary-foreground"
              disabled={savingSettings}
              onClick={handleSaveDepositSettings}
            >
              {savingSettings ? "…" : t("admin_save_settings")}
            </Button>
          </div>

          {entryRequestsList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("admin_no_entries")}</p>
          ) : (
            <div className="space-y-2">
              {entryRequestsList.map((req) => {
                const isEntryExpanded = expandedEntryIds.has(req.id);
                const isProofShown = shownProofIds.has(req.id);
                const toggleEntry = () => setExpandedEntryIds((prev) => {
                  const next = new Set(prev);
                  next.has(req.id) ? next.delete(req.id) : next.add(req.id);
                  return next;
                });
                const toggleProof = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setShownProofIds((prev) => {
                    const next = new Set(prev);
                    next.has(req.id) ? next.delete(req.id) : next.add(req.id);
                    return next;
                  });
                };
                return (
                  <div key={req.id} className="rounded-xl border border-border/40 overflow-hidden bg-secondary/10">
                    {/* Collapsible header row */}
                    <button
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-secondary/20 transition-smooth"
                      onClick={toggleEntry}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                          {(req.user_name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{req.user_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{req.car_title}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={
                          req.status === "approved" ? "bg-[var(--success)]/20 text-[var(--success)] border-0" :
                          req.status === "rejected" ? "bg-destructive/20 text-destructive border-0" :
                          "bg-yellow-500/20 text-yellow-400 border-0"
                        }>{req.status}</Badge>
                        {isEntryExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isEntryExpanded && (
                      <div className="border-t border-border/30 p-4 space-y-3">
                        {/* Details */}
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{req.user_email}</div>
                          <div>
                            {t("admin_car_lbl")} <span className="text-foreground font-medium">{req.car_title}</span>
                            <span className="ms-2">· {t("admin_deposit_lbl")} EGP {req.deposit_amount.toLocaleString()}</span>
                            <span className="ms-2">· {new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          {req.instapay_number && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs mt-1">
                              <span className="text-muted-foreground">{t("admin_refund_ip")}</span>
                              <span className="font-semibold text-primary-glow">{req.instapay_number}</span>
                            </div>
                          )}
                        </div>

                        {/* Proof image — hidden by default, toggled */}
                        <div>
                          <button
                            onClick={toggleProof}
                            className="flex items-center gap-1.5 text-xs text-primary-glow hover:text-primary transition-colors font-medium"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {isProofShown ? t("admin_hide_proof") : t("admin_view_proof")}
                          </button>
                          {isProofShown && (
                            <div className="mt-2">
                              <img
                                src={req.proof_image_url}
                                alt="Payment proof"
                                className="w-full max-h-64 object-contain rounded-xl border border-border/40 bg-black/20 cursor-zoom-in hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxUrl(req.proof_image_url)}
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">{t("admin_click_full")}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {req.status === "pending" && (
                          <div className="space-y-2">
                            <Input
                              placeholder={t("admin_reject_reason")}
                              value={rejectionReason[req.id] ?? ""}
                              onChange={(e) => setRejectionReason((r) => ({ ...r, [req.id]: e.target.value }))}
                              className="bg-background/50 text-xs h-8"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/40 hover:bg-[var(--success)]/30"
                                disabled={updatingEntryId === req.id}
                                onClick={() => handleEntryStatus(req, "approved")}
                              >
                                {t("admin_approve_entry")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 glass text-destructive border-destructive/30 hover:border-destructive/60"
                                disabled={updatingEntryId === req.id}
                                onClick={() => handleEntryStatus(req, "rejected")}
                              >
                                {t("admin_reject")}
                              </Button>
                            </div>
                          </div>
                        )}
                        {req.status === "rejected" && req.rejection_reason && (
                          <p className="text-xs text-destructive/80 italic">Reason: {req.rejection_reason}</p>
                        )}
                        {req.status !== "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="glass text-xs h-7"
                            disabled={updatingEntryId === req.id}
                            onClick={() => handleEntryStatus(req, "pending")}
                          >
                            {t("admin_reset_pending")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}

        {adminTab === "people" && (
        <>
        {/* User Management Section */}
        <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg">{t("admin_reg_users")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_reg_users_sub")}</p>
            </div>
            <Badge variant="outline">{registeredUsers} users</Badge>
          </div>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("admin_no_users")}</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {users.map((u: DbUser) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/10 px-3 py-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Phone</th>
                      <th className="pb-3 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: DbUser) => (
                      <tr key={u.id} className="border-t border-border/20 hover:bg-secondary/20 transition-smooth">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{u.phone ?? "—"}</td>
                        <td className="py-3 text-right text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Buyer Chat Conversations — WhatsApp style */}
        <div className="mt-6 rounded-2xl bg-gradient-card border border-border/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/40">
            <div>
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary-glow" /> {t("admin_messages")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_messages_sub")}</p>
            </div>
            <Badge variant="outline">{chatsList.length} {t("admin_conversations")}</Badge>
          </div>
          {chatsList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("admin_no_msgs")}</p>
          ) : (
            <div className="divide-y divide-border/20">
              {chatsList.map((convo) => {
                const key = `${convo.car_id}::${convo.buyer_email}`;
                const isExpanded = expandedChat === key;
                const hasUnread = convo.unread > 0;
                const displayName = convo.buyer_name || convo.buyer_email;
                const initial = displayName[0].toUpperCase();
                const avatarColors = ["bg-purple-600", "bg-blue-600", "bg-teal-600", "bg-orange-600", "bg-pink-600", "bg-indigo-600", "bg-green-700", "bg-rose-600"];
                const avatarColor = avatarColors[initial.charCodeAt(0) % avatarColors.length];
                const lastDate = new Date(convo.last_at);
                // Use the `now` state (null on SSR, set after hydration) to avoid hydration mismatch
                const diffH = now ? Math.floor((now - lastDate.getTime()) / 3_600_000) : 0;
                const timeStr = !now
                  ? ""
                  : diffH < 1
                  ? lastDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : diffH < 24 ? `${diffH}h`
                  : lastDate.toLocaleDateString([], { month: "short", day: "numeric" });
                return (
                  <div key={key}>
                    {/* Contact row */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/10 transition-smooth text-left"
                      onClick={() => setExpandedChat(isExpanded ? null : key)}
                    >
                      {/* Avatar with online dot if unread */}
                      <div className="relative shrink-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-bold text-white ${avatarColor}`}>
                          {initial}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -end-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${hasUnread ? "font-bold" : "font-medium"}`}>{displayName}</span>
                          <span className={`text-[10px] shrink-0 ${hasUnread ? "text-green-400 font-semibold" : "text-muted-foreground"}`}>{timeStr}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 mt-0.5 max-w-[140px] truncate">{convo.car_title}</Badge>
                        <p className={`text-xs mt-0.5 truncate ${hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>{convo.last_message}</p>
                      </div>
                      {/* Unread count OR chevron */}
                      {hasUnread ? (
                        <div className="h-5 min-w-5 px-1 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {convo.unread}
                        </div>
                      ) : (
                        isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {/* Expanded chat thread */}
                    {isExpanded && (
                      <div className="bg-[#07071a] border-t border-border/20">
                        {/* Messages */}
                        <div className="space-y-2 max-h-72 overflow-y-auto p-4">
                          {convo.messages.map((m) => (
                            <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${
                                m.sender_role === "admin"
                                  ? "bg-gradient-primary text-primary-foreground rounded-br-none"
                                  : "bg-secondary/60 border border-border/40 rounded-bl-none"
                              }`}>
                                {m.message}
                                <div className="text-[9px] mt-0.5 opacity-60 text-end">
                                  {m.sender_role === "admin" ? t("admin_you_admin") : convo.buyer_name}
                                  {" · "}{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Reply bar */}
                        <div className="flex gap-2 p-3 border-t border-border/20 bg-background/20">
                          <input
                            value={chatReplyText[key] ?? ""}
                            onChange={(e) => setChatReplyText((r) => ({ ...r, [key]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdminReply(convo); } }}
                            placeholder={t("admin_reply_ph")}
                            className="flex-1 bg-background/50 border border-border rounded-full px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                          />
                          <Button
                            size="sm"
                            className="bg-gradient-primary border-0 text-primary-foreground rounded-full w-9 h-9 p-0 shrink-0"
                            disabled={sendingReply === key || !chatReplyText[key]?.trim()}
                            onClick={() => handleAdminReply(convo)}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}

      </div>
      <Footer />

      {/* Proof Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-sm p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Payment proof"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 end-4 h-10 w-10 rounded-full glass border border-border/60 flex items-center justify-center hover:bg-secondary/60 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Full-screen Car Form Drawer */}
      {showForm && (
        <div
          className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${drawerVisible ? "opacity-100" : "opacity-0"}`}
          onClick={closeForm}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-2xl h-full bg-background border-l border-border/60 shadow-elegant flex flex-col transition-transform duration-300 ease-out ${drawerVisible ? "translate-x-0" : "translate-x-full"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="shrink-0 border-b border-border/40 px-6 py-4 flex items-center justify-between bg-background/95 backdrop-blur-sm">
              <div>
                <h2 className="font-display font-bold text-lg">{editingCar ? "Edit Car" : "Add New Car"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editingCar ? `Editing: ${editingCar.title}` : "Complete all sections for best results"}</p>
              </div>
              <button onClick={closeForm} className="h-8 w-8 rounded-full glass flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-border/40 bg-background/95 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    tab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ── BASIC INFO ── */}
              {tab === "basic" && (
                <>
                  <Section title="Identity">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Title *</Label>
                        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="McLaren GT Coupe 2022" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Brand *</Label>
                        <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="McLaren" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Model *</Label>
                        <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="GT" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Year *</Label>
                        <Input type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Trim / Edition</Label>
                        <Input value={form.trim ?? ""} onChange={(e) => set("trim", e.target.value || null)} placeholder="Sport, Black Pack…" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>VIN</Label>
                        <Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value || null)} placeholder="17-char VIN" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Plate Status</Label>
                        <select value={form.plate_status ?? "Clean"} onChange={(e) => set("plate_status", e.target.value)} className={sel()}>
                          {["Clean", "Salvage", "Rebuilt", "Export Only", "Unknown"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Volcano Orange" className="bg-background/50" />
                      </div>
                    </div>
                  </Section>

                  <Section title="Location & Dealer">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Dealership *</Label>
                        <Input value={form.dealership} onChange={(e) => set("dealership", e.target.value)} placeholder="Apex Motors Cairo" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>City *</Label>
                        <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cairo" className="bg-background/50" />
                      </div>
                    </div>
                  </Section>

                  <Section title="Pricing">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Base Price (EGP) *</Label>
                        <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Buy Now Price (EGP)</Label>
                        <Input type="number" value={form.buy_now_price ?? ""} onChange={(e) => set("buy_now_price", e.target.value ? Number(e.target.value) : null)} placeholder="Optional instant purchase" className="bg-background/50" />
                      </div>
                    </div>
                  </Section>

                  <Section title="Description">
                    <div>
                      <Label>Full Description</Label>
                      <textarea
                        value={form.description ?? ""}
                        onChange={(e) => set("description", e.target.value || null)}
                        rows={4}
                        placeholder="Detailed description of the vehicle…"
                        className={`${sel()} resize-none`}
                      />
                    </div>
                  </Section>

                  <Section title="Flags">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_new} onChange={(e) => set("is_new", e.target.checked)} className="accent-primary w-4 h-4 rounded" />
                        <span className="text-sm flex items-center gap-1"><CarIcon className="h-3.5 w-3.5 text-green-400" /> Brand new car (صفر كيلو)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-primary w-4 h-4 rounded" />
                        <span className="text-sm flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-400" /> Featured listing</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_live} onChange={(e) => set("is_live", e.target.checked)} className="accent-primary w-4 h-4 rounded" />
                        <span className="text-sm flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-[var(--live)]" /> Live auction</span>
                      </label>
                    </div>
                  </Section>
                </>
              )}

              {/* ── MECHANICAL ── */}
              {tab === "mechanical" && (
                <>
                  <Section title="Engine & Power">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Engine</Label>
                        <Input value={form.engine ?? ""} onChange={(e) => set("engine", e.target.value || null)} placeholder="4.0L Twin-Turbo V8" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Horsepower</Label>
                        <Input type="number" value={form.hp ?? ""} onChange={(e) => set("hp", e.target.value ? Number(e.target.value) : null)} placeholder="620" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Fuel Type</Label>
                        <select value={form.fuel} onChange={(e) => set("fuel", e.target.value)} className={sel()}>
                          {["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      {(form.fuel === "Electric" || form.fuel === "Hybrid" || form.fuel === "Plug-in Hybrid") && (
                        <div>
                          <Label>Battery Health (%)</Label>
                          <Input type="number" min={0} max={100} value={form.battery_health ?? ""} onChange={(e) => set("battery_health", e.target.value ? Number(e.target.value) : null)} placeholder="95" className="bg-background/50" />
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section title="Drivetrain & Specs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Transmission</Label>
                        <select value={form.transmission} onChange={(e) => set("transmission", e.target.value)} className={sel()}>
                          {["Automatic", "Manual", "CVT", "DCT", "PDK"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Drivetrain</Label>
                        <select value={form.drivetrain ?? "RWD"} onChange={(e) => set("drivetrain", e.target.value)} className={sel()}>
                          {["RWD", "FWD", "AWD", "4WD", "4x4"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Mileage (km)</Label>
                        <Input type="number" value={form.mileage} onChange={(e) => set("mileage", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Seats</Label>
                        <Input type="number" value={form.seats} onChange={(e) => set("seats", Number(e.target.value))} className="bg-background/50" />
                      </div>
                    </div>
                  </Section>
                </>
              )}

              {/* ── CONDITION ── */}
              {tab === "condition" && (() => {
                const setNote = (key: string, val: string) =>
                  set("condition_notes", { ...form.condition_notes, [key]: val });
                const noteInput = (key: string) => (
                  <input
                    value={form.condition_notes[key] ?? ""}
                    onChange={(e) => setNote(key, e.target.value)}
                    placeholder="ملاحظات... (اختياري)"
                    className={`${sel()} mt-1.5 text-xs`}
                  />
                );
                return (
                  <>
                    <Section title="الحالة العامة">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>درجة الحالة العامة</Label>
                          <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className={sel()}>
                            {["Excellent", "Very Good", "Good", "Fair", "Poor"].map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("overall")}
                        </div>
                        <div>
                          <Label>سجل الصيانة</Label>
                          <select value={form.service_history ?? "Full"} onChange={(e) => set("service_history", e.target.value)} className={sel()}>
                            {["Full", "Partial", "Dealer Serviced", "Owner Serviced", "None", "Unknown"].map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("service")}
                        </div>
                        <div>
                          <Label>عدد الملاك السابقين</Label>
                          <Input type="number" min={0} value={form.previous_owners ?? ""} onChange={(e) => set("previous_owners", e.target.value ? Number(e.target.value) : null)} placeholder="1" className="bg-background/50" />
                        </div>
                        <div>
                          <Label>الرخصة سارية حتى</Label>
                          <Input type="date" value={form.license_expiry ?? ""} onChange={(e) => set("license_expiry", e.target.value || null)} className="bg-background/50" />
                        </div>
                      </div>
                    </Section>

                    <Section title="حالة المكونات">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>حالة الموتور</Label>
                          <select value={form.engine_condition ?? ""} onChange={(e) => set("engine_condition", e.target.value || null)} className={sel()}>
                            <option value="">— غير محدد —</option>
                            {CONDITION_GRADES.map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("engine")}
                        </div>
                        <div>
                          <Label>حالة الفتيس</Label>
                          <select value={form.transmission_condition ?? ""} onChange={(e) => set("transmission_condition", e.target.value || null)} className={sel()}>
                            <option value="">— غير محدد —</option>
                            {CONDITION_GRADES.map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("transmission")}
                        </div>
                        <div>
                          <Label>حالة العفشة</Label>
                          <select value={form.suspension_condition ?? ""} onChange={(e) => set("suspension_condition", e.target.value || null)} className={sel()}>
                            <option value="">— غير محدد —</option>
                            {CONDITION_GRADES.map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("suspension")}
                        </div>
                        <div>
                          <Label>حالة البطارية</Label>
                          <select value={form.battery_condition ?? ""} onChange={(e) => set("battery_condition", e.target.value || null)} className={sel()}>
                            <option value="">— غير محدد —</option>
                            {CONDITION_GRADES.map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("battery")}
                        </div>
                        <div>
                          <Label>حالة الإطارات</Label>
                          <select value={form.tire_condition ?? "Good"} onChange={(e) => set("tire_condition", e.target.value)} className={sel()}>
                            {["New", "Like New", "Good", "Worn", "Replace"].map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("tires")}
                        </div>
                        <div>
                          <Label>حالة الشاسيه</Label>
                          <select value={form.chassis_condition ?? ""} onChange={(e) => set("chassis_condition", e.target.value || null)} className={sel()}>
                            <option value="">— غير محدد —</option>
                            {CONDITION_GRADES.map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("chassis")}
                        </div>
                        <div>
                          <Label>حالة الصالون</Label>
                          <select value={form.interior_condition ?? ""} onChange={(e) => set("interior_condition", e.target.value || null)} className={sel()}>
                            <option value="">— غير محدد —</option>
                            {CONDITION_GRADES.map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("interior")}
                        </div>
                        <div>
                          <Label>هل السيارة رشة؟</Label>
                          <select value={form.paint_condition ?? "Original"} onChange={(e) => set("paint_condition", e.target.value)} className={sel()}>
                            {["Original", "Repainted Partial", "Full Repaint", "Matte Wrap", "Unknown"].map((v) => <option key={v}>{v}</option>)}
                          </select>
                          {noteInput("paint")}
                        </div>
                        <div>
                          <Label>هل يوجد حوادث سابقة؟</Label>
                          <select value={form.accident_history ? "Yes" : "No"} onChange={(e) => set("accident_history", e.target.value === "Yes")} className={sel()}>
                            <option>No</option>
                            <option>Yes</option>
                          </select>
                          {noteInput("accident")}
                        </div>
                      </div>

                      {form.accident_history && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
                          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-300">تاريخ الحوادث مُفصح عنه وسيظهر في الإعلان.</p>
                        </div>
                      )}
                    </Section>
                  </>
                );
              })()}

              {/* ── OPTIONS ── */}
              {tab === "options" && (() => {
                const predefinedKeys = new Set(CAR_OPTIONS_LIST.map((o) => o.key));
                const customOptions = form.car_options.filter((k) => !predefinedKeys.has(k));
                const addCustomOption = () => {
                  const val = customOptionInput.trim();
                  if (!val || form.car_options.includes(val)) return;
                  set("car_options", [...form.car_options, val]);
                  setCustomOptionInput("");
                };
                return (
                  <>
                    <Section title="المواصفات الإضافية المعروفة">
                      <p className="text-xs text-muted-foreground -mt-1">اختر كل ما ينطبق على السيارة.</p>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {CAR_OPTIONS_LIST.map((opt) => {
                          const checked = form.car_options.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                                checked
                                  ? "border-primary/60 bg-primary/10"
                                  : "border-border/40 hover:border-primary/30"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? form.car_options.filter((k) => k !== opt.key)
                                    : [...form.car_options, opt.key];
                                  set("car_options", next);
                                }}
                                className="accent-primary w-4 h-4 shrink-0"
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </Section>

                    <Section title="مواصفات مخصصة">
                      <p className="text-xs text-muted-foreground -mt-1">أضف أي مواصفة إضافية غير موجودة في القائمة.</p>
                      <div className="flex gap-2 mt-2">
                        <input
                          value={customOptionInput}
                          onChange={(e) => setCustomOptionInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCustomOption()}
                          placeholder="مثال: فتحة بانوراما، شاشة هيد-أب…"
                          className={`${sel()} flex-1`}
                        />
                        <Button
                          variant="outline"
                          className="glass shrink-0"
                          onClick={addCustomOption}
                          type="button"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {customOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {customOptions.map((opt) => (
                            <span
                              key={opt}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-sm"
                            >
                              {opt}
                              <button
                                type="button"
                                onClick={() => set("car_options", form.car_options.filter((k) => k !== opt))}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </Section>
                  </>
                );
              })()}

              {/* ── MEDIA ── */}
              {tab === "media" && (
                <>
                  <Section title="Primary Image">
                    <div>
                      <Label>Main Image URL or Upload</Label>
                      <div className="flex gap-2">
                        <Input value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} placeholder="https://..." className="bg-background/50 flex-1" />
                        <Button
                          type="button"
                          variant="outline"
                          className="glass shrink-0"
                          disabled={uploadingImage}
                          onClick={() => mainImgRef.current?.click()}
                          title="Upload from file"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <input
                          ref={mainImgRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUpload(e.target.files?.[0], "primary")}
                        />
                      </div>
                      {form.image_url && (
                        <img src={form.image_url} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-lg border border-border/40" />
                      )}
                    </div>
                  </Section>

                  <Section title="Image Gallery">
                    <div className="flex gap-2">
                      <Input
                        value={mediaInput.image}
                        onChange={(e) => setMediaInput((m) => ({ ...m, image: e.target.value }))}
                        placeholder="Image URL…"
                        className="bg-background/50 flex-1"
                        onKeyDown={(e) => e.key === "Enter" && addMedia("image")}
                      />
                      <Button variant="outline" className="glass shrink-0" onClick={() => addMedia("image")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="glass shrink-0"
                        disabled={uploadingImage}
                        onClick={() => galleryImgRef.current?.click()}
                        title="Upload from file"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <input
                        ref={galleryImgRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files?.[0], "gallery")}
                      />
                    </div>
                    {mediaInput.image && (
                      <div className="mt-2 relative rounded-lg overflow-hidden border border-primary/40 border-dashed">
                        <img
                          src={mediaInput.image}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                        />
                        <div className="absolute bottom-1 start-2 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full">Preview — press + to add</div>
                      </div>
                    )}
                    {form.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {form.images.map((url, i) => (
                          <GalleryThumb key={i} url={url} onRemove={() => removeMedia("images", i)} />
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section title="Videos">
                    <div className="flex gap-2">
                      <Input
                        value={mediaInput.video}
                        onChange={(e) => setMediaInput((m) => ({ ...m, video: e.target.value }))}
                        placeholder="YouTube / video URL…"
                        className="bg-background/50 flex-1"
                        onKeyDown={(e) => e.key === "Enter" && addMedia("video")}
                      />
                      <Button variant="outline" className="glass shrink-0" onClick={() => addMedia("video")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.videos.map((url, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 mt-1.5 px-3 py-2 rounded-lg bg-secondary/20 border border-border/30">
                        <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate flex-1">{url}</span>
                        <button onClick={() => removeMedia("videos", i)} className="text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </Section>

                  <Section title="PDF Documents">
                    <div className="flex gap-2">
                      <Input
                        value={mediaInput.doc}
                        onChange={(e) => setMediaInput((m) => ({ ...m, doc: e.target.value }))}
                        placeholder="PDF URL (inspection report, service record…)"
                        className="bg-background/50 flex-1"
                        onKeyDown={(e) => e.key === "Enter" && addMedia("doc")}
                      />
                      <Button variant="outline" className="glass shrink-0" onClick={() => addMedia("doc")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.documents.map((url, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 mt-1.5 px-3 py-2 rounded-lg bg-secondary/20 border border-border/30">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate flex-1">{url}</span>
                        <button onClick={() => removeMedia("documents", i)} className="text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </Section>
                </>
              )}

              {/* ── AUCTION ── */}
              {tab === "auction" && (
                <>
                  <Section title="Auction Pricing">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Starting Bid (EGP)</Label>
                        <Input type="number" value={form.starting_price ?? ""} onChange={(e) => set("starting_price", e.target.value ? Number(e.target.value) : null)} placeholder="Opening bid amount" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Current Bid (EGP)</Label>
                        <Input type="number" value={form.current_bid ?? ""} onChange={(e) => set("current_bid", e.target.value ? Number(e.target.value) : null)} placeholder="Leave blank = use starting" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Minimum Raise (EGP)</Label>
                        <Input type="number" value={form.min_raise} onChange={(e) => set("min_raise", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Reserve Price (EGP)</Label>
                        <Input type="number" value={form.reserve_price ?? ""} onChange={(e) => set("reserve_price", e.target.value ? Number(e.target.value) : null)} placeholder="Min. price to sell" className="bg-background/50" />
                      </div>
                      <div>
                        <Label>Buy Now Price (EGP)</Label>
                        <Input type="number" value={form.buy_now_price ?? ""} onChange={(e) => set("buy_now_price", e.target.value ? Number(e.target.value) : null)} placeholder="Instant purchase price" className="bg-background/50" />
                      </div>
                    </div>
                    {form.reserve_price && (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 mt-2">
                        <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-300">Reserve price is hidden from bidders. The car will only sell if bids reach this amount.</p>
                      </div>
                    )}
                  </Section>

                  <Section title="Auction End Time">
                    <div>
                      <Label>End Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={endsAtDisplay}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="bg-background/50"
                      />
                      {form.ends_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ends {new Date(form.ends_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                          {now && form.ends_at > now
                            ? ` — in ${Math.round((form.ends_at - now) / 60000)} minutes`
                            : " — ALREADY ENDED"}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Quick Timers</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {[
                          { label: "15 min", val: 15 },
                          { label: "30 min", val: 30 },
                          { label: "1 hour", val: 60 },
                          { label: "2 hours", val: 120 },
                          { label: "6 hours", val: 360 },
                          { label: "12 hours", val: 720 },
                          { label: "24 hours", val: 1440 },
                          { label: "3 days", val: 4320 },
                          { label: "7 days", val: 10080 },
                        ].map(({ label, val }) => (
                          <button
                            key={val}
                            onClick={() => setQuickTimer(val)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium glass border border-border/40 hover:border-primary/50 hover:text-primary transition-colors"
                          >
                            <Clock className="h-3 w-3 inline mr-1" />
                            {label}
                          </button>
                        ))}
                        <button
                          onClick={() => set("ends_at", null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium glass border border-border/40 hover:border-destructive/50 hover:text-destructive transition-colors"
                        >
                          <RotateCcw className="h-3 w-3 inline mr-1" />
                          Clear
                        </button>
                      </div>
                    </div>
                  </Section>

                  <Section title="Auction Status">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-border/40 cursor-pointer hover:border-primary/40 transition-colors">
                        <input type="checkbox" checked={form.is_live} onChange={(e) => set("is_live", e.target.checked)} className="accent-primary w-4 h-4" />
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-[var(--live)]" /> Go Live</div>
                          <div className="text-xs text-muted-foreground">Open for bidding now</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-border/40 cursor-pointer hover:border-primary/40 transition-colors">
                        <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-primary w-4 h-4" />
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-yellow-400" /> Boost Listing</div>
                          <div className="text-xs text-muted-foreground">Show on homepage hero</div>
                        </div>
                      </label>
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* Drawer footer */}
            <div className="shrink-0 border-t border-border/40 px-6 py-4 flex items-center justify-between gap-3 bg-background/95">
              <div className="flex gap-1">
                {TABS.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`h-1.5 rounded-full transition-all ${tab === t.id ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="glass" onClick={closeForm}>Cancel</Button>
                <Button className="bg-gradient-primary border-0 text-primary-foreground min-w-[100px]" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : editingCar ? "Save Changes" : "Add Car"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Go Live Modal ── */}
      {goLiveTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="go-live-title"
          onKeyDown={(e) => { if (e.key === "Escape") setGoLiveTarget(null); }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setGoLiveTarget(null)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl glass-strong border border-border/60 shadow-elegant p-6 animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-xl bg-[var(--live)]/15 border border-[var(--live)]/30 flex items-center justify-center shrink-0">
                <Radio className="h-4 w-4 text-[var(--live)]" />
              </div>
              <div>
                <h3 id="go-live-title" className="font-display font-semibold text-base">Go Live</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{goLiveTarget.title}</p>
              </div>
              <button
                aria-label="Close"
                className="ml-auto p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors"
                onClick={() => setGoLiveTarget(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* End date/time picker */}
            <div className="space-y-3 mb-5">
              <div>
                <label htmlFor="go-live-ends-at" className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Auction End Date &amp; Time
                </label>
                <input
                  id="go-live-ends-at"
                  type="datetime-local"
                  value={goLiveEndsAt}
                  onChange={(e) => setGoLiveEndsAt(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                />
                {goLiveEndsAt && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Ends <span className="text-foreground font-medium">
                      {new Date(goLiveEndsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </p>
                )}
              </div>

              {/* Quick presets */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Quick Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "1h", minutes: 60 },
                    { label: "3h", minutes: 180 },
                    { label: "6h", minutes: 360 },
                    { label: "12h", minutes: 720 },
                    { label: "24h", minutes: 1440 },
                    { label: "3d", minutes: 4320 },
                    { label: "7d", minutes: 10080 },
                  ].map(({ label, minutes }) => (
                    <button
                      key={label}
                      onClick={() => setGoLiveEndsAt(toLocalDT(Date.now() + minutes * 60 * 1000))}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium glass border border-border/40 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Clock className="h-3 w-3 inline mr-1" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="glass flex-1" onClick={() => setGoLiveTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[var(--live)] hover:bg-[var(--live)]/90 border-0 text-white gap-1.5"
                onClick={handleConfirmGoLive}
                disabled={!goLiveEndsAt || goLiveConfirming}
              >
                <Radio className="h-3.5 w-3.5" />
                {goLiveConfirming ? "Going Live…" : "Go Live"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
