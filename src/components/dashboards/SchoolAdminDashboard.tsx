import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCog, TrendingDown, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { PlanInfoCard } from "@/components/admin/PlanInfoCard";
import { useToast } from "@/hooks/use-toast";

const SchoolAdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEmployees: 0,
    expenses: 0,
    profit: 0,
  });

  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any[]>([]);

  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get school_id
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.school_id) return;
      
      setSchoolId(userRole.school_id);

      // Fetch students count via user_roles (reliable cross-table query)
      const { count: studentsCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("school_id", userRole.school_id)
        .eq("role", "student");

      // Fetch employee count from both teachers and staff tables (matching StaffList behavior)
      const { count: teachersCount } = await (supabase as any)
        .from("teachers")
        .select("*", { count: "exact", head: true })
        .eq("school_id", userRole.school_id);

      const { count: staffCount } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("school_id", userRole.school_id);

      setStats({
        totalStudents: studentsCount || 0,
        totalEmployees: (teachersCount || 0) + (staffCount || 0),
        expenses: 0, // TODO: Calculate from salary and other expenses
        profit: 0, // TODO: Calculate from fees - expenses
      });

      // TODO: Replace with real data from fee_payments and salary_records
      setExpenseData([
        { month: "Jul 2025", expenses: 2000, income: 5000 },
        { month: "Aug 2025", expenses: 2500, income: 5500 },
        { month: "Sep 2025", expenses: 3000, income: 6000 },
        { month: "Oct 2025", expenses: 2800, income: 5800 },
        { month: "Nov 2025", expenses: 3200, income: 6200 },
      ]);

      // TODO: Replace with real student distribution data
      setStudentData([
        { grade: "0.2", students: 10 },
        { grade: "0.4", students: 25 },
        { grade: "0.6", students: 40 },
        { grade: "0.8", students: 30 },
        { grade: "1.0", students: 15 },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };



  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Welcome to your school management dashboard</p>
        </div>
      </div>

      {/* Plan Info Card */}
      <PlanInfoCard />
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <UserCog className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹ {stats.expenses}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹ {stats.profit}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                <Line type="monotone" dataKey="income" stroke="#3b82f6" name="Income" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={studentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" fill="#3b82f6" name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today Absent Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">0%</p>
            <p className="text-xs text-muted-foreground">No Student Absent Today yet !</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today Present Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Informations Not Added Yet !</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estimated Fee This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Estimated</p>
                <p className="text-2xl font-bold text-red-500">₹ 5,000</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold text-green-500">₹ 0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
