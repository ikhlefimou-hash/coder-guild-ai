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
  GraduationCap,
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
    { titleKey: "nav.teachers", url: "/dashboard/teachers", icon: GraduationCap },
    { titleKey: "nav.messages", url: "/dashboard/messages", icon: MessageSquare },
    { titleKey: "nav.settings", url: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="h-14 justify-center border-b border-border/60">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && <span className="text-lg font-semibold">DevHub</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-5">
          <SidebarGroupLabel>{t("nav.menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.titleKey)} className="h-auto min-h-11 gap-3 py-3 text-start [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug data-[active=true]:bg-primary/10 data-[active=true]:text-primary">
                    <NavLink to={item.url} end={item.url === "/dashboard"}>
                      <item.icon className="h-4 w-4 text-primary" />
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
