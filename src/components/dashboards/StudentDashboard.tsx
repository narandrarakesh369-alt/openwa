import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, TrendingUp, BookOpen, Bell } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SchoolInfo {
  name: string;
  logo_url: string | null;
  tagline: string | null;
}

const StudentDashboard = () => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [stats, setStats] = useState({
    attendancePercentage: 0,
    averageMarks: 0,
    pendingHomework: 0,
    upcomingExams: 0,
  });
  const [progressData, setProgressData] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchSchoolInfo();
    fetchStats();
    fetchProgressData();
    fetchTimetable();
    fetchNotifications();

    // Real-time updates
    const channel = supabase
      .channel('student-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        fetchStats();
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => {
        fetchStats();
        fetchProgressData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSchoolInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch student record first
    const { data: studentData } = await supabase
      .from("students")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (studentData?.school_id) {
      // Then fetch school separately
      const { data: school } = await supabase
        .from("schools")
        .select("name, logo_url, tagline")
        .eq("id", studentData.school_id)
        .maybeSingle();

      if (school) {
        setSchoolInfo(school as SchoolInfo);
      }
    }
  };

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch attendance from new schema
    const { data: attendanceData } = await supabase
      .from("attendance_details")
      .select("status")
      .eq("student_id", user.id);

    const presentCount = attendanceData?.filter(a => a.status === "present").length || 0;
    const totalCount = attendanceData?.length || 0;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    // Fetch average marks
    const { data: gradesData } = await supabase
      .from("grades")
      .select("marks_obtained, total_marks")
      .eq("student_id", user.id);

    const averageMarks = gradesData && gradesData.length > 0
      ? Math.round(gradesData.reduce((acc, g) => acc + (g.marks_obtained / g.total_marks) * 100, 0) / gradesData.length)
      : 0;

    // Fetch pending homework
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", user.id);

    if (classData) {
      const classIds = classData.map(c => c.class_id);
      const { count: homeworkCount } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .in("class_id", classIds)
        .gte("due_date", new Date().toISOString());

      setStats({
        attendancePercentage,
        averageMarks,
        pendingHomework: homeworkCount || 0,
        upcomingExams: 0,
      });
    }
  };

  const fetchProgressData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: grades } = await supabase
      .from("grades")
      .select("exam_name, marks_obtained, total_marks, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: true })
      .limit(10);

    if (grades) {
      const data = grades.map(g => ({
        exam: g.exam_name,
        percentage: Math.round((g.marks_obtained / g.total_marks) * 100),
      }));
      setProgressData(data);
    }
  };

  const fetchTimetable = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", user.id)
      .maybeSingle();

    if (classData) {
      const today = new Date().getDay();
      const { data } = await supabase
        .from("timetable")
        .select(`
          *,
          subjects(name)
        `)
        .eq("class_id", classData.class_id)
        .eq("day_of_week", today)
        .order("start_time");

      setTimetable(data || []);
    }
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", user.id);

    if (classData) {
      const classIds = classData.map(c => c.class_id);
      const { data } = await supabase
        .from("assignments")
        .select("title, due_date")
        .in("class_id", classIds)
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(5);

      setNotifications(data || []);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* School Branding Header */}
      {schoolInfo && (
        <div className="bg-card border rounded-lg p-6 flex items-center gap-6">
          {schoolInfo.logo_url && (
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              <img 
                src={schoolInfo.logo_url} 
                alt={`${schoolInfo.name} logo`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{schoolInfo.name}</h2>
            {schoolInfo.tagline && (
              <p className="text-muted-foreground italic mt-1">{schoolInfo.tagline}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground mt-2">View your academic progress and schedule</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendancePercentage}%</div>
            <p className="text-xs text-muted-foreground">Overall attendance rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Marks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageMarks}%</div>
            <p className="text-xs text-muted-foreground">Across all subjects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Homework Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingHomework}</div>
            <p className="text-xs text-muted-foreground">Upcoming assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingExams}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart and Timetable */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="exam" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Timetable</CardTitle>
          </CardHeader>
          <CardContent>
            {timetable.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetable.map((slot, index) => (
                    <TableRow key={index}>
                      <TableCell>{slot.start_time} - {slot.end_time}</TableCell>
                      <TableCell>{slot.subjects?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No classes scheduled today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
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
              <p className="text-sm text-muted-foreground">No new notifications</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
