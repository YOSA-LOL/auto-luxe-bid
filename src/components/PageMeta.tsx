import { useEffect } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { useLanguage, type TranslationKey } from "@/lib/language";

type PageMetaProps = {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  titleVars?: Record<string, string | number>;
  descriptionVars?: Record<string, string | number>;
};

export function PageMeta({
  titleKey,
  descriptionKey,
  titleVars,
  descriptionVars,
}: PageMetaProps) {
  const { t, lang } = useLanguage();

  useEffect(() => {
    const title = t(titleKey, titleVars);
    document.title = `${title} — ${BRAND_NAME}`;

    if (descriptionKey) {
      const desc = t(descriptionKey, descriptionVars);
      const setMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          el.name = name;
          document.head.appendChild(el);
        }
        el.content = content;
      };
      const setOg = (property: string, content: string) => {
        let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("property", property);
          document.head.appendChild(el);
        }
        el.content = content;
      };
      setMeta("description", desc);
      setOg("og:title", document.title);
      setOg("og:description", desc);
      setMeta("twitter:title", document.title);
      setMeta("twitter:description", desc);
    }
  }, [t, lang, titleKey, descriptionKey, titleVars, descriptionVars]);

  return null;
}
