import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export default function DashboardLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { dir, t } = useI18n();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background" dir={dir}>
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-3 backdrop-blur-lg">
            <SidebarTrigger />
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <NotificationsBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
                aria-label={t("common.logout")}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
