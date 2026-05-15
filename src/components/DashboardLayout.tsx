import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Code2, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useI18n } from "@/lib/i18n";

export default function DashboardLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { dir, t } = useI18n();

  const userLabel =
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.username ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background" dir={dir}>
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-3 backdrop-blur-lg">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <div className="flex items-center gap-2 min-w-0">
                <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow sm:flex">
                  <Code2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="truncate text-base font-bold text-gradient">DevHub</span>
                {userLabel && (
                  <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                    · {userLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <NotificationsBell />
              <Button
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
                aria-label={t("common.logout")}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("common.logout")}</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 pb-16 md:pb-0">
            <Outlet />
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
