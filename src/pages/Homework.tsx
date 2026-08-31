import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HomeworkManagement } from "@/components/teacher/HomeworkManagement";
import { HomeworkList } from "@/components/student/HomeworkList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

const Homework = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<any[]>([]);
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (roleData) {
      setUserRole(roleData.role);
      
      if (roleData.role === "school_admin") {
        await fetchAllHomework();
      } else if (roleData.role === "parent") {
        await fetchParentHomework(session.user.id);
      }
    }

    setLoading(false);
  };

  const fetchAllHomework = async () => {
    const { data, error } = await supabase
      .from("homework")
      .select(`
        *,
        class:class_id(name, section),
        subject:subject_id(name)
      `)
      .order("due_date", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching homework",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch teacher names separately
    const teacherIds = [...new Set((data || []).map(hw => hw.teacher_id).filter(Boolean))];
    let teacherMap: Record<string, string> = {};
    
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teacherIds);
      
      if (profiles) {
        teacherMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
      }
    }

    const homeworkWithTeachers = (data || []).map(hw => ({
      ...hw,
      teacher: { full_name: teacherMap[hw.teacher_id] || "Unknown" }
    }));

    setHomework(homeworkWithTeachers);
  };

  const fetchParentHomework = async (parentId: string) => {
    // Get parent's children
    const { data: children } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    if (!children || children.length === 0) return;

    // Get children's classes
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .in("student_id", children.map(c => c.student_id));

    if (!classData) return;

    const classIds = [...new Set(classData.map(c => c.class_id))];

    // Get homework for those classes
    const { data, error } = await supabase
      .from("homework")
      .select(`
        *,
        class:class_id(name, section),
        subject:subject_id(name),
        submissions:homework_submissions!homework_submissions_homework_id_fkey(*)
      `)
      .in("class_id", classIds)
      .order("due_date", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching homework",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch teacher names separately
    const teacherIds = [...new Set((data || []).map(hw => hw.teacher_id).filter(Boolean))];
    const studentIds = children.map(c => c.student_id);
    let teacherMap: Record<string, string> = {};
    let studentMap: Record<string, string> = {};
    
    if (teacherIds.length > 0 || studentIds.length > 0) {
      const allIds = [...new Set([...teacherIds, ...studentIds])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allIds);
      
      if (profiles) {
        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
        teacherIds.forEach(id => { teacherMap[id] = profileMap[id] || "Unknown"; });
        studentIds.forEach(id => { studentMap[id] = profileMap[id] || "Unknown"; });
      }
    }

    const homeworkWithDetails = (data || []).map(hw => ({
      ...hw,
      teacher: { full_name: teacherMap[hw.teacher_id] || "Unknown" },
      submissions: (hw.submissions || [])
        .filter((s: any) => studentIds.includes(s.student_id))
        .map((s: any) => ({
          ...s,
          student: { full_name: studentMap[s.student_id] || "Unknown" }
        }))
    }));

    setHomework(homeworkWithDetails);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Teacher gets management interface
  if (userRole === "teacher") {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-4 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                Homework Management
              </h1>
              <p className="text-muted-foreground mt-2">Create and manage homework assignments</p>
            </div>
            <HomeworkManagement />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Student gets submission interface
  if (userRole === "student") {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-4 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                My Homework
              </h1>
              <p className="text-muted-foreground mt-2">View and submit your homework assignments</p>
            </div>
            <HomeworkList />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Admin and Parent get read-only view
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar userRole={userRole} />
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              {userRole === "school_admin" ? "All Homework" : "Child's Homework"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userRole === "school_admin" ? "View all homework assignments" : "View your child's homework"}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Homework List</CardTitle>
              <CardDescription>All homework assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {homework.map((hw) => (
                  <div key={hw.id} className="p-4 border rounded-md">
                    <div className="font-semibold">{hw.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {hw.class?.name} {hw.class?.section || ""} • {hw.subject?.name} • {hw.teacher?.full_name}
                    </div>
                    <p className="text-sm mt-2">{hw.description}</p>
                    {hw.submissions && hw.submissions.length > 0 && (
                      <div className="mt-2 text-sm">
                        <strong>Status:</strong> Submitted by {hw.submissions[0].student?.full_name}
                        {hw.submissions[0].grade !== null && ` • Grade: ${hw.submissions[0].grade}/100`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Homework;
