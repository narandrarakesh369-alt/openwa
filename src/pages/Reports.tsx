import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ReportGeneration } from "@/components/admin/ReportGeneration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, TrendingUp } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Reports = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (roleData) {
      setUserRole(roleData.role);
      
      if (roleData.role === "student") {
        await generateStudentReport(session.user.id);
      } else if (roleData.role === "parent") {
        await generateParentReport(session.user.id);
      }
    }

    setLoading(false);
  };

  const generateStudentReport = async (studentId: string) => {
    try {
      // Get attendance
      const { data: attendanceData } = await supabase
        .from("attendance_details")
        .select("status")
        .eq("student_id", studentId);

      const totalDays = attendanceData?.length || 0;
      const presentDays = attendanceData?.filter(a => a.status === "present").length || 0;

      // Get grades
      const { data: gradesData } = await supabase
        .from("grades")
        .select(`
          *,
          subject:subject_id(name)
        `)
        .eq("student_id", studentId);

      const subjectStats: any = {};
      gradesData?.forEach((grade: any) => {
        const subjectName = grade.subject?.name || "Unknown";
        if (!subjectStats[subjectName]) {
          subjectStats[subjectName] = { total: 0, count: 0 };
        }
        subjectStats[subjectName].total += grade.marks_obtained;
        subjectStats[subjectName].count += 1;
      });

      const academicChart = Object.entries(subjectStats).map(([name, stats]: [string, any]) => ({
        subject: name,
        average: (stats.total / stats.count).toFixed(1)
      }));

      // Get homework
      const { data: classData } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", studentId)
        .maybeSingle();

      let homeworkStats = { total: 0, submitted: 0 };
      if (classData) {
        const { data: homeworkData } = await supabase
          .from("homework")
          .select(`
            id,
            submissions:homework_submissions!homework_submissions_homework_id_fkey(*)
          `)
          .eq("class_id", classData.class_id);

        homeworkStats.total = homeworkData?.length || 0;
        homeworkStats.submitted = homeworkData?.filter(hw => 
          hw.submissions && hw.submissions.length > 0
        ).length || 0;
      }

      setReportData({
        attendance: {
          totalDays,
          presentDays,
          rate: totalDays > 0 ? (presentDays / totalDays * 100).toFixed(1) : 0
        },
        academic: academicChart,
        homework: homeworkStats
      });
    } catch (error: any) {
      toast({
        title: "Error generating report",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateParentReport = async (parentId: string) => {
    const { data: children } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    if (children && children.length > 0) {
      await generateStudentReport(children[0].student_id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Admin and Teacher get report generation interface
  if (userRole === "school_admin" || userRole === "teacher") {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-4 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Reports & Analytics
              </h1>
              <p className="text-muted-foreground mt-2">Generate and view detailed reports</p>
            </div>
            <ReportGeneration />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Students and Parents get personal reports
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar userRole={userRole} />
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              {userRole === "student" ? "My Performance Report" : "Child's Performance Report"}
            </h1>
            <p className="text-muted-foreground mt-2">View academic progress and statistics</p>
          </div>

          {reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{reportData.attendance.rate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {reportData.attendance.presentDays} / {reportData.attendance.totalDays} days
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Homework Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.homework.total > 0 
                        ? ((reportData.homework.submitted / reportData.homework.total) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reportData.homework.submitted} / {reportData.homework.total} submitted
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.academic.length}</div>
                    <p className="text-xs text-muted-foreground">Active subjects</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Academic Performance</CardTitle>
                  <CardDescription>Subject-wise average marks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.academic}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="average" fill="#8884d8" name="Average Marks" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Overview</CardTitle>
                  <CardDescription>Overall attendance statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Present", value: reportData.attendance.presentDays },
                          { name: "Absent", value: reportData.attendance.totalDays - reportData.attendance.presentDays }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {[0, 1].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
