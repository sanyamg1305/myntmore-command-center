import { Link, useRouterState } from "@tanstack/react-router";
import myntmoreLogo from "@/assets/myntmore-logo.png";
import {
  Home,
  Users,
  PenSquare,
  CheckSquare,
  TrendingUp,
  Star,
  Wallet,
  Settings,
  LogOut,
  Globe,
  CalendarCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Home, adminOnly: false },
  { to: "/clients", label: "Clients", icon: Users, adminOnly: false },
  { to: "/data-entry", label: "Data Entry", icon: PenSquare, adminOnly: false },
  { to: "/actionables", label: "Actionables", icon: CheckSquare, adminOnly: false },
  { to: "/processes", label: "Processes", icon: Settings, adminOnly: false },
  { to: "/monthly-targets", label: "Monthly Targets", icon: CalendarCheck, adminOnly: false },
  { to: "/sales", label: "Sales & Outreach", icon: TrendingUp, adminOnly: false },
  { to: "/tj-personal-brand", label: "TJ Personal Brand", icon: Star, adminOnly: false },
  { to: "/mm-content", label: "MM Content", icon: Globe, adminOnly: false },
  { to: "/finance", label: "Finance", icon: Wallet, adminOnly: false },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, signOut } = useAuth();

  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={myntmoreLogo} alt="Myntmore" className={`${collapsed ? "h-10 w-10" : "h-14 w-14"} object-contain`} />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">Myntmore</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Dashboard OS
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const active = path === item.to || path.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.to}
                        className={`flex items-center gap-2 ${
                          active
                            ? "border-l-2 border-gold bg-gold-soft font-semibold"
                            : ""
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!collapsed && profile && (
          <div className="px-2 py-1 text-xs">
            <div className="font-semibold truncate">{profile.full_name}</div>
            <div className="text-muted-foreground truncate">
              {isAdmin ? "Admin" : profile.department || "Member"}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
