import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Calendar,
  Award,
  ClipboardCheck,
  BookOpen,
  Settings,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    const fetchSchoolInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("school_id, schools:school_id(name, logo_url)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData?.schools) {
          const schoolObj: any = roleData.schools;
          setSchoolInfo({
            name: schoolObj.name || "School Portal",
            logo_url: schoolObj.logo_url || null,
          });
        }
      } catch (e) {
        console.error("Failed to load school info for student sidebar:", e);
      }
    };

    fetchSchoolInfo();
  }, []);

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
    { title: "Admission Letter", icon: FileText, path: "/student/admission-letter" },
    { title: "Paid Fee Receipt", icon: Receipt, path: "/student/fee-receipt" },
    { title: "My Timetable", icon: Calendar, path: "/student/timetable" },
    { title: "My Report Card", icon: Award, path: "/student/report-card" },
    { title: "Test Results", icon: ClipboardCheck, path: "/student/test-results" },
    { title: "Exam Results", icon: ClipboardCheck, path: "/student/exam-results" },
    { title: "Home Assignments", icon: BookOpen, path: "/student/homework" },
    { title: "Account Settings", icon: Settings, path: "/student/settings" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          {schoolInfo?.logo_url && !imageError ? (
            <div className="h-9 w-9 rounded-xl bg-white/95 border border-border/50 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
              <img 
                src={schoolInfo.logo_url} 
                alt="Logo" 
                className="max-h-full max-w-full object-contain"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm">
              {schoolInfo?.name ? schoolInfo.name.charAt(0).toUpperCase() : <GraduationCap className="h-5 w-5" />}
            </div>
          )}
          <div className="overflow-hidden">
            <h2 className="text-sm font-semibold truncate leading-tight">
              {schoolInfo?.name || "Student Portal"}
            </h2>
            <p className="text-[11px] text-muted-foreground">Student Portal</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
