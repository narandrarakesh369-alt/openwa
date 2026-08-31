import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { AttendanceContainer } from "@/components/attendance/AttendanceContainer";
import { ClassWiseReport } from "@/components/attendance/ClassWiseReport";
import { StudentAttendanceReport } from "@/components/attendance/StudentAttendanceReport";

const Attendance = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData) {
      setUserRole(roleData.role);
    }
  };

  if (!userRole || (userRole !== "teacher" && userRole !== "school_admin")) {
    return null;
  }

  const renderContent = () => {
    if (location.pathname === "/attendance/class-report") {
      return <ClassWiseReport />;
    }
    if (location.pathname === "/attendance/student-report") {
      return <StudentAttendanceReport />;
    }
    return <AttendanceContainer userRole={userRole as "teacher" | "school_admin"} />;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">Attendance</h1>
        </header>
        <div className="flex flex-1 w-full">
          <AppSidebar userRole={userRole} />
          <div className="flex-1 p-8 bg-background">
            {renderContent()}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Attendance;
