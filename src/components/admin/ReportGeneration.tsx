import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Download, TrendingUp, Users, Calendar, BookOpen, MessageSquare, Loader2 } from "lucide-react";
import { format, subMonths } from "date-fns";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ReportGeneration = () => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("attendance");
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [schoolId, setSchoolId] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("School");

  useEffect(() => {
    fetchClasses();
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("school_id, schools:school_id(name)").eq("user_id", user.id).maybeSingle();
    if (data?.school_id) {
      setSchoolId(data.school_id);
      const sObj: any = data.schools;
      if (sObj?.name) setSchoolName(sObj.name);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("name");

    if (data) {
      setClasses(data);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", selectedClass);

    if (data && data.length > 0) {
      const studentIds = data.map(s => s.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      setStudents(profiles || []);
    } else {
      setStudents([]);
    }
  };

  const generateAttendanceReport = async () => {
    if (selectedStudent && selectedStudent !== "all") {
      // For new schema, fetch attendance_details instead
      const { data: detailsData, error: detailsError } = await supabase
        .from("attendance_details")
        .select("status, attendance_id, attendance!inner(date, class_id)")
        .eq("student_id", selectedStudent)
        .gte("attendance.date", dateFrom)
        .lte("attendance.date", dateTo);

      if (detailsError) throw detailsError;

      const totalDays = detailsData?.length || 0;
      const presentDays = detailsData?.filter((a: any) => a.status === "present").length || 0;
      const absentDays = detailsData?.filter((a: any) => a.status === "absent").length || 0;

      const chartData = [
        { name: "Present", value: presentDays, percentage: totalDays > 0 ? (presentDays / totalDays * 100).toFixed(1) : 0 },
        { name: "Absent", value: absentDays, percentage: totalDays > 0 ? (absentDays / totalDays * 100).toFixed(1) : 0 },
      ];

      return {
        summary: {
          totalDays,
          presentDays,
          absentDays,
          attendanceRate: totalDays > 0 ? (presentDays / totalDays * 100).toFixed(1) : 0
        },
        chartData
      };
    }

    const totalDays = 0;
    const presentDays = 0;
    const absentDays = 0;

    const chartData = [
      { name: "Present", value: presentDays, percentage: 0 },
      { name: "Absent", value: absentDays, percentage: 0 },
    ];

    return {
      summary: {
        totalDays,
        presentDays,
        absentDays,
        attendanceRate: 0
      },
      chartData
    };
  };

  const generateAcademicReport = async () => {
    const query = supabase
      .from("grades")
      .select(`
        *,
        subject:subject_id(name)
      `)
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo);

    if (selectedClass) query.eq("class_id", selectedClass);
    if (selectedStudent && selectedStudent !== "all") query.eq("student_id", selectedStudent);

    const { data, error } = await query;

    if (error) throw error;

    const subjectStats: any = {};
    data?.forEach((grade: any) => {
      const subjectName = grade.subject?.name || "Unknown";
      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { total: 0, count: 0, marks: [] };
      }
      subjectStats[subjectName].total += grade.marks_obtained;
      subjectStats[subjectName].count += 1;
      subjectStats[subjectName].marks.push(grade.marks_obtained);
    });

    const chartData = Object.entries(subjectStats).map(([name, stats]: [string, any]) => ({
      subject: name,
      average: (stats.total / stats.count).toFixed(1),
      count: stats.count
    }));

    const overallAverage = data?.length > 0
      ? (data.reduce((sum, g) => sum + g.marks_obtained, 0) / data.length).toFixed(1)
      : 0;

    return {
      summary: {
        totalExams: data?.length || 0,
        overallAverage,
        subjectCount: Object.keys(subjectStats).length
      },
      chartData
    };
  };

  const generateHomeworkReport = async () => {
    const { data: homeworkData } = await supabase
      .from("homework")
      .select(`
        id,
        title,
        due_date,
        subject:subject_id(name),
        submissions:homework_submissions(*)
      `)
      .eq("class_id", selectedClass || "")
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo);

    const totalHomework = homeworkData?.length || 0;
    let totalSubmissions = 0;
    let onTimeSubmissions = 0;
    let gradedSubmissions = 0;

    homeworkData?.forEach(hw => {
      const submissions = hw.submissions || [];
      totalSubmissions += submissions.length;
      onTimeSubmissions += submissions.filter((s: any) => 
        new Date(s.submitted_at) <= new Date(hw.due_date)
      ).length;
      gradedSubmissions += submissions.filter((s: any) => s.grade !== null).length;
    });

    const chartData = [
      { name: "Submitted", value: totalSubmissions },
      { name: "On Time", value: onTimeSubmissions },
      { name: "Graded", value: gradedSubmissions }
    ];

    return {
      summary: {
        totalHomework,
        totalSubmissions,
        submissionRate: totalHomework > 0 ? (totalSubmissions / totalHomework * 100).toFixed(1) : 0,
        onTimeRate: totalSubmissions > 0 ? (onTimeSubmissions / totalSubmissions * 100).toFixed(1) : 0,
        gradedCount: gradedSubmissions
      },
      chartData
    };
  };

  const handleGenerateReport = async () => {
    if (!selectedClass && reportType !== "comprehensive") {
      toast({
        title: "Please select a class",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let data;
      
      switch (reportType) {
        case "attendance":
          data = await generateAttendanceReport();
          break;
        case "academic":
          data = await generateAcademicReport();
          break;
        case "homework":
          data = await generateHomeworkReport();
          break;
        case "comprehensive":
          const [attendance, academic, homework] = await Promise.all([
            generateAttendanceReport(),
            generateAcademicReport(),
            generateHomeworkReport()
          ]);
          data = { attendance, academic, homework };
          break;
      }

      setReportData(data);

      // Save report to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("reports").insert([{
          report_type: reportType as any,
          title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
          class_id: selectedClass || null,
          student_id: selectedStudent || null,
          generated_by: user.id,
          date_from: dateFrom,
          date_to: dateTo,
          summary_json: data as any
        }]);
      }

      toast({ title: "Report generated successfully" });
    } catch (error: any) {
      toast({
        title: "Error generating report",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const renderAttendanceReport = (data: any) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.presentDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.absentDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.percentage}%`}
              >
                {data.chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderAcademicReport = (data: any) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalExams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.summary.overallAverage}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.subjectCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="average" fill="#8884d8" name="Average Marks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderHomeworkReport = (data: any) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Homework</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalHomework}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSubmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submission Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.submissionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.summary.onTimeRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Homework Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const handleShareReportWhatsApp = async () => {
    if (!schoolId || !reportData) return;
    setSendingWhatsApp(true);

    try {
      if (selectedStudent && selectedStudent !== "all") {
        const { data: student } = await supabase
          .from("students")
          .select("id, first_name, last_name, father_name, father_phone, mother_phone, phone")
          .eq("school_id", schoolId)
          .or(`id.eq.${selectedStudent},user_id.eq.${selectedStudent}`)
          .maybeSingle();

        const parentPhone = student?.father_phone || student?.mother_phone || student?.phone;
        if (!parentPhone) {
          toast({ title: "No parent phone number found for this student", variant: "destructive" });
          setSendingWhatsApp(false);
          return;
        }

        let summaryText = "";
        if (reportType === "attendance" && reportData.summary) {
          summaryText = `📊 Attendance Rate: *${reportData.summary.attendanceRate}%* (Present: ${reportData.summary.presentDays}, Absent: ${reportData.summary.absentDays})`;
        } else if (reportType === "academic" && reportData.summary) {
          summaryText = `📚 Academic Average: *${reportData.summary.overallAverage}%* across ${reportData.summary.subjectCount} subjects`;
        } else if (reportType === "homework" && reportData.summary) {
          summaryText = `📝 Homework Submissions: *${reportData.summary.submissionRate}%* on time`;
        } else if (reportType === "comprehensive") {
          summaryText = `📊 Attendance: *${reportData.attendance?.summary?.attendanceRate}%*\n📚 Academic Avg: *${reportData.academic?.summary?.overallAverage}%*\n📝 Homework: *${reportData.homework?.summary?.submissionRate}%*`;
        }

        const msg = `📑 *${schoolName} - Progress Report Card*\n\nDear ${student?.father_name || "Parent"},\n\nHere is the report card summary for *${student?.first_name} ${student?.last_name}* (${dateFrom} to ${dateTo}):\n\n${summaryText}\n\n— *${schoolName}*`;

        const res = await sendWhatsAppMessage({
          schoolId,
          phone: parentPhone,
          message: msg,
          messageType: "Notice",
          studentId: student?.id,
        });

        if (res.success) {
          toast({ title: "✅ Report Card Sent to Parent WhatsApp!" });
        } else {
          toast({ title: "Failed to send report card", variant: "destructive" });
        }
      } else {
        const classObj = classes.find((c) => c.id === selectedClass);
        const className = classObj ? `${classObj.name} ${classObj.section || ""}` : "Class";

        const { data: waRes } = await supabase.functions.invoke("announcement-notification", {
          body: {
            title: `Progress Report: ${className}`,
            message: `Term progress reports for ${className} (${dateFrom} to ${dateTo}) have been prepared. Check the parent portal or school records for detailed breakdown.`,
            announcementType: "general",
            targetAudience: `class:${selectedClass}`,
            schoolId,
          },
        });

        toast({
          title: "Class Report Broadcasted",
          description: `Notified ${waRes?.whatsappSent || 0} parents via WhatsApp.`,
        });
      }
    } catch (e: any) {
      toast({ title: "Error sharing report", description: e.message, variant: "destructive" });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>Select parameters and generate detailed reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance Report</SelectItem>
                  <SelectItem value="academic">Academic Performance</SelectItem>
                  <SelectItem value="homework">Homework Report</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {cls.section || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student (Optional)</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map((student: any) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={handleShareReportWhatsApp}
              disabled={sendingWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2"
            >
              {sendingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {selectedStudent && selectedStudent !== "all" ? "Send Report Card to Parent WhatsApp" : "Broadcast Class Report via WhatsApp"}
            </Button>
          </div>

          {reportType === "attendance" && renderAttendanceReport(reportData)}
          {reportType === "academic" && renderAcademicReport(reportData)}
          {reportType === "homework" && renderHomeworkReport(reportData)}
          {reportType === "comprehensive" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent>{renderAttendanceReport(reportData.attendance)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Academic Performance</CardTitle>
                </CardHeader>
                <CardContent>{renderAcademicReport(reportData.academic)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Homework Progress</CardTitle>
                </CardHeader>
                <CardContent>{renderHomeworkReport(reportData.homework)}</CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
