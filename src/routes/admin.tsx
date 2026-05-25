import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
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
  Radio, Save, ChevronDown, ChevronUp,
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

const EMPTY_FORM: Omit<CarInput, "id"> & { id: string } = {
  id: "", title: "", brand: "", model: "", year: new Date().getFullYear(),
  price: 0, currency: "EGP", mileage: 0, fuel: "Petrol", transmission: "Automatic",
  color: "", condition: "Excellent", image_url: "", dealership: "", city: "",
  hp: null, engine: null, vin: null, seats: 5, is_live: false,
  current_bid: null, min_raise: 10000, ends_at: null, description: null,
};

function AdminPage() {
  const { cars, live } = Route.useLoaderData();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<DbCar | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalCars = cars.length;
  const liveCars = live.length;

  const bars = [42, 58, 71, 49, 88, 95, 76, 102, 89, 124, 110, 138];

  const handleExport = () => {
    const rows = [
      ["Title", "Brand", "Year", "Status", "Price", "Dealership", "City"],
      ...cars.map((c) => [
        c.title, c.brand, c.year,
        c.is_live ? "Live" : "Listed",
        c.is_live ? c.current_bid : c.price,
        c.dealership, c.city,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "apexauto-report.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV");
  };

  const openNew = () => {
    setEditingCar(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (car: DbCar) => {
    setEditingCar(car);
    setForm({
      id: car.id, title: car.title, brand: car.brand, model: car.model,
      year: car.year, price: car.price, currency: car.currency ?? "EGP",
      mileage: car.mileage, fuel: car.fuel, transmission: car.transmission,
      color: car.color, condition: car.condition, image_url: car.image_url ?? "",
      dealership: car.dealership, city: car.city,
      hp: car.hp ?? null, engine: car.engine ?? null, vin: car.vin ?? null,
      seats: car.seats ?? 5, is_live: car.is_live ?? false,
      current_bid: car.current_bid ?? null, min_raise: car.min_raise ?? 10000,
      ends_at: car.ends_at ?? null, description: car.description ?? null,
    });
    setShowForm(true);
  };

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.brand || !form.model || !form.dealership || !form.city) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const id = form.id || generateCarId(form.brand, form.model, form.year);
      const payload: CarInput = { ...form, id, image_url: form.image_url || null };

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
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggleLive = async (car: DbCar) => {
    try {
      await updateCar({ data: { id: car.id, is_live: !car.is_live } });
      toast.success(`${car.title} is now ${!car.is_live ? "LIVE" : "unlisted"}`);
      router.invalidate();
    } catch {
      toast.error("Failed to update");
    }
  };

  const stats = [
    { icon: DollarSign, l: "Revenue (30d)", v: "EGP 12.4M", d: "+18.2%" },
    { icon: Gavel, l: "Live Auctions", v: liveCars.toString(), d: `${liveCars} active` },
    { icon: CarIcon, l: "Total Cars", v: formatNumber(totalCars), d: `${totalCars} listed` },
    { icon: Users, l: "Active Users", v: "8,419", d: "+5.1%" },
  ];

  return (
    <div className="min-h-screen" onClick={() => setDeleteConfirm(null)}>
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
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
                <Badge variant="outline" className="text-[10px] text-[var(--success)] border-[var(--success)]/40">{s.d}</Badge>
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
                <h3 className="font-display font-semibold">Auction revenue</h3>
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
              <h3 className="font-display font-semibold">Live monitoring</h3>
            </div>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live auctions right now.</p>
            ) : (
              <div className="space-y-3">
                {live.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to="/cars/$carId"
                    params={{ carId: c.id }}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 hover:opacity-80 transition-smooth"
                  >
                    <div>
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">{c.bids_count} bids · {c.viewers} viewing</div>
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

        {/* Car Management Table */}
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
                  <th className="pb-3 pr-4 text-right">Price</th>
                  <th className="pb-3 pr-4">City</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <>
                    <tr
                      key={c.id}
                      className="border-t border-border/20 hover:bg-secondary/20 transition-smooth cursor-pointer"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground">{c.dealership} · {c.year}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {c.is_live
                          ? <Badge className="bg-[var(--live)] text-white border-0 gap-1"><Radio className="h-3 w-3" /> Live</Badge>
                          : <Badge variant="outline">Listed</Badge>}
                      </td>
                      <td className="py-3 pr-4 text-right font-display font-semibold tabular-nums">
                        {formatPrice(c.is_live ? (c.current_bid ?? c.price) : c.price)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{c.city}</td>
                      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleToggleLive(c)}
                          >
                            {c.is_live ? "Unlist" : "Go Live"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(c)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {expandedId === c.id
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        {deleteConfirm === c.id && (
                          <div
                            className="absolute right-6 mt-1 w-56 glass-strong border border-destructive/40 rounded-xl shadow-elegant z-20 p-3 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-sm font-medium mb-2">Delete "{c.title}"?</p>
                            <p className="text-xs text-muted-foreground mb-3">This cannot be undone. All bids will be removed.</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleDelete(c.id, c.title)}
                              >
                                Delete
                              </Button>
                              <Button size="sm" variant="outline" className="glass" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr key={`${c.id}-expanded`} className="bg-secondary/10">
                        <td colSpan={5} className="py-3 px-4">
                          <div className="grid sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                            <span><strong className="text-foreground">Fuel:</strong> {c.fuel}</span>
                            <span><strong className="text-foreground">Transmission:</strong> {c.transmission}</span>
                            <span><strong className="text-foreground">Mileage:</strong> {formatNumber(c.mileage)} km</span>
                            <span><strong className="text-foreground">Condition:</strong> {c.condition}</span>
                            {c.engine && <span><strong className="text-foreground">Engine:</strong> {c.engine}</span>}
                            {c.hp && <span><strong className="text-foreground">HP:</strong> {c.hp}</span>}
                            {c.vin && <span><strong className="text-foreground">VIN:</strong> {c.vin}</span>}
                            <span><strong className="text-foreground">Seats:</strong> {c.seats}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button asChild size="sm" variant="outline" className="glass text-xs h-7">
                              <Link to="/cars/$carId" params={{ carId: c.id }}>View listing</Link>
                            </Button>
                            <Button size="sm" variant="outline" className="glass text-xs h-7" onClick={() => openEdit(c)}>
                              <Edit2 className="h-3 w-3 mr-1" /> Edit specs
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Car Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl h-full bg-background border-l border-border/60 shadow-elegant overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-6 py-4 flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">
                {editingCar ? "Edit Car" : "Add New Car"}
              </h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Basic Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                    <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. McLaren GT 2022" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Brand *</label>
                    <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="McLaren" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Model *</label>
                    <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="GT" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Year *</label>
                    <Input type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Color *</label>
                    <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Volcano Orange" className="bg-background/50" />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Pricing</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Buy Now Price (EGP) *</label>
                    <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Starting Bid (EGP)</label>
                    <Input type="number" value={form.current_bid ?? ""} onChange={(e) => set("current_bid", e.target.value ? Number(e.target.value) : null)} placeholder="Leave blank if not auctioning" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Min Raise (EGP)</label>
                    <Input type="number" value={form.min_raise} onChange={(e) => set("min_raise", Number(e.target.value))} className="bg-background/50" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Mileage (km) *</label>
                    <Input type="number" value={form.mileage} onChange={(e) => set("mileage", Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fuel</label>
                    <select value={form.fuel} onChange={(e) => set("fuel", e.target.value)} className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
                      {["Petrol", "Diesel", "Electric", "Hybrid"].map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Transmission</label>
                    <select value={form.transmission} onChange={(e) => set("transmission", e.target.value)} className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
                      {["Automatic", "Manual", "CVT", "DCT"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
                    <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
                      {["Excellent", "Very Good", "Good", "Fair"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Horsepower</label>
                    <Input type="number" value={form.hp ?? ""} onChange={(e) => set("hp", e.target.value ? Number(e.target.value) : null)} placeholder="620" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Seats</label>
                    <Input type="number" value={form.seats} onChange={(e) => set("seats", Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Engine</label>
                    <Input value={form.engine ?? ""} onChange={(e) => set("engine", e.target.value || null)} placeholder="4.0L V8 Twin-Turbo" className="bg-background/50" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">VIN</label>
                    <Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value || null)} placeholder="Vehicle Identification Number" className="bg-background/50" />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Location & Dealer</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Dealership *</label>
                    <Input value={form.dealership} onChange={(e) => set("dealership", e.target.value)} placeholder="Apex Motors Cairo" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">City *</label>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cairo" className="bg-background/50" />
                  </div>
                </div>
              </div>

              {/* Image */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Image</h3>
                <label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
                <Input value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} placeholder="https://example.com/car.jpg" className="bg-background/50" />
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-xl" onError={(e) => (e.currentTarget.style.display = "none")} />
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Description</h3>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value || null)}
                  rows={3}
                  placeholder="Optional car description…"
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Auction */}
              <div className="rounded-xl glass border border-border/40 p-4 space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Auction Settings</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`h-5 w-9 rounded-full transition-smooth relative ${form.is_live ? "bg-[var(--live)]" : "bg-secondary"}`}
                    onClick={() => set("is_live", !form.is_live)}
                  >
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-smooth ${form.is_live ? "left-4" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium">Mark as Live Auction</span>
                  {form.is_live && <Badge className="bg-[var(--live)] text-white border-0 text-[10px] animate-pulse-live">LIVE</Badge>}
                </label>
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-background pb-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-primary border-0 text-primary-foreground h-11"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : editingCar ? "Save Changes" : "Add to Inventory"}
                </Button>
                <Button variant="outline" className="glass" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
