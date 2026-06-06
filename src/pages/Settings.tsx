import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useI18n, Lang } from "@/lib/i18n";
import {
  Globe,
  UserCog,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

type Theme = "dark" | "light" | "system";

const langs: { code: Lang; label: string }[] = [
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

const themes: { code: Theme; labelKey: string; icon: React.ElementType }[] = [
  { code: "dark", labelKey: "settings.themeDark", icon: Moon },
  { code: "light", labelKey: "settings.themeLight", icon: Sun },
  { code: "system", labelKey: "settings.themeSystem", icon: Monitor },
];

function useTheme() {
  const getSaved = (): Theme => {
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved && ["dark", "light", "system"].includes(saved) ? saved : "dark";
  };
  return { theme: getSaved() };
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { lang, setLang, t, dir } = useI18n();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    document.title = `${t("nav.settings")} | DevHub`;
  }, [t]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="container max-w-2xl space-y-6 px-3 py-6 sm:px-4 sm:py-8" dir={dir}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>
        <p className="text-sm text-muted-foreground">{t("modules.settings.desc")}</p>
      </div>

      {/* Account */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-primary" />
            {t("settings.account")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">{t("auth.email")}</Label>
            <p className="font-medium">{user?.email ?? "—"}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            <UserCog className="ml-2 h-4 w-4" />
            {t("settings.editProfile")}
          </Button>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder={t("common.language")} />
            </SelectTrigger>
            <SelectContent>
              {langs.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("settings.languageDesc")}
          </p>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5 text-primary" />
            {t("settings.appearance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {themes.map((th) => {
              const Icon = th.icon;
              const active = theme === th.code;
              return (
                <Button
                  key={th.code}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className={active ? "bg-gradient-primary" : ""}
                  onClick={() => {
                    localStorage.setItem("theme", th.code);
                    window.location.reload();
                  }}
                >
                  <Icon className="ml-2 h-4 w-4" />
                  {t(th.labelKey)}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("settings.appearanceDesc")}
          </p>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card className="shadow-card border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <LogOut className="h-5 w-5" />
            {t("settings.session")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut className="ml-2 h-4 w-4" />
            {t("common.logout")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
