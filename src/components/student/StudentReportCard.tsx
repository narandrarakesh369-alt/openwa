import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, TrendingUp, TrendingDown, Award } from "lucide-react";
import { format } from "date-fns";

export const StudentReportCard = () => {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [classData, setClassData] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [attendance, setAttendance] = useState<any>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchGrades();
    }
  }, [selectedYear, selectedTerm]);

  const fetchReportData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch student details
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (student) {
      setStudentData(student);

      // Fetch school details
      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("id", student.school_id)
        .single();

      setSchoolData(school);

      // Fetch class details
      const { data: enrollment } = await supabase
        .from("class_students")
        .select("class_id, classes(name, section)")
        .eq("student_id", user.id)
        .single();

      if (enrollment) {
        setClassData(enrollment.classes);
      }

      // Fetch available academic years
      const { data: gradeData } = await supabase
        .from("grades")
        .select("academic_year")
        .eq("student_id", user.id);

      if (gradeData) {
        const years = [...new Set(gradeData.map(g => g.academic_year))];
        setAcademicYears(years);
        if (years.length > 0) {
          setSelectedYear(years[0]);
        }
      }

      // Calculate attendance summary from attendance_details
      const { data: detailsData } = await supabase
        .from("attendance_details")
        .select("status")
        .eq("student_id", user.id);

      const totalDays = detailsData?.length || 0;
      const presentDays = detailsData?.filter(d => d.status === "present").length || 0;
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      setAttendance({
        total_days: totalDays,
        present_days: presentDays,
        percentage
      });
    }

    setLoading(false);
  };

  const fetchGrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("grades")
      .select("*, subjects(name)")
      .eq("student_id", user.id)
      .eq("academic_year", selectedYear);

    if (selectedTerm !== "all") {
      query = query.eq("term", selectedTerm);
    }

    const { data } = await query.order("created_at", { ascending: false });
    setGrades(data || []);
  };

  const calculateStats = () => {
    if (grades.length === 0) return { average: 0, total: 0, obtained: 0, percentage: 0 };

    const total = grades.reduce((sum, g) => sum + g.total_marks, 0);
    const obtained = grades.reduce((sum, g) => sum + g.marks_obtained, 0);
    const percentage = total > 0 ? (obtained / total) * 100 : 0;
    const average = grades.length > 0 ? percentage : 0;

    return { average, total, obtained, percentage };
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      "A+": "bg-green-100 text-green-800",
      "A": "bg-green-100 text-green-800",
      "B": "bg-blue-100 text-blue-800",
      "C": "bg-yellow-100 text-yellow-800",
      "D": "bg-orange-100 text-orange-800",
      "F": "bg-red-100 text-red-800",
    };
    return colors[grade] || "bg-gray-100 text-gray-800";
  };

  const handleDownload = () => {
    window.print();
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Report Card</h1>
          <p className="text-muted-foreground">Academic performance report</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="term1">Term 1</SelectItem>
              <SelectItem value="term2">Term 2</SelectItem>
              <SelectItem value="final">Final</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Report Card */}
      <Card className="max-w-5xl mx-auto">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold text-primary">{schoolData?.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{schoolData?.address}</p>
            <h3 className="text-xl font-semibold mt-4">ACADEMIC REPORT CARD</h3>
            <p className="text-sm text-muted-foreground">Academic Year: {selectedYear}</p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Student Name</p>
              <p className="font-semibold">{studentData?.first_name} {studentData?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Number</p>
              <p className="font-semibold">{studentData?.admission_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="font-semibold">
                {classData?.name} {classData?.section ? `(${classData.section})` : ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-semibold">
                {studentData?.date_of_birth ? format(new Date(studentData.date_of_birth), "PP") : "N/A"}
              </p>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{stats.percentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Overall</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.obtained}</p>
                <p className="text-xs text-muted-foreground">Total Marks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{grades.length}</p>
                <p className="text-xs text-muted-foreground">Subjects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{attendance?.percentage || 0}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </CardContent>
            </Card>
          </div>

          {/* Grades Table */}
          <div>
            <h4 className="font-semibold mb-3">Subject-wise Performance</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className="text-center">Marks Obtained</TableHead>
                  <TableHead className="text-center">Total Marks</TableHead>
                  <TableHead className="text-center">Percentage</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => {
                  const percentage = (grade.marks_obtained / grade.total_marks) * 100;
                  return (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.subjects?.name}</TableCell>
                      <TableCell>{grade.exam_name}</TableCell>
                      <TableCell className="capitalize">{grade.term}</TableCell>
                      <TableCell className="text-center">{grade.marks_obtained}</TableCell>
                      <TableCell className="text-center">{grade.total_marks}</TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          {percentage.toFixed(1)}%
                          {percentage >= 75 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : percentage < 50 ? (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getGradeColor(grade.grade || "N/A")}>
                          {grade.grade || "N/A"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {grades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No grades available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t mt-8 flex justify-between print:mt-20">
            <div>
              <p className="text-sm font-semibold">Class Teacher</p>
              <div className="mt-6 border-b border-gray-400 w-40"></div>
            </div>
            <div>
              <p className="text-sm font-semibold">Principal</p>
              <div className="mt-6 border-b border-gray-400 w-40"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
