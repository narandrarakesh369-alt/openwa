import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle, XCircle, Clock } from "lucide-react";

export const StudentAttendanceReport = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentReport();
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

  const fetchStudentReport = async () => {
    if (!selectedClass) return;
    setLoading(true);

    // Get students enrolled in the class
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", selectedClass);

    if (!classStudents || classStudents.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = classStudents.map(cs => cs.student_id);

    // Get student profiles
    const { data: studentData } = await supabase
      .from("students")
      .select("user_id, first_name, last_name, enrollment_number")
      .in("user_id", studentIds);

    // Get all attendance records for this class
    const { data: attendanceRecords } = await supabase
      .from("attendance")
      .select("id, date")
      .eq("class_id", selectedClass);

    const totalDays = attendanceRecords?.length || 0;
    const attIds = (attendanceRecords || []).map(a => a.id);

    // Get all attendance details
    let allDetails: any[] = [];
    if (attIds.length > 0) {
      const { data: details } = await supabase
        .from("attendance_details")
        .select("student_id, status")
        .in("attendance_id", attIds);
      allDetails = details || [];
    }

    // Build per-student stats
    const studentStats = (studentData || []).map(s => {
      const myDetails = allDetails.filter(d => d.student_id === s.user_id);
      const present = myDetails.filter(d => d.status === "present").length;
      const absent = myDetails.filter(d => d.status === "absent").length;
      const late = myDetails.filter(d => d.status === "late").length;
      const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

      return {
        id: s.user_id,
        name: `${s.first_name} ${s.last_name}`,
        enrollment: s.enrollment_number || "—",
        totalDays,
        present,
        absent,
        late,
        percentage,
      };
    });

    studentStats.sort((a, b) => a.name.localeCompare(b.name));
    setStudents(studentStats);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Student Attendance Report</h1>
        <p className="text-muted-foreground mt-1">Individual student attendance summary by class</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student-wise Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground">No students found in this class.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Enrollment No.</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Present</span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> Absent</span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> Late</span>
                    </TableHead>
                    <TableHead>Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, idx) => (
                    <TableRow key={student.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.enrollment}</TableCell>
                      <TableCell>{student.totalDays}</TableCell>
                      <TableCell className="text-green-600 font-medium">{student.present}</TableCell>
                      <TableCell className="text-red-600 font-medium">{student.absent}</TableCell>
                      <TableCell className="text-yellow-600 font-medium">{student.late}</TableCell>
                      <TableCell>
                        <Badge variant={student.percentage >= 80 ? "default" : student.percentage >= 60 ? "secondary" : "destructive"}>
                          {student.percentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
