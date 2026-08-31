import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LeaveManagement } from "@/components/teacher/LeaveManagement";

const Leave = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role);
        if (roleData.role !== "teacher" && roleData.role !== "school_admin") {
          navigate("/dashboard");
        }
      }
    };

    checkAuth();
  }, [navigate]);

  if (!userRole) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">Leave Management</h1>
        </header>
        <div className="flex flex-1 w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-8 bg-background">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Leave Management</h1>
              <p className="text-muted-foreground mt-2">
                {userRole === "teacher" ? "Apply and track your leave requests" : "Manage teacher leave requests"}
              </p>
            </div>
            <LeaveManagement userRole={userRole as "teacher" | "school_admin"} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Leave;
