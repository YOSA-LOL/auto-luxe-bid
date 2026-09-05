import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 end-4 z-50 max-w-xs animate-fade-up">
      <div className="glass-strong border border-primary/30 rounded-2xl p-4 shadow-elegant">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-medium">{t("pwa_install_title")}</p>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t("pwa_install_desc")}</p>
        <Button
          size="sm"
          className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
            setDismissed(true);
          }}
        >
          <Download className="h-3.5 w-3.5" />
          {t("pwa_install_btn")}
        </Button>
      </div>
    </div>
  );
}
