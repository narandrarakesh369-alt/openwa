import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, FileText, Calendar, Plus, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    assignedClasses: 0,
    totalStudents: 0,
    pendingAssignments: 0,
    todayAttendance: 0,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchNotifications();
    fetchPerformanceData();

    // Real-time updates
    const channel = supabase
      .channel('teacher-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch assigned classes
    const { count: classesCount } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id);

    // Fetch total students in teacher's classes
    const { data: classIds } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", user.id);

    if (classIds) {
      const { count: studentsCount } = await supabase
        .from("class_students")
        .select("*", { count: "exact", head: true })
        .in("class_id", classIds.map(c => c.id));

      // Fetch pending assignments
      const { count: assignmentsCount } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", user.id)
        .gte("due_date", new Date().toISOString());

      // Fetch today's attendance sessions submitted
      const today = new Date().toISOString().split("T")[0];
      const { count: attendanceCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("submitted_by", user.id)
        .eq("date", today);

      setStats({
        assignedClasses: classesCount || 0,
        totalStudents: studentsCount || 0,
        pendingAssignments: assignmentsCount || 0,
        todayAttendance: attendanceCount || 0,
      });
    }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("title, due_date")
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(5);

    setNotifications(data || []);
  };

  const fetchPerformanceData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id);

    if (classes) {
      const performancePromises = classes.map(async (cls) => {
        const { data: grades } = await supabase
          .from("grades")
          .select("marks_obtained, total_marks")
          .eq("class_id", cls.id);

        const avgPercentage = grades && grades.length > 0
          ? Math.round(grades.reduce((acc, g) => acc + (g.marks_obtained / g.total_marks) * 100, 0) / grades.length)
          : 0;

        return {
          class: cls.name,
          average: avgPercentage,
        };
      });

      const data = await Promise.all(performancePromises);
      setPerformanceData(data);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Teacher Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">Manage your classes and students</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedClasses}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">In your classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Homework</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">Upcoming assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAttendance}</div>
            <p className="text-xs text-muted-foreground">Records marked</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Performance by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#8884d8" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(notification.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming assignments</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/attendance">
            <Button className="w-full" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          </Link>
          <Button className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Homework
          </Button>
          <Button className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Upload Marks
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
