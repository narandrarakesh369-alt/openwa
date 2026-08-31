import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface AttendanceViewProps {
  studentId?: string;
}

export function AttendanceView({ studentId }: AttendanceViewProps) {
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
    fetchSummary();
  }, [studentId]);

  const fetchAttendance = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const targetStudentId = studentId || user?.id;

    // Fetch from attendance_details with attendance join
    const { data, error } = await supabase
      .from("attendance_details")
      .select(`
        *,
        attendance!inner(date, class_id)
      `)
      .eq("student_id", targetStudentId);

    if (error) {
      toast({ title: "Error fetching attendance", variant: "destructive" });
    } else {
      setAttendanceRecords(data || []);
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const targetStudentId = studentId || user?.id;

    // Calculate summary from attendance_details
    const { data: detailsData } = await supabase
      .from("attendance_details")
      .select("status")
      .eq("student_id", targetStudentId);

    const totalDays = detailsData?.length || 0;
    const presentDays = detailsData?.filter(d => d.status === "present").length || 0;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    setSummary({
      total_days: totalDays,
      present_days: presentDays,
      percentage
    });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "present") {
      return <Badge className="bg-success text-success-foreground">Present</Badge>;
    }
    return <Badge className="bg-danger text-danger-foreground">Absent</Badge>;
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-blue-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return <div className="text-center py-8">Loading attendance...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.total_days || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Present Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{summary?.present_days || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Attendance %
              <TrendingUp className={`h-5 w-5 ${getAttendanceColor(summary?.percentage || 0)}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getAttendanceColor(summary?.percentage || 0)}`}>
              {summary?.percentage || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No attendance records found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.attendance?.date ? format(new Date(record.attendance.date), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
