import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Bot,
  Users,
  BookOpen,
  ShoppingBag,
  Code2,
  MessageSquare,
  Settings,
  LayoutDashboard,
  UserCog,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const { t, dir } = useI18n();

  const items = [
    { titleKey: "nav.home", url: "/dashboard", icon: LayoutDashboard },
    { titleKey: "nav.ai", url: "/dashboard/ai", icon: Bot },
    { titleKey: "nav.groups", url: "/dashboard/groups", icon: Users },
    { titleKey: "nav.lessons", url: "/dashboard/lessons", icon: BookOpen },
    { titleKey: "nav.ideas", url: "/dashboard/ideas", icon: Lightbulb },
    { titleKey: "nav.projects", url: "/dashboard/projects", icon: ShoppingBag },
    { titleKey: "nav.programmers", url: "/dashboard/programmers", icon: Code2 },
    { titleKey: "nav.messages", url: "/dashboard/messages", icon: MessageSquare },
    { titleKey: "nav.settings", url: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="border-b border-border/50">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-lg font-bold text-gradient">DevHub</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.titleKey)}>
                    <NavLink to={item.url} end={item.url === "/dashboard"}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.profile")}>
              <NavLink to="/profile">
                <UserCog className="h-4 w-4" />
                <span className="truncate">{user?.email ?? t("nav.profile")}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
