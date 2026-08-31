import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OfficialDocuments } from "@/components/admin/OfficialDocuments";

const Documents = () => {
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
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">Official Documents</h1>
        </header>
        <div className="flex flex-1 w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-8 bg-background">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Official Documents</h1>
              <p className="text-muted-foreground mt-2">Generate TC, Bonafide, and other certificates</p>
            </div>
            <OfficialDocuments />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Documents;
