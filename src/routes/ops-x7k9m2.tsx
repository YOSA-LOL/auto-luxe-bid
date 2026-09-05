import React, { useState, useEffect, useRef, useMemo } from "react";
import { createFileRoute, Link, useRouter, useNavigate, redirect } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  getLiveCarsFromDb, createCar, updateCar, deleteCar, markCarAsSold, markCarAsUnsold, resolveExpiredCar,
  markExpiredAuctions,
  type DbCar, type CarInput,
} from "@/lib/cars.server";
import { getUser } from "@/lib/auth.server";
import { resolveClientIsAdmin } from "@/lib/admin-access";
import { getAdminChats, type ChatConversation } from "@/lib/chat.server";
import {
  getAuctionDepositSettings,
  getHeroCarPin, setHeroCarPin,
  type DepositSettings,
} from "@/lib/auction-entry.server";
import { uploadImage, uploadDocument } from "@/lib/upload.server";
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
  Timer, RotateCcw, Upload, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage, type TranslationKey } from "@/lib/language";

import { brandPageTitle, BRAND_NAME } from "@/lib/brand";
import { useChatWebSocket } from "@/lib/use-chat-ws";
import { getMergedAdminEmailsForLoader, getWeeklyRevenueStats, getFinancialSummary, recordAdminActivity, type WeeklyRevenuePoint, type FinancialSummary } from "@/lib/admin.server";
import { fileToUploadDataUrl } from "@/lib/compress-image";
import {
  AdminBidsPanel, AdminActivityPanel,
  AdminSettingsPanel, AdminFinancialPanel, AdminExpensesPanel, AdminRefundsPanel,
} from "@/components/admin/AdminExtraPanels";
import { AdminCarsSection } from "@/components/admin/AdminCarsSection";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { AdminEntryRequestsSection } from "@/components/admin/AdminEntryRequestsSection";
import { AdminBrandBreakdown, useAdminDashboardCounts } from "@/components/admin/AdminOverviewWidgets";
import { exportAdminInventoryCsv, queryAdminCarOptions, type AdminCarOption } from "@/lib/admin-tables.server";
import type { ChatMessage } from "@/lib/chat.server";

export const Route = createFileRoute("/ops-x7k9m2")({
  head: () => ({ meta: [{ title: brandPageTitle("Admin") }] }),
  loader: async ({ context }) => {
    // Resolve admin status — server is the authoritative source when Clerk keys
    // are correctly configured. When getUser() returns null (Clerk passthrough /
    // key-mismatch mode), we allow the page through so the client-side Clerk
    // check can gate access using adminEmails (from ADMIN_EMAIL env var).
    const user = context.user ?? await getUser();
    if (user && !user.isAdmin) throw redirect({ to: "/" });
    const isAdmin = user?.isAdmin ?? false;

    await markExpiredAuctions();
    const mergedAdminEmails = await getMergedAdminEmailsForLoader().catch(() => [] as string[]);
    const weeklyRevenue = isAdmin
      ? await getWeeklyRevenueStats().catch(() => [] as WeeklyRevenuePoint[])
      : [];
    const financialSummary = isAdmin
      ? await getFinancialSummary().catch(() => null)
      : null;
    const [live, depositSettings, chats, heroCarPin] = await Promise.all([
      getLiveCarsFromDb(),
      getAuctionDepositSettings(),
      getAdminChats(), getHeroCarPin(),
    ]);
    return { live, depositSettings, chats, isAdmin, adminEmails: mergedAdminEmails, heroCarPin, weeklyRevenue, financialSummary };
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
  city: "", hp: null, engine: null, vin: null,
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
type AdminSectionTab = "overview" | "cars" | "bids" | "requests" | "people" | "settings" | "expenses";

const TABS: { id: Tab; labelKey: TranslationKey; icon: React.ElementType }[] = [
  { id: "basic", labelKey: "admin_form_tab_basic", icon: CarIcon },
  { id: "mechanical", labelKey: "admin_form_tab_mechanical", icon: Wrench },
  { id: "condition", labelKey: "admin_form_tab_condition", icon: Shield },
  { id: "options", labelKey: "admin_form_tab_options", icon: Zap },
  { id: "media", labelKey: "admin_form_tab_media", icon: ImagePlus },
  { id: "auction", labelKey: "admin_form_tab_auction", icon: Gavel },
];

function sel(className = "") {
  return `w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors ${className}`;
}

function Label({ children, tKey }: { children?: React.ReactNode; tKey?: TranslationKey }) {
  const { t } = useLanguage();
  return <label className="text-xs text-muted-foreground mb-1 block font-medium">{tKey ? t(tKey) : children}</label>;
}

function Section({ title, tKey, children }: { title?: string; tKey?: TranslationKey; children: React.ReactNode }) {
  const { t } = useLanguage();
  const heading = tKey ? t(tKey) : (title ?? "");
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.15em] text-primary-glow font-bold border-b border-border/40 pb-2">{heading}</h3>
      {children}
    </div>
  );
}

function GalleryThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const [broken, setBroken] = useState(false);
  const { t } = useLanguage();
  return (
    <div className="relative group">
      {broken ? (
        <div className="w-full h-24 rounded-lg border border-border/40 flex items-center justify-center text-xs text-muted-foreground bg-secondary/30">
          {t("admin_no_image")}
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
  const { live, depositSettings: initialDepositSettings, chats: initialChats, isAdmin: serverIsAdmin, adminEmails, heroCarPin: initialHeroCarPin, weeklyRevenue, financialSummary } = Route.useLoaderData();
  const { user: clerkUser, isLoaded } = useUser();
  const navigate = useNavigate();
  const router = useRouter();
  const { t, lang } = useLanguage();

  // Admin only if email is listed in ADMIN_EMAIL (.env). Server is authoritative when available.
  const isAdmin =
    serverIsAdmin ||
    resolveClientIsAdmin(clerkUser, undefined, adminEmails);

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
  const [tab, setTab] = useState<Tab>("basic");
  const [adminTab, setAdminTab] = useState<AdminSectionTab>("overview");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [tableRefresh, setTableRefresh] = useState(0);
  const bumpTableRefresh = () => setTableRefresh((n) => n + 1);
  const [mediaInput, setMediaInput] = useState({ image: "", video: "" });
  const [customOptionInput, setCustomOptionInput] = useState("");

  const [now, setNow] = useState<number | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const mainImgRef = useRef<HTMLInputElement>(null);
  const galleryImgRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File | undefined, target: "primary" | "gallery") => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileData = await fileToUploadDataUrl(file);
      const { url } = await uploadImage({ data: { fileData, fileName: file.name } });
      if (target === "primary") {
        set("image_url", url);
      } else {
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
      toast.success(t("toast_img_upload_ok"));
    } catch (err) {
      console.error("[upload]", err);
      toast.error(err instanceof Error ? err.message : t("toast_img_upload_fail"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMarkSold = async (car: DbCar) => {
    try {
      await markCarAsSold({ data: { id: car.id, salePrice: car.current_bid ?? car.price } });
      await recordAdminActivity({ data: { action: "mark_sold", entityType: "car", entityId: car.id, details: car.title } }).catch(() => {});
      toast.success(t("admin_mark_sold_ok"));
      router.invalidate();
      bumpTableRefresh();
    } catch {
      toast.error(t("toast_save_fail"));
    }
  };

  const handleMarkUnsold = async (car: DbCar) => {
    try {
      await markCarAsUnsold({ data: { id: car.id, status: "none" } });
      await recordAdminActivity({ data: { action: "mark_unsold", entityType: "car", entityId: car.id, details: car.title } }).catch(() => {});
      toast.success(t("admin_mark_unsold_ok"));
      router.invalidate();
      bumpTableRefresh();
    } catch {
      toast.error(t("toast_save_fail"));
    }
  };

  const handleContactWinner = (car: DbCar) => {
    if (!car.winner_email) {
      toast.error(t("admin_no_winner"));
      return;
    }
    void recordAdminActivity({
      data: { action: "contact_winner", entityType: "car", entityId: car.id, details: car.winner_email },
    }).catch(() => {});
    navigate({ to: "/ops-x7k9m2/chat", search: { car: car.id, buyer: car.winner_email } });
  };

  const handleMarkNoSale = async (car: DbCar) => {
    try {
      await markCarAsUnsold({ data: { id: car.id, status: "no_sale" } });
      await recordAdminActivity({ data: { action: "mark_no_sale", entityType: "car", entityId: car.id, details: car.title } }).catch(() => {});
      toast.success(t("admin_mark_no_sale_ok"));
      router.invalidate();
      bumpTableRefresh();
    } catch {
      toast.error(t("toast_save_fail"));
    }
  };

  const handleResolveExpired = async (car: DbCar) => {
    try {
      await resolveExpiredCar({ data: car.id });
      toast.success(t("admin_resolve_ok"));
      router.invalidate();
      bumpTableRefresh();
    } catch {
      toast.error(t("toast_save_fail"));
    }
  };

  const handleRelist = (car: DbCar) => {
    void updateCar({ data: { id: car.id, auction_status: "none", ends_at: null as unknown as number } }).then(() => {
      handleToggleLive(car as DbCar & { bids_count: number });
    }).catch(() => toast.error(t("toast_save_fail")));
  };

  const handleToggleVisibility = async (car: DbCar) => {
    const hidden = car.is_visible === false || car.is_visible === 0;
    try {
      await updateCar({ data: { id: car.id, is_visible: hidden } });
      toast.success(hidden ? t("admin_visibility_shown_ok") : t("admin_visibility_hidden_ok"));
      router.invalidate();
      bumpTableRefresh();
    } catch {
      toast.error(t("toast_update_fail"));
    }
  };

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
      const t = requestAnimationFrame(() => setDrawerVisible(true));
      return () => {
        cancelAnimationFrame(t);
        document.body.style.overflow = "";
      };
    } else {
      setDrawerVisible(false);
      document.body.style.overflow = "";
    }
  }, [showForm]);

  const closeForm = () => {
    setDrawerVisible(false);
    setTimeout(() => setShowForm(false), 320);
  };

  const [chatsList, setChatsList] = useState<ChatConversation[]>(initialChats);

  // Go Live modal
  const [goLiveTarget, setGoLiveTarget] = useState<DbCar | null>(null);
  const [goLiveEndsAt, setGoLiveEndsAt] = useState("");
  const [goLiveConfirming, setGoLiveConfirming] = useState(false);

  // Hero Spotlight
  const [heroPinId, setHeroPinId] = useState<string>(initialHeroCarPin ?? "");
  const [savingHeroPin, setSavingHeroPin] = useState(false);

  const handleSaveHeroPin = async (carId: string | null) => {
    setSavingHeroPin(true);
    try {
      await setHeroCarPin({ data: { carId } });
      setHeroPinId(carId ?? "");
      toast.success(carId ? t("toast_hero_updated") : t("toast_hero_auto"));
      router.invalidate();
    } catch {
      toast.error(t("toast_hero_fail"));
    } finally {
      setSavingHeroPin(false);
    }
  };

  useChatWebSocket({
    enabled: isAdmin && adminTab === "people",
    role: "admin",
    onMessage: (msg: ChatMessage) => {
      setChatsList((prev) => {
        const idx = prev.findIndex(
          (c) => c.car_id === msg.car_id && c.buyer_email === msg.buyer_email,
        );
        if (idx === -1) return prev;
        const updated = [...prev];
        const convo = updated[idx];
        if (convo.messages.some((m) => m.id === msg.id)) return prev;
        updated[idx] = {
          ...convo,
          messages: [...convo.messages, msg],
          last_message: msg.message,
          last_at: msg.created_at,
        };
        return updated;
      });
    },
  });

  const { counts: dashboardCounts } = useAdminDashboardCounts();

  const [carPickerList, setCarPickerList] = useState<AdminCarOption[]>([]);
  const [carPickerLoading, setCarPickerLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin || (adminTab !== "cars" && adminTab !== "bids")) return;
    let cancelled = false;
    setCarPickerLoading(true);
    queryAdminCarOptions()
      .then((rows) => { if (!cancelled) setCarPickerList(rows); })
      .catch(() => { if (!cancelled) setCarPickerList([]); })
      .finally(() => { if (!cancelled) setCarPickerLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin, adminTab, tableRefresh]);

  const totalCars = dashboardCounts?.totalCars ?? 0;
  const liveCars = dashboardCounts?.liveCars ?? live.length;
  const revenueBars = weeklyRevenue.length > 0 ? weeklyRevenue : [{ label: "—", revenue: 0, bids: 0 }];
  const maxRevenue = Math.max(...revenueBars.map((p) => p.revenue), 1);
  const carOptions = useMemo(
    () => carPickerList.map((c) => ({ id: c.id, title: c.title })),
    [carPickerList],
  );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleExport = async () => {
    try {
      const csv = await exportAdminInventoryCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "elitedrive-inventory.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success(t("toast_csv_exported"));
    } catch {
      toast.error(t("toast_save_fail"));
    }
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
      city: car.city,
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
    if (!form.title || !form.brand || !form.model || !form.city) {
      toast.error(t("toast_fill_required"));
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
        await recordAdminActivity({ data: { action: "update_car", entityType: "car", entityId: id, details: form.title } }).catch(() => {});
        toast.success(t("toast_car_updated", { title: form.title }));
      } else {
        await createCar({ data: payload });
        await recordAdminActivity({ data: { action: "create_car", entityType: "car", entityId: id, details: form.title } }).catch(() => {});
        toast.success(t("toast_car_added", { title: form.title }));
      }
      closeForm();
      router.invalidate();
      bumpTableRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toast_save_fail"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteCar({ data: id });
      await recordAdminActivity({ data: { action: "delete_car", entityType: "car", entityId: id, details: title } }).catch(() => {});
      toast.success(t("toast_car_deleted", { title }));
      setDeleteConfirm(null);
      router.invalidate();
      bumpTableRefresh();
    } catch { toast.error(t("toast_delete_fail")); }
  };

  /** Convert a timestamp to the 'YYYY-MM-DDThh:mm' format that datetime-local expects (local time, not UTC). */
  const toLocalDT = (ms: number) => {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleToggleLive = (car: DbCar) => {
    if (car.is_sold) {
      toast.error(t("admin_sold_live_block"));
      return;
    }
    if (car.is_live) {
      // Unlist directly — no modal needed
      updateCar({ data: { id: car.id, is_live: false } })
        .then(() => { toast.success(t("toast_car_unlisted", { title: car.title })); router.invalidate(); bumpTableRefresh(); })
        .catch(() => toast.error(t("toast_update_fail")));
    } else {
      // Open end-time modal before going live (default: 24h from now, local time)
      setGoLiveEndsAt(toLocalDT(Date.now() + 24 * 60 * 60 * 1000));
      setGoLiveTarget(car);
    }
  };

  const handleConfirmGoLive = async () => {
    if (!goLiveTarget || goLiveConfirming) return;
    const endsAt = goLiveEndsAt ? new Date(goLiveEndsAt).getTime() : null;
    if (!endsAt || isNaN(endsAt)) { toast.error(t("toast_valid_end")); return; }
    if (endsAt <= Date.now()) { toast.error(t("toast_end_future")); return; }
    setGoLiveConfirming(true);
    try {
      await updateCar({ data: { id: goLiveTarget.id, is_live: true, ends_at: endsAt } });
      toast.success(t("toast_now_live", { title: goLiveTarget.title }));
      setGoLiveTarget(null);
      router.invalidate();
      bumpTableRefresh();
    } catch { toast.error(t("toast_go_live_fail")); }
    finally { setGoLiveConfirming(false); }
  };

  const handleToggleFeatured = async (car: DbCar) => {
    try {
      await updateCar({ data: { id: car.id, featured: !car.featured } });
      toast.success(!car.featured ? t("toast_featured", { title: car.title }) : t("toast_unfeatured", { title: car.title }));
      router.invalidate();
      bumpTableRefresh();
    } catch { toast.error(t("toast_update_fail")); }
  };

  const endsAtDisplay = form.ends_at
    ? new Date(form.ends_at).toISOString().slice(0, 16)
    : "";

  const setEndsAt = (val: string) => {
    set("ends_at", val ? new Date(val).getTime() : null);
  };

  const setQuickTimer = (minutes: number) => {
    set("ends_at", Date.now() + minutes * 60 * 1000);
    toast.success(t("toast_auction_end_set", {
      duration: minutes < 60 ? t("toast_duration_minutes", { n: minutes }) : t("toast_duration_hours", { n: minutes / 60 }),
    }));
  };

  const handleUploadPdf = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(t("admin_pdf_upload_fail"));
      return;
    }
    setUploadingPdf(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const { url } = await uploadDocument({ data: { fileData: ev.target?.result as string, fileName: file.name } });
        setForm((f) => ({ ...f, documents: [...f.documents, url] }));
        toast.success(t("admin_pdf_upload_ok"));
      } catch {
        toast.error(t("admin_pdf_upload_fail"));
      } finally {
        setUploadingPdf(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addMedia = (type: "image" | "video") => {
    const url = mediaInput[type].trim();
    if (!url) return;
    if (type === "image") {
      set("images", [...form.images, url]);
      if (!form.image_url) set("image_url", url);
    } else set("videos", [...form.videos, url]);
    setMediaInput((m) => ({ ...m, [type]: "" }));
  };

  const removeMedia = (type: "images" | "videos" | "documents", idx: number) => {
    const arr = [...(form[type] as string[])];
    arr.splice(idx, 1);
    set(type, arr);
  };

  const soldCount = dashboardCounts?.soldCars ?? 0;
  const soldValue = financialSummary?.soldRevenue ?? 0;
  const registeredUsers = dashboardCounts?.totalUsers ?? 0;

  const stats = [
    { icon: DollarSign, l: t("admin_stat_sold_val"), v: `EGP ${(soldValue / 1_000_000).toFixed(1)}M`, d: `${soldCount} sold`, color: "text-green-400" },
    { icon: Gavel, l: t("admin_stat_live"), v: liveCars.toString(), d: `${liveCars} active`, color: "text-[var(--live)]" },
    { icon: CarIcon, l: t("admin_stat_cars"), v: formatNumber(totalCars), d: `${totalCars} listed`, color: "text-primary-glow" },
    { icon: Users, l: t("admin_stat_users"), v: registeredUsers.toString(), d: "all time", color: "text-yellow-400" },
  ];

  const pendingRequestsCount = dashboardCounts?.pendingEntries ?? 0;
  const unreadChatCount = chatsList.reduce((sum, c) => sum + c.unread, 0);

  const adminTabs = [
    { id: "overview" as const, label: t("admin_tab_overview"), icon: Activity },
    { id: "cars" as const, label: t("admin_tab_cars"), icon: CarIcon },
    { id: "bids" as const, label: t("admin_tab_bids"), icon: Gavel },
    { id: "expenses" as const, label: t("admin_tab_expenses"), icon: DollarSign },
    { id: "requests" as const, label: t("admin_tab_requests"), icon: FileText, badge: pendingRequestsCount },
    { id: "people" as const, label: t("admin_tab_people"), icon: Users, badge: unreadChatCount },
    { id: "settings" as const, label: t("admin_tab_settings"), icon: Shield },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen pb-nav">
        <Header />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav" onClick={() => setDeleteConfirm(null)}>
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
        {financialSummary && <AdminFinancialPanel summary={financialSummary} />}
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
              {revenueBars.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-primary opacity-80 hover:opacity-100 transition-smooth cursor-pointer"
                    style={{ height: `${Math.max(4, (b.revenue / maxRevenue) * 100)}%`, boxShadow: "var(--shadow-glow)" }}
                    title={`EGP ${b.revenue.toLocaleString()}`}
                    onClick={() => toast.info(`${b.label}: EGP ${b.revenue.toLocaleString()} · ${b.bids} bids`)}
                  />
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{b.label}</span>
                </div>
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
        <div className="mt-6">
          <AdminBrandBreakdown />
        </div>
        <AdminActivityPanel />
        </>
        )}

        {adminTab === "cars" && (
        <AdminCarsSection
          now={now}
          refreshKey={tableRefresh}
          heroPinId={heroPinId}
          setHeroPinId={setHeroPinId}
          carPickerList={carPickerList}
          carPickerLoading={carPickerLoading}
          savingHeroPin={savingHeroPin}
          onSaveHeroPin={handleSaveHeroPin}
          onToggleLive={handleToggleLive}
          onMarkSold={handleMarkSold}
          onMarkUnsold={handleMarkUnsold}
          onContactWinner={handleContactWinner}
          onMarkNoSale={handleMarkNoSale}
          onResolveExpired={handleResolveExpired}
          onRelist={handleRelist}
          onToggleVisibility={handleToggleVisibility}
          onToggleFeatured={handleToggleFeatured}
          onEdit={openEdit}
          onDeleteRequest={setDeleteConfirm}
          deleteConfirmId={deleteConfirm}
          onDeleteConfirm={handleDelete}
          onDeleteCancel={() => setDeleteConfirm(null)}
        />
        )}

        {adminTab === "bids" && (
          <div className="min-h-[calc(100vh-14rem)]">
            <AdminBidsPanel carOptions={carOptions} />
          </div>
        )}

        {adminTab === "expenses" && (
          <div className="min-h-[calc(100vh-14rem)] space-y-4">
            <AdminExpensesPanel />
            <AdminRefundsPanel />
          </div>
        )}

        {adminTab === "settings" && (
          <AdminSettingsPanel />
        )}

        {adminTab === "requests" && (
          <>
            <AdminEntryRequestsSection initialDepositSettings={initialDepositSettings} />
            <AdminRefundsPanel />
          </>
        )}

        {adminTab === "people" && (
        <>
        <AdminUsersSection />

        {/* Buyer Chat — link to full page */}
        <div className="mt-6 rounded-2xl bg-gradient-card border border-border/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/40">
            <div>
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary-glow" /> {t("admin_messages")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin_messages_sub")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{chatsList.length} {t("admin_conversations")}</Badge>
              <Button asChild size="sm" className="bg-gradient-primary border-0 text-primary-foreground">
                <Link to="/ops-x7k9m2/chat">{t("admin_open_full_chat")}</Link>
              </Button>
            </div>
          </div>
          {chatsList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("admin_no_msgs")}</p>
          ) : (
            <div className="divide-y divide-border/20 max-h-80 overflow-y-auto">
              {chatsList.slice(0, 8).map((convo) => {
                const key = `${convo.car_id}::${convo.buyer_email}`;
                const displayName = convo.buyer_name || convo.buyer_email;
                return (
                  <Link
                    key={key}
                    to="/ops-x7k9m2/chat"
                    search={{ car: convo.car_id, buyer: convo.buyer_email }}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/10 transition-smooth"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{displayName}</div>
                      <p className="text-[10px] text-muted-foreground truncate">{convo.car_title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.last_message}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}

      </div>
      <Footer />

      {/* Full-screen Car Form Drawer */}
      {showForm && (
        <div
          className={`fixed inset-0 z-[80] flex justify-end transition-opacity duration-300 ${drawerVisible ? "opacity-100" : "opacity-0"}`}
          onClick={closeForm}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-2xl h-dvh max-h-dvh bg-background border-l border-border/60 shadow-elegant flex flex-col min-h-0 transition-transform duration-300 ease-out ${drawerVisible ? "translate-x-0" : "translate-x-full"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-background/95 backdrop-blur-sm">
              <div>
                <h2 className="font-display font-bold text-lg">{editingCar ? t("admin_form_edit") : t("admin_form_add")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editingCar ? t("admin_form_editing", { title: editingCar.title }) : t("admin_form_subtitle")}</p>
              </div>
              <button onClick={closeForm} className="h-8 w-8 rounded-full glass flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-border/40 bg-background/95 overflow-x-auto">
              {TABS.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    tab === tabItem.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tabItem.icon className="h-3.5 w-3.5" />
                  {t(tabItem.labelKey)}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 pb-6">

              {/* ── BASIC INFO ── */}
              {tab === "basic" && (
                <>
                  <Section tKey="admin_sec_identity">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label tKey="admin_lbl_title" />
                        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="McLaren GT Coupe 2022" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_brand" />
                        <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="McLaren" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_model" />
                        <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="GT" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_year" />
                        <Input type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_trim" />
                        <Input value={form.trim ?? ""} onChange={(e) => set("trim", e.target.value || null)} placeholder="Sport, Black Pack…" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_vin" />
                        <Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value || null)} placeholder="17-char VIN" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_plate" />
                        <select value={form.plate_status ?? "Clean"} onChange={(e) => set("plate_status", e.target.value)} className={sel()}>
                          {["Clean", "Salvage", "Rebuilt", "Export Only", "Unknown"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label tKey="admin_lbl_color" />
                        <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Volcano Orange" className="bg-background/50" />
                      </div>
                    </div>
                  </Section>

                  <Section tKey="admin_sec_location">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label tKey="admin_lbl_city" />
                        <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cairo" className="bg-background/50" />
                      </div>
                    </div>
                  </Section>

                  <Section tKey="admin_sec_pricing">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label tKey="admin_lbl_price" />
                        <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_buy_now" />
                        <Input type="number" value={form.buy_now_price ?? ""} onChange={(e) => set("buy_now_price", e.target.value ? Number(e.target.value) : null)} placeholder="Optional instant purchase" className="bg-background/50" />
                      </div>
                    </div>
                  </Section>

                  <Section tKey="admin_sec_description">
                    <div>
                      <Label tKey="admin_lbl_description" />
                      <textarea
                        value={form.description ?? ""}
                        onChange={(e) => set("description", e.target.value || null)}
                        rows={4}
                        placeholder="Detailed description of the vehicle…"
                        className={`${sel()} resize-none`}
                      />
                    </div>
                  </Section>

                  <Section tKey="admin_sec_flags">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_new} onChange={(e) => set("is_new", e.target.checked)} className="accent-primary w-4 h-4 rounded" />
                        <span className="text-sm flex items-center gap-1"><CarIcon className="h-3.5 w-3.5 text-green-400" /> {t("admin_flag_new")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-primary w-4 h-4 rounded" />
                        <span className="text-sm flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-400" /> {t("admin_flag_featured")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_live} onChange={(e) => set("is_live", e.target.checked)} className="accent-primary w-4 h-4 rounded" />
                        <span className="text-sm flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-[var(--live)]" /> {t("admin_flag_live")}</span>
                      </label>
                    </div>
                  </Section>
                </>
              )}

              {/* ── MECHANICAL ── */}
              {tab === "mechanical" && (
                <>
                  <Section tKey="admin_sec_engine">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label tKey="admin_lbl_engine" />
                        <Input value={form.engine ?? ""} onChange={(e) => set("engine", e.target.value || null)} placeholder="4.0L Twin-Turbo V8" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_hp" />
                        <Input type="number" value={form.hp ?? ""} onChange={(e) => set("hp", e.target.value ? Number(e.target.value) : null)} placeholder="620" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_fuel" />
                        <select value={form.fuel} onChange={(e) => set("fuel", e.target.value)} className={sel()}>
                          {["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      {(form.fuel === "Electric" || form.fuel === "Hybrid" || form.fuel === "Plug-in Hybrid") && (
                        <div>
                          <Label tKey="admin_lbl_battery_health" />
                          <Input type="number" min={0} max={100} value={form.battery_health ?? ""} onChange={(e) => set("battery_health", e.target.value ? Number(e.target.value) : null)} placeholder="95" className="bg-background/50" />
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section tKey="admin_sec_drivetrain">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label tKey="admin_lbl_transmission" />
                        <select value={form.transmission} onChange={(e) => set("transmission", e.target.value)} className={sel()}>
                          {["Automatic", "Manual", "CVT", "DCT", "PDK"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label tKey="admin_lbl_drivetrain" />
                        <select value={form.drivetrain ?? "RWD"} onChange={(e) => set("drivetrain", e.target.value)} className={sel()}>
                          {["RWD", "FWD", "AWD", "4WD", "4x4"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label tKey="admin_lbl_mileage" />
                        <Input type="number" value={form.mileage} onChange={(e) => set("mileage", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_seats" />
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
                  <Section tKey="admin_sec_primary_img">
                    <div>
                      <Label tKey="admin_lbl_main_image" />
                      <div className="flex gap-2">
                        <Input value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} placeholder="https://..." className="bg-background/50 flex-1" />
                        <Button
                          type="button"
                          variant="outline"
                          className="glass shrink-0"
                          disabled={uploadingImage}
                          onClick={() => mainImgRef.current?.click()}
                          title={t("admin_lbl_upload_file")}
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

                  <Section tKey="admin_sec_gallery">
                    <div className="flex gap-2">
                      <Input
                        value={mediaInput.image}
                        onChange={(e) => setMediaInput((m) => ({ ...m, image: e.target.value }))}
                        placeholder={t("admin_lbl_image_url")}
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
                        <div className="absolute bottom-1 start-2 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full">{t("admin_preview_add")}</div>
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

                  <Section tKey="admin_sec_videos">
                    <div className="flex gap-2">
                      <Input
                        value={mediaInput.video}
                        onChange={(e) => setMediaInput((m) => ({ ...m, video: e.target.value }))}
                        placeholder={t("admin_lbl_video_url")}
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

                  <Section tKey="admin_sec_pdfs">
                    <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleUploadPdf(e.target.files?.[0])} />
                    <Button
                      variant="outline"
                      className="glass gap-1.5 w-full"
                      disabled={uploadingPdf}
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingPdf ? t("loading_text") : t("admin_upload_pdf")}
                    </Button>
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
                  <Section tKey="admin_sec_auction_pricing">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label tKey="admin_lbl_starting" />
                        <Input type="number" value={form.starting_price ?? ""} onChange={(e) => set("starting_price", e.target.value ? Number(e.target.value) : null)} placeholder="Opening bid amount" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_current_bid" />
                        <Input type="number" value={form.current_bid ?? ""} onChange={(e) => set("current_bid", e.target.value ? Number(e.target.value) : null)} placeholder="Leave blank = use starting" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_min_raise" />
                        <Input type="number" value={form.min_raise} onChange={(e) => set("min_raise", Number(e.target.value))} className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_reserve" />
                        <Input type="number" value={form.reserve_price ?? ""} onChange={(e) => set("reserve_price", e.target.value ? Number(e.target.value) : null)} placeholder="Min. price to sell" className="bg-background/50" />
                      </div>
                      <div>
                        <Label tKey="admin_lbl_buy_now" />
                        <Input type="number" value={form.buy_now_price ?? ""} onChange={(e) => set("buy_now_price", e.target.value ? Number(e.target.value) : null)} placeholder="Instant purchase price" className="bg-background/50" />
                      </div>
                    </div>
                    {form.reserve_price && (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 mt-2">
                        <Shield className="h-4 w-4 text-primary-glow shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{t("admin_reserve_hint")}</p>
                      </div>
                    )}
                  </Section>

                  <Section tKey="admin_sec_auction_end">
                    <div>
                      <Label tKey="admin_lbl_end_time" />
                      <Input
                        type="datetime-local"
                        value={endsAtDisplay}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="bg-background/50"
                      />
                      {form.ends_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin_ends_prefix")} {new Date(form.ends_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                          {now && form.ends_at > now
                            ? ` ${t("admin_in_minutes").replace("{n}", String(Math.round((form.ends_at - now) / 60000)))}`
                            : ` ${t("admin_already_ended")}`}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label tKey="admin_quick_timers" />
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
                          {t("admin_clear")}
                        </button>
                      </div>
                    </div>
                  </Section>

                  <Section tKey="admin_sec_auction_status">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-border/40 cursor-pointer hover:border-primary/40 transition-colors">
                        <input type="checkbox" checked={form.is_live} onChange={(e) => set("is_live", e.target.checked)} className="accent-primary w-4 h-4" />
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-[var(--live)]" /> {t("admin_go_live")}</div>
                          <div className="text-xs text-muted-foreground">{t("admin_go_live_hint")}</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-border/40 cursor-pointer hover:border-primary/40 transition-colors">
                        <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-primary w-4 h-4" />
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-yellow-400" /> {t("admin_boost_listing")}</div>
                          <div className="text-xs text-muted-foreground">{t("admin_boost_hint")}</div>
                        </div>
                      </label>
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* Drawer footer — always visible above mobile chrome */}
            <div className="shrink-0 border-t border-border/40 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-background/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              <div className="hidden sm:flex gap-1">
                {TABS.map((tabItem) => (
                  <button
                    key={tabItem.id}
                    onClick={() => setTab(tabItem.id)}
                    className={`h-1.5 rounded-full transition-all ${tab === tabItem.id ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="glass flex-1 sm:flex-none" onClick={closeForm}>{t("admin_cancel")}</Button>
                <Button className="bg-gradient-primary border-0 text-primary-foreground flex-1 sm:flex-none sm:min-w-[100px]" onClick={handleSave} disabled={saving}>
                  {saving ? t("common_saving") : editingCar ? t("admin_save_changes") : t("admin_add_car")}
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
                <h3 id="go-live-title" className="font-display font-semibold text-base">{t("admin_go_live_title")}</h3>
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
                  {t("admin_auction_end_dt")}
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
                    {t("admin_ends_prefix")} <span className="text-foreground font-medium">
                      {new Date(goLiveEndsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </p>
                )}
              </div>

              {/* Quick presets */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{t("admin_quick_presets")}</p>
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
                {t("admin_cancel")}
              </Button>
              <Button
                className="flex-1 bg-[var(--live)] hover:bg-[var(--live)]/90 border-0 text-white gap-1.5"
                onClick={handleConfirmGoLive}
                disabled={!goLiveEndsAt || goLiveConfirming}
              >
                <Radio className="h-3.5 w-3.5" />
                {goLiveConfirming ? t("admin_go_live_confirm") : t("admin_go_live")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
