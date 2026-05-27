import React, { useState, useRef } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  getCarsFromDb, getLiveCarsFromDb, createCar, updateCar, deleteCar,
  type DbCar, type CarInput,
} from "@/lib/cars.server";
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
  Timer, Eye, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — APEXAuto" }] }),
  loader: async () => {
    const [cars, live] = await Promise.all([getCarsFromDb(), getLiveCarsFromDb()]);
    return { cars, live };
  },
  component: AdminPage,
});

type FormState = Omit<CarInput, "id"> & { id: string };

const EMPTY_FORM: FormState = {
  id: "", title: "", brand: "", model: "", year: new Date().getFullYear(),
  trim: null, price: 0, currency: "EGP", mileage: 0, fuel: "Petrol",
  transmission: "Automatic", drivetrain: "RWD", color: "", condition: "Excellent",
  image_url: null, images: [], videos: [], documents: [],
  dealership: "", city: "", hp: null, engine: null, vin: null,
  plate_status: "Clean", seats: 5, is_live: false,
  current_bid: null, starting_price: null, buy_now_price: null,
  reserve_price: null, min_raise: 10000, ends_at: null,
  featured: false, accident_history: false, paint_condition: "Original",
  tire_condition: "Good", battery_health: null, service_history: "Full",
  description: null,
};

type Tab = "basic" | "mechanical" | "condition" | "media" | "auction";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: CarIcon },
  { id: "mechanical", label: "Mechanical", icon: Wrench },
  { id: "condition", label: "Condition", icon: Shield },
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

function AdminPage() {
  const { cars, live } = Route.useLoaderData();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<DbCar | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("basic");
  const [mediaInput, setMediaInput] = useState({ image: "", video: "", doc: "" });

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
      featured: car.featured ?? false, accident_history: car.accident_history ?? false,
      paint_condition: car.paint_condition ?? "Original",
      tire_condition: car.tire_condition ?? "Good",
      battery_health: car.battery_health ?? null,
      service_history: car.service_history ?? "Full",
      description: car.description ?? null,
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
      const payload: CarInput = { ...form, id };
      if (editingCar) {
        await updateCar({ data: payload });
        toast.success(`${form.title} updated`);
      } else {
        await createCar({ data: payload });
        toast.success(`${form.title} added to inventory`);
      }
      setShowForm(false);
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

  const handleToggleLive = async (car: DbCar) => {
    try {
      await updateCar({ data: { id: car.id, is_live: !car.is_live } });
      toast.success(`${car.title} is now ${!car.is_live ? "LIVE" : "unlisted"}`);
      router.invalidate();
    } catch { toast.error("Failed to update"); }
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

  const stats = [
    { icon: DollarSign, l: "Revenue (30d)", v: "EGP 12.4M", d: "+18.2%", color: "text-green-400" },
    { icon: Gavel, l: "Live Auctions", v: liveCars.toString(), d: `${liveCars} active`, color: "text-[var(--live)]" },
    { icon: CarIcon, l: "Total Cars", v: formatNumber(totalCars), d: `${totalCars} listed`, color: "text-blue-400" },
    { icon: Star, l: "Featured", v: featuredCount.toString(), d: "premium listings", color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen pb-nav md:pb-0" onClick={() => setDeleteConfirm(null)}>
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-glow" />
              <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Super Admin</span>
            </div>
            <h1 className="font-display text-4xl font-bold mt-1">Control <span className="text-gradient-primary">Center</span></h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="glass gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" /> Add Car
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl bg-gradient-card border border-border/60 p-5 hover-lift">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <s.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <Badge variant="outline" className={`text-[10px] border-current/40 ${s.color}`}>{s.d}</Badge>
              </div>
              <div className="mt-4 text-xs text-muted-foreground uppercase tracking-wider">{s.l}</div>
              <div className="font-display text-2xl font-bold mt-1">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Chart + Live */}
        <div className="grid lg:grid-cols-3 gap-5 mt-5">
          <div className="lg:col-span-2 rounded-2xl bg-gradient-card border border-border/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-semibold">Auction Revenue</h3>
                <p className="text-xs text-muted-foreground">Last 12 weeks</p>
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
              <h3 className="font-display font-semibold">Live Monitoring</h3>
            </div>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live auctions right now.</p>
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
                        {c.ends_at && (
                          <>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>{Math.max(0, Math.round((c.ends_at - Date.now()) / 60000))}m left</span>
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

        {/* Car Inventory Table */}
        <div className="mt-8 rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-lg">Car Inventory</h3>
            <Badge variant="outline">{totalCars} cars</Badge>
          </div>
          <div className="overflow-x-auto">
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
                        {c.ends_at ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Timer className="h-3 w-3 text-muted-foreground" />
                            <span className={c.ends_at < Date.now() ? "text-destructive" : "text-muted-foreground"}>
                              {c.ends_at < Date.now()
                                ? "Ended"
                                : `${Math.round((c.ends_at - Date.now()) / 60000)}m`}
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
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title={c.featured ? "Unfeature" : "Feature"}
                            onClick={() => handleToggleFeatured(c)}
                          >
                            <Star className={`h-3.5 w-3.5 ${c.featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(c.id)}
                          >
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
      </div>
      <Footer />

      {/* Full-screen Car Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl h-full bg-background border-l border-border/60 shadow-elegant flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="shrink-0 border-b border-border/40 px-6 py-4 flex items-center justify-between bg-background/95 backdrop-blur-sm">
              <div>
                <h2 className="font-display font-bold text-lg">{editingCar ? "Edit Car" : "Add New Car"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editingCar ? `Editing: ${editingCar.title}` : "Complete all sections for best results"}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center">
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
              {tab === "condition" && (
                <>
                  <Section title="Overall Condition">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Condition Grade</Label>
                        <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className={sel()}>
                          {["Excellent", "Very Good", "Good", "Fair", "Poor"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Accident History</Label>
                        <select value={form.accident_history ? "Yes" : "No"} onChange={(e) => set("accident_history", e.target.value === "Yes")} className={sel()}>
                          <option>No</option>
                          <option>Yes</option>
                        </select>
                      </div>
                      <div>
                        <Label>Paint Condition</Label>
                        <select value={form.paint_condition ?? "Original"} onChange={(e) => set("paint_condition", e.target.value)} className={sel()}>
                          {["Original", "Repainted Partial", "Full Repaint", "Matte Wrap", "Unknown"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Tire Condition</Label>
                        <select value={form.tire_condition ?? "Good"} onChange={(e) => set("tire_condition", e.target.value)} className={sel()}>
                          {["New", "Like New", "Good", "Worn", "Replace"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Label>Service History</Label>
                        <select value={form.service_history ?? "Full"} onChange={(e) => set("service_history", e.target.value)} className={sel()}>
                          {["Full", "Partial", "Dealer Serviced", "Owner Serviced", "None", "Unknown"].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    {form.accident_history && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-300">Accident history is disclosed. This will be shown on the listing.</p>
                      </div>
                    )}
                  </Section>
                </>
              )}

              {/* ── MEDIA ── */}
              {tab === "media" && (
                <>
                  <Section title="Primary Image">
                    <div>
                      <Label>Main Image URL</Label>
                      <Input value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} placeholder="https://..." className="bg-background/50" />
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
                    </div>
                    {form.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {form.images.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt={`Image ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-border/40" />
                            <button
                              onClick={() => removeMedia("images", i)}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
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
                          {form.ends_at > Date.now()
                            ? ` — in ${Math.round((form.ends_at - Date.now()) / 60000)} minutes`
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
                <Button variant="outline" className="glass" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="bg-gradient-primary border-0 text-primary-foreground min-w-[100px]" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : editingCar ? "Save Changes" : "Add Car"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
