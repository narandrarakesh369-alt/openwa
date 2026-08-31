import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Loader2 } from "lucide-react";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import SchoolAdminDashboard from "@/components/dashboards/SchoolAdminDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role);
        
        // Redirect students to their dedicated portal
        if (roleData.role === "student") {
          navigate("/student/dashboard");
          return;
        }
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case "super_admin":
        return <SuperAdminDashboard />;
      case "school_admin":
        return <SchoolAdminDashboard />;
      case "teacher":
        return <TeacherDashboard />;
      case "student":
        return <StudentDashboard />;
      case "parent":
        return <ParentDashboard />;
      default:
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold">Welcome!</h1>
            <p className="text-muted-foreground mt-2">
              No role assigned yet. Please contact your administrator.
            </p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">
            {userRole === "super_admin" ? "Super Admin" : 
             userRole === "school_admin" ? "School Admin" : 
             userRole === "teacher" ? "Teacher" : "Dashboard"}
          </h1>
        </header>
        <div className="flex flex-1 w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 overflow-auto">
            {renderDashboard()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
