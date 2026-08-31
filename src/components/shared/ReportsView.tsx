import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ReportsView = ({ studentId }: { studentId?: string }) => {
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
  }, [studentId]);

  const fetchReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetStudentId = studentId || user.id;

    const [gradesRes, attendanceRes] = await Promise.all([
      supabase
        .from("grades")
        .select("*, subjects(name)")
        .eq("student_id", targetStudentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("attendance_details")
        .select("*, attendance(*)")
        .eq("student_id", targetStudentId)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    if (gradesRes.data) setGrades(gradesRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
  };

  const downloadReport = () => {
    // Generate a simple CSV report
    const csvContent = [
      ["Subject", "Exam", "Marks Obtained", "Total Marks", "Grade"].join(","),
      ...grades.map(g => [
        g.subjects?.name,
        g.exam_name,
        g.marks_obtained,
        g.total_marks,
        g.grade
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const attendancePercentage = attendance.length > 0
    ? ((attendance.filter(a => a.status === "present").length / attendance.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Academic Report</CardTitle>
              <CardDescription>View grades and attendance summary</CardDescription>
            </div>
            <Button onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Attendance Summary</h3>
            <p className="text-2xl font-bold">{attendancePercentage}%</p>
            <p className="text-sm text-muted-foreground">
              {attendance.filter(a => a.status === "present").length} present out of {attendance.length} days
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-3">Grades</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{grade.subjects?.name}</TableCell>
                  <TableCell>{grade.exam_name}</TableCell>
                  <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                  <TableCell>
                    <Badge>{grade.grade || "N/A"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {grades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No grades available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
