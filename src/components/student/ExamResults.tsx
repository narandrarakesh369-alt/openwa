import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ExamResults() {
  const [exams, setExams] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchMarks();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", user?.id);

    if (classData && classData.length > 0) {
      const { data: examData } = await supabase
        .from("exams")
        .select("*")
        .in("class_id", classData.map(c => c.class_id))
        .order("start_date", { ascending: false });
      
      setExams(examData || []);
      if (examData && examData.length > 0) {
        setSelectedExam(examData[0].id);
      }
    }
  };

  const fetchMarks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from("marks")
      .select("*, subjects(name)")
      .eq("exam_id", selectedExam)
      .eq("student_id", user?.id);

    setMarks(data || []);

    // Prepare chart data
    const chartData = (data || []).map(m => ({
      subject: m.subjects?.name,
      marks: m.marks_obtained,
    }));
    setChartData(chartData);
  };

  const getGradeColor = (grade: string) => {
    if (grade === "A+" || grade === "A") return "default";
    if (grade === "B" || grade === "C") return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Exam Results</h2>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.exam_name} - {exam.exam_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Marks Obtained</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.map((mark) => (
              <TableRow key={mark.id}>
                <TableCell className="font-medium">{mark.subjects?.name}</TableCell>
                <TableCell>{mark.marks_obtained}/100</TableCell>
                <TableCell>
                  <Badge variant={getGradeColor(mark.grade)}>{mark.grade}</Badge>
                </TableCell>
                <TableCell>{mark.remarks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Performance Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="marks" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}