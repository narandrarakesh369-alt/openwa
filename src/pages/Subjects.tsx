import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SubjectManagement } from "@/components/admin/SubjectManagement";
import { SubjectView } from "@/components/shared/SubjectView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

const Subjects = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
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
      
      if (roleData.role === "teacher") {
        await fetchTeacherSubjects(session.user.id);
      } else if (roleData.role === "student") {
        await fetchStudentSubjects(session.user.id);
      } else if (roleData.role === "parent") {
        await fetchParentSubjects(session.user.id);
      }
    }

    setLoading(false);
  };

  const fetchTeacherSubjects = async (teacherId: string) => {
    const { data, error } = await supabase
      .from("subjects")
      .select(`
        *,
        class:class_id (
          name,
          section
        )
      `)
      .eq("teacher_id", teacherId)
      .order("name");

    if (error) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubjects(data || []);
    }
  };

  const fetchStudentSubjects = async (studentId: string) => {
    // Get student's class
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!classData) return;

    // Get subjects for that class (no embedded joins)
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("class_id", classData.class_id)
      .order("name");

    if (error) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive",
      });
    } else if (data && data.length > 0) {
      // Fetch teacher names separately
      const teacherIds = [...new Set(data.map(s => s.teacher_id).filter(Boolean))];
      let teacherMap: Record<string, any> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", teacherIds);
        teacherMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }
      setSubjects(data.map(s => ({ ...s, teacher: teacherMap[s.teacher_id] || null })));
    } else {
      setSubjects([]);
    }
  };

  const fetchParentSubjects = async (parentId: string) => {
    // Get parent's children
    const { data: children } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    if (!children || children.length === 0) return;

    // Get children's classes
    const { data: classes } = await supabase
      .from("class_students")
      .select("class_id")
      .in("student_id", children.map(c => c.student_id));

    if (!classes) return;

    const classIds = [...new Set(classes.map(c => c.class_id))];

    // Get subjects for those classes (no embedded joins)
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .in("class_id", classIds)
      .order("name");

    if (error) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive",
      });
    } else if (data && data.length > 0) {
      // Fetch class and teacher data separately
      const teacherIds = [...new Set(data.map(s => s.teacher_id).filter(Boolean))];
      const [classesRes, profilesRes] = await Promise.all([
        supabase.from("classes").select("id, name, section").in("id", classIds),
        teacherIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", teacherIds) : { data: [] },
      ]);
      const classMap = Object.fromEntries((classesRes.data || []).map(c => [c.id, c]));
      const teacherMap = Object.fromEntries(((profilesRes as any).data || []).map((p: any) => [p.id, p]));
      setSubjects(data.map(s => ({ ...s, class: classMap[s.class_id] || null, teacher: teacherMap[s.teacher_id] || null })));
    } else {
      setSubjects([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // School admin gets the management interface
  if (userRole === "school_admin") {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-4 md:p-8">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                Subject Management
              </h1>
              <p className="text-muted-foreground mt-2">Create and manage subjects for your school</p>
            </div>
            <SubjectManagement />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Other roles get the view-only interface
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar userRole={userRole} />
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              {userRole === "teacher" ? "My Subjects" : "Class Subjects"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userRole === "teacher"
                ? "Subjects you are teaching"
                : userRole === "student"
                ? "Your class subjects"
                : "Your child's class subjects"}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>
                {userRole === "teacher" && "Subjects assigned to you"}
                {userRole === "student" && "All subjects in your class"}
                {userRole === "parent" && "Subjects for your child's class"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubjectView 
                subjects={subjects} 
                showTeacher={userRole !== "teacher"}
                showClass={userRole === "teacher" || userRole === "parent"}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Subjects;
