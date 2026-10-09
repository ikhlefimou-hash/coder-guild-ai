import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Code2, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export default function DashboardLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { dir, t } = useI18n();
  const location = useLocation();
  const section = [
    ["/dashboard/ai", "nav.ai"], ["/dashboard/groups", "nav.groups"],
    ["/dashboard/lessons", "nav.lessons"], ["/dashboard/ideas", "nav.ideas"],
    ["/dashboard/projects", "nav.projects"], ["/dashboard/teachers", "nav.teachers"],
    ["/dashboard/messages", "nav.messages"], ["/dashboard/settings", "nav.settings"],
    ["/profile", "nav.profile"], ["/users", "nav.profile"],
  ].find(([path]) => location.pathname.startsWith(path));

  return (
    <SidebarProvider>
      <div className="app-shell flex min-h-screen w-full bg-background" dir={dir}>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card/80 px-3 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <Code2 className="h-5 w-5 shrink-0 text-primary md:hidden" />
              <span className="truncate text-sm font-medium">{t(section?.[1] ?? "nav.home")}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitcher />
              <NotificationsBell />
              <Button asChild variant="ghost" size="icon" aria-label={t("nav.profile")}>
                <Link to="/profile"><UserRound className="h-5 w-5" /></Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
                aria-label={t("common.logout")}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
