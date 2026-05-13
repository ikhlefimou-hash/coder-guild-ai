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

const items = [
  { title: "الرئيسية", url: "/dashboard", icon: LayoutDashboard },
  { title: "المساعد الذكي", url: "/dashboard/ai", icon: Bot },
  { title: "المجموعات", url: "/dashboard/groups", icon: Users },
  { title: "الدروس", url: "/dashboard/lessons", icon: BookOpen },
  { title: "الأفكار للبيع", url: "/dashboard/ideas", icon: Lightbulb },
  { title: "سوق المشاريع", url: "/dashboard/projects", icon: ShoppingBag },
  { title: "المبرمجون", url: "/dashboard/programmers", icon: Code2 },
  { title: "الرسائل", url: "/dashboard/messages", icon: MessageSquare },
  { title: "الإعدادات", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" side="right">
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
          <SidebarGroupLabel>القائمة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/dashboard"}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
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
            <SidebarMenuButton asChild tooltip="ملفي الشخصي">
              <NavLink to="/profile">
                <UserCog className="h-4 w-4" />
                <span className="truncate">{user?.email ?? "ملفي الشخصي"}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
