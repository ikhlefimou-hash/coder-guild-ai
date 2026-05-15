import { NavLink } from "react-router-dom";
import { LayoutDashboard, Bot, Users, MessageSquare, UserCog } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  const { t } = useI18n();

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.home"), end: true },
    { to: "/dashboard/ai", icon: Bot, label: t("nav.ai") },
    { to: "/dashboard/groups", icon: Users, label: t("nav.groups") },
    { to: "/dashboard/messages", icon: MessageSquare, label: t("nav.messages") },
    { to: "/profile", icon: UserCog, label: t("nav.profile") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/85 backdrop-blur-lg md:hidden"
      aria-label="bottom navigation"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <it.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
                  <span className="truncate">{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
