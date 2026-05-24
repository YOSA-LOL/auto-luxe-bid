import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CARS, formatPrice, formatNumber, liveAuctions } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Car as CarIcon, Gavel, DollarSign, TrendingUp, ShieldCheck, Activity, MoreHorizontal, Download, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — APEXAuto" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const live = liveAuctions();
  const stats = [
    { icon: DollarSign, l: "Revenue (30d)", v: "EGP 12.4M", d: "+18.2%" },
    { icon: Gavel, l: "Active Auctions", v: live.length.toString(), d: "+4 today" },
    { icon: CarIcon, l: "Listed Cars", v: formatNumber(CARS.length * 240), d: "+312" },
    { icon: Users, l: "Active Users", v: "8,419", d: "+5.1%" },
  ];

  const bars = [42, 58, 71, 49, 88, 95, 76, 102, 89, 124, 110, 138];

  const handleExport = () => {
    const rows = [
      ["Car", "Status", "Price", "Dealer"],
      ...CARS.map((c) => [
        c.title,
        c.isLive ? "Live" : "Listed",
        formatPrice(c.isLive ? c.currentBid! : c.price),
        c.dealership,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apexauto-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV!");
  };

  const handleNewAuction = () => {
    toast.info("New auction creation panel coming soon!");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-glow" />
              <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Super Admin</span>
            </div>
            <h1 className="font-display text-4xl font-bold mt-1">Control <span className="text-gradient-primary">Center</span></h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="glass gap-2">
              <Download className="h-4 w-4" /> Export report
            </Button>
            <Button onClick={handleNewAuction} className="bg-gradient-primary border-0 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> New auction
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

        {/* Chart + Live monitoring */}
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
                  onClick={() => toast.info(`Week ${i + 1}: EGP ${b * 100_000} revenue`)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl glass-strong border border-border/60 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-[var(--live)] animate-pulse-live" />
              <h3 className="font-display font-semibold">Live monitoring</h3>
            </div>
            <div className="space-y-3">
              {live.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to="/cars/$carId"
                  params={{ carId: c.id }}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 hover:opacity-80 transition-smooth"
                >
                  <div>
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="text-[11px] text-muted-foreground">{c.bids} bids · {c.viewers} viewing</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-semibold text-sm text-gradient-primary">{formatPrice(c.currentBid!)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Recent cars</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/browse">Manage all</Link>
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3">Car</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Price</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {CARS.slice(0, 5).map((c) => (
                  <tr key={c.id} className="border-t border-border/30">
                    <td className="py-3">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">{c.dealership}</div>
                    </td>
                    <td className="py-3">
                      {c.isLive
                        ? <Badge className="bg-[var(--live)] text-white border-0">Live</Badge>
                        : <Badge variant="outline">Listed</Badge>}
                    </td>
                    <td className="py-3 text-right font-display font-semibold tabular-nums">{formatPrice(c.isLive ? c.currentBid! : c.price)}</td>
                    <td className="py-3 text-right">
                      <Link to="/cars/$carId" params={{ carId: c.id }}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Top dealerships</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/browse">View all</Link>
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { n: "Apex Motors Cairo", s: "EGP 4.2M", c: 38 },
                { n: "Crown Auto Group", s: "EGP 3.1M", c: 27 },
                { n: "Imperial Cars", s: "EGP 2.8M", c: 19 },
                { n: "Velocity Garage", s: "EGP 2.1M", c: 31 },
                { n: "Heritage Collection", s: "EGP 1.6M", c: 14 },
              ].map((d, i) => (
                <div key={d.n} className="flex items-center gap-3 py-2">
                  <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center font-display text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{d.n}</div>
                    <div className="text-[11px] text-muted-foreground">{d.c} cars sold</div>
                  </div>
                  <div className="font-display font-semibold text-sm text-gradient-primary">{d.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
