import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import { StudentAdmissionLetter } from "@/components/student/StudentAdmissionLetter";
import { StudentFeeReceipt } from "@/components/student/StudentFeeReceipt";
import { TimetableView } from "@/components/shared/TimetableView";
import { StudentReportCard } from "@/components/student/StudentReportCard";
import { ExamResults } from "@/components/student/ExamResults";
import { HomeworkList } from "@/components/student/HomeworkList";
import { StudentSettings } from "@/components/student/StudentSettings";
import { StudentMembershipView } from "@/components/student/StudentMembershipView";

const StudentPortal = () => {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accountFrozen, setAccountFrozen] = useState(false);
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
        if (roleData.role !== "student") {
          navigate("/dashboard");
          return;
        }

        // Check account status
        const { data: profileData } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData?.account_status === "Frozen") {
          setAccountFrozen(true);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const renderContent = () => {
    const path = location.pathname;
    
    switch (path) {
      case "/student/dashboard":
        return <StudentDashboard />;
      case "/student/admission-letter":
        return <StudentAdmissionLetter />;
      case "/student/fee-receipt":
        return <StudentFeeReceipt />;
      case "/student/timetable":
        return <TimetableView />;
      case "/student/report-card":
        return <StudentReportCard />;
      case "/student/test-results":
        return <ExamResults />;
      case "/student/exam-results":
        return <ExamResults />;
      case "/student/homework":
        return <HomeworkList />;
      case "/student/settings":
        return <StudentSettings />;
      case "/student/membership":
        return <StudentMembershipView />;
      default:
        return <StudentDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) return null;

  if (accountFrozen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-lg p-8 text-center">
          <div className="mb-4 text-destructive">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Account Frozen</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been frozen due to pending membership fee payment. 
            Please contact your parent or guardian to complete the payment.
          </p>
          <button
            onClick={() => {
              supabase.auth.signOut();
              navigate("/auth");
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">Student Portal</h1>
        </header>
        <div className="flex flex-1 w-full">
          <StudentSidebar />
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentPortal;
