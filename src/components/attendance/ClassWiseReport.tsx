import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, CheckCircle, XCircle } from "lucide-react";

export const ClassWiseReport = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0 });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchReport();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!roleData?.school_id) return;

    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", roleData.school_id)
      .order("name");

    setClasses(data || []);
  };

  const fetchReport = async () => {
    if (!selectedClass) return;
    setLoading(true);

    // Get all attendance records for this class
    const { data: attendanceRecords } = await supabase
      .from("attendance")
      .select("id, date, submitted_by")
      .eq("class_id", selectedClass)
      .order("date", { ascending: false })
      .limit(30);

    if (!attendanceRecords || attendanceRecords.length === 0) {
      setReportData([]);
      setSummary({ total: 0, present: 0, absent: 0 });
      setLoading(false);
      return;
    }

    // Get details for each attendance record
    const attIds = attendanceRecords.map(a => a.id);
    const { data: details } = await supabase
      .from("attendance_details")
      .select("attendance_id, student_id, status")
      .in("attendance_id", attIds);

    // Build report rows
    const rows = attendanceRecords.map(att => {
      const dayDetails = (details || []).filter(d => d.attendance_id === att.id);
      const presentCount = dayDetails.filter(d => d.status === "present").length;
      const absentCount = dayDetails.filter(d => d.status === "absent").length;
      const lateCount = dayDetails.filter(d => d.status === "late").length;
      const total = dayDetails.length;

      return {
        date: att.date,
        total,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        percentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
      };
    });

    setReportData(rows);

    // Summary
    const totalRecords = rows.reduce((s, r) => s + r.total, 0);
    const totalPresent = rows.reduce((s, r) => s + r.present, 0);
    const totalAbsent = rows.reduce((s, r) => s + r.absent, 0);
    setSummary({ total: totalRecords, present: totalPresent, absent: totalAbsent });

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Class-wise Attendance Report</h1>
        <p className="text-muted-foreground mt-1">View attendance summary by class for the last 30 days</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a class..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {cls.section || "A"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClass && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Days Recorded</p>
                    <p className="text-2xl font-bold">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{summary.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Present</p>
                    <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Absent</p>
                    <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : reportData.length === 0 ? (
                <p className="text-muted-foreground">No attendance records found for this class.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Students</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {new Date(row.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell className="text-green-600 font-medium">{row.present}</TableCell>
                        <TableCell className="text-red-600 font-medium">{row.absent}</TableCell>
                        <TableCell className="text-yellow-600 font-medium">{row.late}</TableCell>
                        <TableCell>
                          <Badge variant={row.percentage >= 80 ? "default" : row.percentage >= 60 ? "secondary" : "destructive"}>
                            {row.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
