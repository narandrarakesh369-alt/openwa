import { 
  LayoutDashboard, School, BookOpen, Calendar, LogOut, Settings, 
  DollarSign, Clock, FileText, Award, 
  FileCheck, UserCog, Wallet, GraduationCap, BarChart, ChevronDown,
  Bus, Bell
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userRole: string | null;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out successfully"
    });
    navigate("/");
  };

  const isActive = (url: string) => location.pathname === url;
  const isGroupActive = (submenu: any[]) => submenu?.some(item => location.pathname === item.url);

  const menuItems = {
    super_admin: [
      { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
      { title: "Schools", icon: School, url: "/schools" },
      { title: "Settings", icon: Settings, url: "/settings" },
    ],
    school_admin: [
      { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
      { title: "Settings", icon: Settings, url: "/settings" },
      { 
        title: "Students", 
        icon: GraduationCap, 
        submenu: [
          { title: "All Students", url: "/students" },
          { title: "Add New", url: "/students/add" },
          { title: "Print Basic List", url: "/students/print" },
          { title: "Manage Login", url: "/students/manage-login" },
          { title: "Promote Students", url: "/students/promote" },
        ]
      },
      { 
        title: "Employees", 
        icon: UserCog, 
        submenu: [
          { title: "All Employees", url: "/staff" },
          { title: "Add New", url: "/staff/add" },
          { title: "Staff ID Cards", url: "/staff/id-cards" },
          { title: "Manage Login", url: "/staff/manage-login" },
        ]
      },
      { 
        title: "Attendance", 
        icon: Calendar, 
        submenu: [
          { title: "Students Attendance", url: "/attendance" },
          { title: "Class wise Report", url: "/attendance/class-report" },
          { title: "Students Attendance Report", url: "/attendance/student-report" },
        ]
      },
      { 
        title: "Classes", 
        icon: BookOpen, 
        submenu: [
          { title: "All Classes", url: "/classes" },
          { title: "New Class", url: "/classes/new" },
        ]
      },
      { title: "Subjects", icon: BookOpen, url: "/subjects" },
      { title: "Fees", icon: DollarSign, url: "/fees" },
      { title: "Salary", icon: Wallet, url: "/salary" },
      { title: "Timetable", icon: Clock, url: "/timetable" },
      { title: "Homework", icon: FileText, url: "/homework" },
      { title: "Exams", icon: FileCheck, url: "/exams" },
      { title: "Reports", icon: BarChart, url: "/reports" },
      { title: "Certificates", icon: Award, url: "/certificates" },
      { title: "Transport", icon: Bus, url: "/transport" },
      { title: "Notifications", icon: Bell, url: "/notifications" },
    ],
    teacher: [
      { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
      { title: "Classes", icon: BookOpen, url: "/classes" },
      { title: "Subjects", icon: BookOpen, url: "/subjects" },
      { title: "Timetable", icon: Clock, url: "/timetable" },
      { title: "Homework", icon: FileText, url: "/homework" },
      { title: "Marks", icon: FileCheck, url: "/marks" },
      { title: "Attendance", icon: Calendar, url: "/attendance" },
      { title: "Certificates", icon: Award, url: "/certificates" },
    ],
    student: [
      { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
      { title: "Subjects", icon: BookOpen, url: "/subjects" },
      { title: "Timetable", icon: Clock, url: "/timetable" },
      { title: "Homework", icon: FileText, url: "/homework" },
      { title: "Marks", icon: FileCheck, url: "/marks" },
      { title: "Attendance", icon: Calendar, url: "/attendance" },
      { title: "Certificates", icon: Award, url: "/certificates" },
    ],
  };

  const items = userRole ? menuItems[userRole as keyof typeof menuItems] || [] : [];

  return (
    <Sidebar className={cn(
      "border-r-0 bg-sidebar",
      collapsed ? "w-[72px]" : "w-64"
    )} collapsible="offcanvas">
      <SidebarContent className="scrollbar-thin">
        {/* Logo Section */}
        <div className="p-4 mb-2">
          <div className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-sidebar-foreground text-lg">ArchEdu</h2>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole?.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-4">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {items.map((item: any) => (
                <SidebarMenuItem key={item.title}>
                  {item.submenu ? (
                    <Collapsible defaultOpen={isGroupActive(item.submenu)} className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={cn(
                          "w-full rounded-xl transition-all duration-200",
                          isGroupActive(item.submenu) 
                            ? "bg-sidebar-accent text-sidebar-primary" 
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}>
                          <item.icon className="h-5 w-5" />
                          {!collapsed && <span className="font-medium">{item.title}</span>}
                          {!collapsed && (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent className="animate-accordion-down">
                          <SidebarMenuSub className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                            {item.submenu.map((subItem: any) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <Link 
                                    to={subItem.url}
                                    className={cn(
                                      "block rounded-lg px-3 py-2 text-sm transition-colors",
                                      isActive(subItem.url)
                                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                    )}
                                  >
                                    {subItem.title}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild>
                      <Link 
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                          isActive(item.url)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
              
              {/* Logout Button */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground/70 hover:bg-danger/20 hover:text-danger transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  {!collapsed && <span className="font-medium">Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <SidebarTrigger className="w-full justify-center rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors" />
      </div>
    </Sidebar>
  );
}
