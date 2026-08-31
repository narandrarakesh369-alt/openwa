import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, FileText, TrendingUp, DollarSign, Bell, User } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChildData {
  student_id: string;
  profiles: { full_name: string } | null;
  student: { photo_url: string | null; first_name: string; last_name: string } | null;
}

const ParentDashboard = () => {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [stats, setStats] = useState({
    attendancePercentage: 0,
    feeDues: 0,
    averageMarks: 0,
    pendingHomework: 0,
  });
  const [progressData, setProgressData] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildStats(selectedChild);
      fetchProgressData(selectedChild);
      fetchNotifications(selectedChild);

      // Real-time updates
      const channel = supabase
        .channel('parent-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments' }, () => fetchChildStats(selectedChild))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => {
          fetchChildStats(selectedChild);
          fetchProgressData(selectedChild);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
          fetchChildStats(selectedChild);
          fetchNotifications(selectedChild);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", user.id);

    if (data && data.length > 0) {
      const studentIds = data.map(d => d.student_id);
      
      // Fetch profiles for names
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      
      // Fetch student photos
      const { data: studentsData } = await supabase
        .from("students")
        .select("user_id, photo_url, first_name, last_name")
        .in("user_id", studentIds);

      const childrenWithPhotos: ChildData[] = data.map(child => ({
        student_id: child.student_id,
        profiles: profilesData?.find(p => p.id === child.student_id) || null,
        student: studentsData?.find(s => s.user_id === child.student_id) || null
      }));

      setChildren(childrenWithPhotos);
      setSelectedChild(data[0].student_id);
    }
  };

  const fetchChildStats = async (studentId: string) => {
    // Fetch attendance from new schema
    const { data: attendanceData } = await supabase
      .from("attendance_details")
      .select("status")
      .eq("student_id", studentId);

    const presentCount = attendanceData?.filter(a => a.status === "present").length || 0;
    const totalCount = attendanceData?.length || 0;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    // Fetch fee dues
    const { data: feesData } = await supabase
      .from("fee_payments")
      .select("amount, paid_amount")
      .eq("student_id", studentId)
      .eq("status", "pending");

    const feeDues = feesData?.reduce((sum, fee) => sum + (fee.amount - (fee.paid_amount || 0)), 0) || 0;

    // Fetch average marks
    const { data: gradesData } = await supabase
      .from("grades")
      .select("marks_obtained, total_marks")
      .eq("student_id", studentId);

    const averageMarks = gradesData && gradesData.length > 0
      ? Math.round(gradesData.reduce((acc, g) => acc + (g.marks_obtained / g.total_marks) * 100, 0) / gradesData.length)
      : 0;

    // Fetch pending homework
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId);

    if (classData) {
      const classIds = classData.map(c => c.class_id);
      const { count: homeworkCount } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .in("class_id", classIds)
        .gte("due_date", new Date().toISOString());

      setStats({
        attendancePercentage,
        feeDues,
        averageMarks,
        pendingHomework: homeworkCount || 0,
      });
    }
  };

  const fetchProgressData = async (studentId: string) => {
    const { data: grades } = await supabase
      .from("grades")
      .select("exam_name, marks_obtained, total_marks, created_at")
      .eq("student_id", studentId)
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

  const fetchNotifications = async (studentId: string) => {
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId);

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

  const selectedChildData = children.find(c => c.student_id === selectedChild);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {selectedChildData?.student && (
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage 
                src={selectedChildData.student.photo_url || undefined} 
                alt={selectedChildData.profiles?.full_name || "Student"} 
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Parent Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Monitor your child's academic progress</p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.student_id} value={child.student_id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={child.student?.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    {child.profiles?.full_name || "Unknown"}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Fee Dues</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.feeDues}</div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exam Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageMarks}%</div>
            <p className="text-xs text-muted-foreground">Average marks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Homework Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingHomework}</div>
            <p className="text-xs text-muted-foreground">Pending assignments</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart and Notifications */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Child's Progress Overview</CardTitle>
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
            <CardTitle>Notifications & Updates</CardTitle>
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
    </div>
  );
};

export default ParentDashboard;
