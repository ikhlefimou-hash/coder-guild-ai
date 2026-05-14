import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "ar" | "fr" | "en";

const dict: Record<Lang, Record<string, string>> = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.ai": "المساعد الذكي",
    "nav.groups": "المجموعات",
    "nav.lessons": "الدروس",
    "nav.ideas": "الأفكار للبيع",
    "nav.projects": "سوق المشاريع",
    "nav.programmers": "المبرمجون",
    "nav.messages": "الرسائل",
    "nav.settings": "الإعدادات",
    "nav.menu": "القائمة",
    "nav.profile": "ملفي الشخصي",
    "common.logout": "تسجيل الخروج",
    "common.language": "اللغة",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.ai": "Assistant IA",
    "nav.groups": "Groupes",
    "nav.lessons": "Cours",
    "nav.ideas": "Idées à vendre",
    "nav.projects": "Marché des projets",
    "nav.programmers": "Développeurs",
    "nav.messages": "Messages",
    "nav.settings": "Paramètres",
    "nav.menu": "Menu",
    "nav.profile": "Mon profil",
    "common.logout": "Déconnexion",
    "common.language": "Langue",
  },
  en: {
    "nav.home": "Home",
    "nav.ai": "AI Assistant",
    "nav.groups": "Groups",
    "nav.lessons": "Lessons",
    "nav.ideas": "Ideas for sale",
    "nav.projects": "Projects market",
    "nav.programmers": "Developers",
    "nav.messages": "Messages",
    "nav.settings": "Settings",
    "nav.menu": "Menu",
    "nav.profile": "My profile",
    "common.logout": "Sign out",
    "common.language": "Language",
  },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    return saved && ["ar", "fr", "en"].includes(saved) ? saved : "ar";
  });

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("lang", lang);
  }, [lang, dir]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: string) => dict[lang][key] ?? dict.ar[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
