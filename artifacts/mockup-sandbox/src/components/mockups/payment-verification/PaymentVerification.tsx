import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Shield,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  Sparkles,
  CreditCard,
  Phone,
  User,
  ArrowLeft,
  LogOut,
} from "lucide-react";

type View = "buyer" | "admin-login" | "admin-panel";

interface Submission {
  id: string;
  buyerName: string;
  phone: string;
  carTitle: string;
  amount: number;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  screenshotUrl: string;
  aiResult: {
    confidence: number;
    extractedAmount: number | null;
    extractedDate: string | null;
    extractedRef: string | null;
    verdict: "match" | "mismatch" | "unclear";
    note: string;
  };
}

const REQUIRED_AMOUNT = 50;
const INSTAPAY_NUMBER = "01012345678";
const INSTAPAY_NAME = "APEXAuto Escrow";

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: "SUB-001",
    buyerName: "Ahmed Mostafa",
    phone: "01098765432",
    carTitle: "BMW 520i 2021 — Lot #A-1047",
    amount: REQUIRED_AMOUNT,
    submittedAt: "2026-06-07 08:14",
    status: "pending",
    screenshotUrl: "https://placehold.co/320x480/f3f4f6/9ca3af?text=InstaPay+Screenshot",
    aiResult: {
      confidence: 97,
      extractedAmount: 50,
      extractedDate: "2026-06-07",
      extractedRef: "TXN-88421993",
      verdict: "match",
      note: "Amount matches exactly. Transfer to APEXAuto Escrow confirmed.",
    },
  },
  {
    id: "SUB-002",
    buyerName: "Sara El-Sayed",
    phone: "01155443322",
    carTitle: "Mercedes C200 2022 — Lot #B-0883",
    amount: REQUIRED_AMOUNT,
    submittedAt: "2026-06-07 09:02",
    status: "pending",
    screenshotUrl: "https://placehold.co/320x480/f3f4f6/9ca3af?text=InstaPay+Screenshot",
    aiResult: {
      confidence: 61,
      extractedAmount: 25,
      extractedDate: "2026-06-06",
      extractedRef: null,
      verdict: "mismatch",
      note: "Screenshot shows 25 EGP — expected 50 EGP. Date is yesterday. Possible wrong transfer.",
    },
  },
  {
    id: "SUB-003",
    buyerName: "Karim Nabil",
    phone: "01234567890",
    carTitle: "Toyota Camry 2020 — Lot #C-2211",
    amount: REQUIRED_AMOUNT,
    submittedAt: "2026-06-07 10:45",
    status: "approved",
    screenshotUrl: "https://placehold.co/320x480/f3f4f6/9ca3af?text=InstaPay+Screenshot",
    aiResult: {
      confidence: 99,
      extractedAmount: 50,
      extractedDate: "2026-06-07",
      extractedRef: "TXN-77190042",
      verdict: "match",
      note: "All fields verified. Approved automatically.",
    },
  },
];

function BuyerView({ onAdminClick }: { onAdminClick: () => void }) {
  const [step, setStep] = useState<"info" | "upload" | "submitted">("info");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleSubmit() {
    setAnalyzing(true);
    setTimeout(() => {
      setAiDone(true);
      setAnalyzing(false);
    }, 2200);
    setTimeout(() => {
      setStep("submitted");
    }, 3400);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">APEXAuto</p>
              <p className="text-slate-400 text-xs">Bid Deposit — إيداع ضمان المزاد</p>
            </div>
          </div>
          <button
            onClick={onAdminClick}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Admin
          </button>
        </div>

        {/* Step: info */}
        {step === "info" && (
          <Card className="bg-slate-800/60 border-slate-700 backdrop-blur shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-xl">
                Bid Deposit Required
              </CardTitle>
              <CardDescription className="text-slate-400">
                يلزم دفع تأمين مشاركة قبل المزايدة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Car info banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm">BMW 520i 2021 — Lot #A-1047</p>
                  <p className="text-slate-400 text-xs mt-0.5">Reserve: EGP 680,000 · Ends in 2h 14m</p>
                </div>
              </div>

              {/* Payment details */}
              <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-5 space-y-3">
                <p className="text-slate-300 text-sm font-medium uppercase tracking-wider">
                  InstaPay Details — تفاصيل الدفع
                </p>
                <Separator className="bg-slate-700" />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">رقم InstaPay</span>
                    <span className="text-white font-mono font-semibold tracking-wider">{INSTAPAY_NUMBER}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">الاسم</span>
                    <span className="text-white font-medium">{INSTAPAY_NAME}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">المبلغ المطلوب</span>
                    <span className="text-emerald-400 font-bold text-base">{REQUIRED_AMOUNT} EGP</span>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-xs leading-relaxed">
                Transfer exactly <strong className="text-slate-300">50 EGP</strong> via InstaPay to the number above, then proceed to upload the screenshot for AI verification. The deposit is fully refundable if you do not win the lot.
                <br />
                <span className="text-slate-600">قم بتحويل 50 جنيه بالضبط ثم ارفع لقطة شاشة التأكيد.</span>
              </p>

              <Button
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
                onClick={() => setStep("upload")}
              >
                I've Sent the Payment — لقد أرسلت الدفع
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: upload */}
        {step === "upload" && (
          <Card className="bg-slate-800/60 border-slate-700 backdrop-blur shadow-2xl">
            <CardHeader className="pb-4">
              <button
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm mb-2 transition-colors"
                onClick={() => setStep("info")}
              >
                <ArrowLeft className="w-4 h-4" /> Back / رجوع
              </button>
              <CardTitle className="text-white text-xl">Upload Receipt</CardTitle>
              <CardDescription className="text-slate-400">
                ارفع لقطة شاشة تأكيد التحويل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Full Name — الاسم الكامل</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="bg-slate-900 border-slate-600 text-white pl-9 placeholder:text-slate-600"
                    placeholder="e.g. Ahmed Mostafa"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Phone Number — رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="bg-slate-900 border-slate-600 text-white pl-9 placeholder:text-slate-600"
                    placeholder="e.g. 010xxxxxxxx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Payment Screenshot — صورة التأكيد</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    preview
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-slate-600 hover:border-slate-400 bg-slate-900/50"
                  }`}
                >
                  {preview ? (
                    <div className="p-3">
                      <img
                        src={preview}
                        alt="Receipt preview"
                        className="w-full max-h-52 object-contain rounded-lg"
                      />
                      <p className="text-center text-amber-400 text-xs mt-2">
                        {file?.name} — Click to change / انقر للتغيير
                      </p>
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-300 text-sm font-medium">Click to upload screenshot</p>
                        <p className="text-slate-500 text-xs mt-0.5">انقر لرفع لقطة الشاشة · PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                  />
                </div>
              </div>

              {/* AI analyzing overlay */}
              {analyzing && (
                <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm font-medium">Claude AI is verifying your payment…</p>
                    <p className="text-slate-500 text-xs">يقوم الذكاء الاصطناعي بتحليل الصورة</p>
                  </div>
                </div>
              )}

              {aiDone && !analyzing && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-emerald-300 text-sm font-medium">AI Verified — 97% Confidence</p>
                    <p className="text-slate-400 text-xs">Amount: 50 EGP ✓ · Ref: TXN-88421993</p>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold disabled:opacity-50"
                disabled={!form.name || !form.phone || !file || analyzing}
                onClick={handleSubmit}
              >
                {analyzing ? "Analyzing…" : "Submit for Admin Review — إرسال للمراجعة"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: submitted */}
        {step === "submitted" && (
          <Card className="bg-slate-800/60 border-slate-700 backdrop-blur shadow-2xl">
            <CardContent className="py-12 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Submission Received</h2>
                <p className="text-slate-400 text-sm mt-1">تم استلام طلبك بنجاح</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 w-full text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference</span>
                  <span className="text-white font-mono">SUB-{Math.floor(Math.random() * 90000) + 10000}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AI Result</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">Match ✓</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">Pending Admin</Badge>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
                An admin will review and approve your deposit within a few minutes. You'll be notified once confirmed.
                <br /><span className="text-slate-600">سيقوم المسؤول بمراجعة الطلب وتأكيده قريباً.</span>
              </p>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full"
                onClick={() => { setStep("info"); setFile(null); setPreview(null); setForm({ name: "", phone: "" }); setAiDone(false); }}
              >
                Submit Another / إرسال آخر
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AdminLogin({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  function attempt() {
    if (pw === "admin123") {
      setError(false);
      onLogin();
    } else {
      setError(true);
      setPw("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-slate-800/60 border-slate-700 backdrop-blur shadow-2xl">
        <CardHeader className="pb-2">
          <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-slate-300" />
          </div>
          <CardTitle className="text-white">Admin Access</CardTitle>
          <CardDescription className="text-slate-400">دخول لوحة الإدارة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Password — كلمة المرور</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                className="bg-slate-900 border-slate-600 text-white pr-10 placeholder:text-slate-600"
                placeholder="Enter password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && attempt()}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Incorrect password / كلمة المرور خاطئة
              </p>
            )}
          </div>
          <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold" onClick={attempt}>
            Sign In — دخول
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const [selected, setSelected] = useState<Submission | null>(null);

  function decide(id: string, decision: "approved" | "rejected") {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: decision } : s))
    );
    if (selected?.id === id) setSelected((s) => s ? { ...s, status: decision } : null);
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const resolved = submissions.filter((s) => s.status !== "pending");

  const verdictColor = (v: Submission["aiResult"]["verdict"]) => {
    if (v === "match") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (v === "mismatch") return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  };

  const statusColor = (s: Submission["status"]) => {
    if (s === "approved") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (s === "rejected") return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Top bar */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold leading-tight text-sm">APEXAuto Admin</p>
            <p className="text-slate-500 text-xs">Deposit Verification — مراجعة الإيداعات</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5">
              {pending.length} Pending
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">
              {resolved.filter((s) => s.status === "approved").length} Approved
            </span>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-61px)]">
        {/* List pane */}
        <div className="w-80 border-r border-slate-800 overflow-y-auto">
          {pending.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider px-4 pt-4 pb-2">
                Pending Review ({pending.length})
              </p>
              {pending.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${selected?.id === s.id ? "bg-slate-800/60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white text-sm font-medium">{s.buyerName}</p>
                      <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[180px]">{s.carTitle}</p>
                      <p className="text-slate-600 text-xs mt-1">{s.submittedAt}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${verdictColor(s.aiResult.verdict)}`}>
                      {s.aiResult.verdict === "match" ? "AI ✓" : s.aiResult.verdict === "mismatch" ? "AI ✗" : "AI ?"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider px-4 pt-4 pb-2">
                Resolved ({resolved.length})
              </p>
              {resolved.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors opacity-70 ${selected?.id === s.id ? "bg-slate-800/60 opacity-100" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">{s.buyerName}</p>
                      <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[180px]">{s.carTitle}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${statusColor(s.status)}`}>
                      {s.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-white text-xl font-bold">{selected.buyerName}</h2>
                <p className="text-slate-400 text-sm">{selected.phone} · {selected.submittedAt}</p>
              </div>

              {/* Car + amount */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Lot</span>
                  <span className="text-white">{selected.carTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Required</span>
                  <span className="text-white">{REQUIRED_AMOUNT} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <Badge className={`text-xs ${statusColor(selected.status)}`}>{selected.status}</Badge>
                </div>
              </div>

              {/* AI Result */}
              <div className={`rounded-xl border p-4 space-y-3 ${selected.aiResult.verdict === "match" ? "bg-emerald-500/5 border-emerald-500/20" : selected.aiResult.verdict === "mismatch" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <p className="text-slate-200 font-semibold text-sm">Claude AI Analysis</p>
                  <Badge className={`text-xs ml-auto ${verdictColor(selected.aiResult.verdict)}`}>
                    {selected.aiResult.verdict.toUpperCase()} · {selected.aiResult.confidence}%
                  </Badge>
                </div>
                <Separator className="bg-slate-700/50" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Extracted Amount</p>
                    <p className={`font-semibold ${selected.aiResult.extractedAmount === REQUIRED_AMOUNT ? "text-emerald-400" : "text-red-400"}`}>
                      {selected.aiResult.extractedAmount != null ? `${selected.aiResult.extractedAmount} EGP` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Date</p>
                    <p className="text-slate-300">{selected.aiResult.extractedDate ?? "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Reference</p>
                    <p className="text-slate-300 font-mono text-sm">{selected.aiResult.extractedRef ?? "Not found"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">AI Note</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{selected.aiResult.note}</p>
                  </div>
                </div>
              </div>

              {/* Screenshot */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Payment Screenshot</p>
                <img
                  src={selected.screenshotUrl}
                  alt="Payment screenshot"
                  className="rounded-xl border border-slate-700 w-48 object-cover"
                />
              </div>

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={() => decide(selected.id, "approved")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve — قبول
                  </Button>
                  <Button
                    className="flex-1 bg-red-600/80 hover:bg-red-500 text-white font-bold"
                    onClick={() => decide(selected.id, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject — رفض
                  </Button>
                </div>
              )}
              {selected.status !== "pending" && (
                <div className={`rounded-xl p-4 flex items-center gap-3 ${selected.status === "approved" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  {selected.status === "approved"
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />}
                  <p className={`font-semibold ${selected.status === "approved" ? "text-emerald-300" : "text-red-300"}`}>
                    {selected.status === "approved" ? "Deposit Approved — تم القبول" : "Deposit Rejected — تم الرفض"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm">
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Select a submission to review</p>
                <p className="text-xs mt-1">اختر طلباً للمراجعة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PaymentVerification() {
  const [view, setView] = useState<View>("buyer");

  return (
    <>
      {view === "buyer" && <BuyerView onAdminClick={() => setView("admin-login")} />}
      {view === "admin-login" && (
        <AdminLogin onLogin={() => setView("admin-panel")} onBack={() => setView("buyer")} />
      )}
      {view === "admin-panel" && <AdminPanel onLogout={() => setView("buyer")} />}
    </>
  );
}
