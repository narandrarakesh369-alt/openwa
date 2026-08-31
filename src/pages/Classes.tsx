import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { ClassManagement } from "@/components/admin/ClassManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeacherClass {
  id: string;
  name: string;
  section: string;
  studentCount: number;
}

const Classes = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
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
        if (roleData.role !== "school_admin" && roleData.role !== "teacher") {
          navigate("/dashboard");
        }
        if (roleData.role === "teacher") {
          await fetchTeacherClasses(session.user.id);
        }
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchTeacherClasses = async (userId: string) => {
    // Fetch classes where this teacher is the class teacher
    const { data: classes, error } = await supabase
      .from("classes")
      .select("id, name, section")
      .eq("teacher_id", userId)
      .order("name");

    if (error) {
      console.error("Error fetching teacher classes:", error);
      return;
    }

    if (classes && classes.length > 0) {
      // Fetch student counts for each class
      const classIds = classes.map(c => c.id);
      const { data: studentCounts } = await supabase
        .from("class_students")
        .select("class_id")
        .in("class_id", classIds);

      const countMap: Record<string, number> = {};
      (studentCounts || []).forEach(sc => {
        countMap[sc.class_id] = (countMap[sc.class_id] || 0) + 1;
      });

      setTeacherClasses(classes.map(c => ({
        ...c,
        studentCount: countMap[c.id] || 0,
      })));
    }
  };

  if (!userRole) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <header className="flex items-center h-14 border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <h1 className="ml-3 text-lg font-semibold">
            {userRole === "teacher" ? "My Classes" : "Class Management"}
          </h1>
        </header>
        <div className="flex flex-1 w-full">
          <AppSidebar userRole={userRole} />
          <main className="flex-1 p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                {userRole === "teacher" ? "My Classes" : "Class Management"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {userRole === "teacher" ? "Classes assigned to you" : "Create and manage classes"}
              </p>
            </div>

            {userRole === "school_admin" && <ClassManagement />}

            {userRole === "teacher" && (
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Classes</CardTitle>
                  <CardDescription>Classes where you are the class teacher</CardDescription>
                </CardHeader>
                <CardContent>
                  {teacherClasses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No classes assigned to you yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class Name</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teacherClasses.map(cls => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-medium">{cls.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{cls.section || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {cls.studentCount}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Classes;
