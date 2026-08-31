import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TimetableManagement } from "@/components/admin/TimetableManagement";
import { TimetableGrid } from "@/components/shared/TimetableGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Filter } from "lucide-react";

const Timetable = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole && selectedClass) {
      fetchTimetable();
    }
  }, [userRole, selectedClass, selectedStudent]);

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
        await fetchStudentClass(session.user.id);
      } else if (roleData.role === "parent") {
        await fetchParentChildren(session.user.id);
      } else if (roleData.role === "teacher") {
        // Teachers will see their own schedule
        await fetchTeacherTimetable(session.user.id);
      } else {
        await fetchClasses();
      }
    }

    setLoading(false);
  };

  const fetchStudentClass = async (studentId: string) => {
    const { data } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (data) {
      setSelectedClass(data.class_id);
    }
  };

  const fetchParentChildren = async (parentId: string) => {
    const { data } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    if (data && data.length > 0) {
      const studentIds = data.map(d => d.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const enriched = data.map(d => ({
        ...d,
        profiles: profiles?.find(p => p.id === d.student_id) || { full_name: "Unknown" },
      }));

      setStudents(enriched);
      setSelectedStudent(data[0].student_id);
      
      // Fetch class for first child
      const { data: classData } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", data[0].student_id)
        .maybeSingle();

      if (classData) {
        setSelectedClass(classData.class_id);
      }
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("name");

    if (data && data.length > 0) {
      setClasses(data);
      setSelectedClass(data[0].id);
    }
  };

  const fetchTeacherTimetable = async (teacherId: string) => {
    const { data, error } = await supabase
      .from("timetable")
      .select(`
        *,
        class:class_id (
          name,
          section
        ),
        subject:subject_id (
          name
        )
      `)
      .eq("teacher_id", teacherId)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      toast({
        title: "Error fetching timetable",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTimetableEntries(data || []);
    }
  };

  const fetchTimetable = async () => {
    if (!selectedClass) return;

    const { data, error } = await supabase
      .from("timetable")
      .select(`
        *,
        subject:subject_id (
          name
        )
      `)
      .eq("class_id", selectedClass)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      toast({
        title: "Error fetching timetable",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch teacher names separately
    if (data && data.length > 0) {
      const teacherIds = [...new Set(data.map(entry => entry.teacher_id))];
      const { data: teachers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teacherIds);

      const entriesWithTeachers = data.map(entry => ({
        ...entry,
        teacher: teachers?.find(t => t.id === entry.teacher_id) || { full_name: "Unknown" }
      }));

      setTimetableEntries(entriesWithTeachers);
    } else {
      setTimetableEntries([]);
    }
  };

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudent(studentId);
    
    const { data } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (data) {
      setSelectedClass(data.class_id);
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
              <h1 className="text-2xl md:text-3xl font-bold">Timetable Management</h1>
              <p className="text-muted-foreground mt-2">Manage class schedules and timetables</p>
            </div>
            <TimetableManagement />
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
              <Calendar className="h-8 w-8" />
              {userRole === "teacher" ? "My Teaching Schedule" : "Class Timetable"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userRole === "teacher"
                ? "View your weekly teaching schedule"
                : "View the weekly class schedule"}
            </p>
          </div>

          {/* Filters for parents */}
          {userRole === "parent" && students.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Select Child
                </CardTitle>
                <CardDescription>Choose which child's timetable to view</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedStudent} onValueChange={handleStudentChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student: any) => (
                      <SelectItem key={student.student_id} value={student.student_id}>
                        {student.profiles?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Class selector for non-admin users who can see multiple classes */}
          {userRole !== "teacher" && userRole !== "student" && classes.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Select Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Timetable Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                {userRole === "teacher" 
                  ? "Your classes for the week" 
                  : "Class schedule for the week"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timetableEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timetable entries found</p>
                </div>
              ) : (
                <TimetableGrid entries={timetableEntries} viewType={userRole as any} />
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Timetable;
