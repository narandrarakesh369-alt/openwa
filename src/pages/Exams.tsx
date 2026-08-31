import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ExamManagement } from "@/components/admin/ExamManagement";

const Exams = () => {
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
        if (roleData.role !== "school_admin") {
          navigate("/dashboard");
        }
      }
    };

    checkAuth();
  }, [navigate]);

  if (!userRole) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar userRole={userRole} />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Exam Management</h1>
            <p className="text-muted-foreground mt-2">Create and manage exams and exam schedules</p>
          </div>
          <ExamManagement />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Exams;
