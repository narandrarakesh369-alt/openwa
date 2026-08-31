import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StudentAdmission } from "@/components/admin/StudentAdmission";
import { StudentList } from "@/components/admin/StudentList";
import { BulkStudentUpload } from "@/components/admin/BulkStudentUpload";
import { StudentPrintList } from "@/components/admin/StudentPrintList";
import { StudentLoginManagement } from "@/components/admin/StudentLoginManagement";
import { StudentPromotion } from "@/components/admin/StudentPromotion";
import { Card } from "@/components/ui/card";

const Students = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  const renderContent = () => {
    const path = location.pathname;
    
    if (path === "/students/add") {
      return <StudentAdmission />;
    }
    
    if (path === "/students/bulk-upload") {
      return <BulkStudentUpload />;
    }
    
    if (path === "/students/print") {
      return <StudentPrintList />;
    }
    
    if (path === "/students/manage-login") {
      return <StudentLoginManagement />;
    }
    
    if (path === "/students/promote") {
      return <StudentPromotion />;
    }
    
    // Default: All Students
    return <StudentList />;
  };

  if (!userRole) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">Student Management</h1>
        </header>
        <div className="flex flex-1 w-full">
          <AppSidebar userRole={userRole} />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Student Management</h1>
              <p className="text-muted-foreground">Manage students and their information</p>
            </div>
            {renderContent()}
          </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Students;
