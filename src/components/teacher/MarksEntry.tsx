import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2 } from "lucide-react";
import { sendMarksNotificationWhatsApp } from "@/lib/whatsapp";

export function MarksEntry() {
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [marksData, setMarksData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [schoolId, setSchoolId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
    fetchSubjects();
    fetchSchoolId();
  }, []);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      fetchStudents();
    }
  }, [selectedExam, selectedSubject]);

  const fetchSchoolId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.school_id) {
      setSchoolId(data.school_id);
    }
  };

  const fetchExams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch exams for classes where teacher is assigned
    const { data: classTeacherExams } = await supabase
      .from("exams")
      .select("*, classes!inner(teacher_id)")
      .eq("classes.teacher_id", user?.id);

    // Fetch exams for subjects teacher teaches
    const { data: subjectExams } = await supabase
      .from("exam_subjects")
      .select("exam_id, exams!inner(*)")
      .eq("teacher_id", user?.id);

    // Combine and deduplicate exams
    const allExams = [...(classTeacherExams || [])];
    subjectExams?.forEach((es: any) => {
      if (es.exams && !allExams.find(e => e.id === es.exams.id)) {
        allExams.push(es.exams);
      }
    });

    setExams(allExams);
  };

  const fetchSubjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("teacher_id", user?.id);
    setSubjects(data || []);
  };

  const fetchStudents = async () => {
    const { data: examData } = await supabase
      .from("exams")
      .select("class_id")
      .eq("id", selectedExam)
      .single();

    if (examData) {
      const { data: studentData } = await supabase
        .from("class_students")
        .select("student_id, profiles(id, full_name)")
        .eq("class_id", examData.class_id);

      const studentsWithMarks = await Promise.all(
        (studentData || []).map(async (s: any) => {
          const { data: existingMark } = await supabase
            .from("marks")
            .select("*")
            .eq("exam_id", selectedExam)
            .eq("student_id", s.student_id)
            .eq("subject_id", selectedSubject)
            .maybeSingle();

          return {
            student_id: s.student_id,
            student_name: s.profiles?.full_name || "Student",
            marks_obtained: existingMark?.marks_obtained ?? "",
            grade: existingMark?.grade || "",
            remarks: existingMark?.remarks || "",
          };
        })
      );

      setStudents(studentsWithMarks);
      setMarksData(studentsWithMarks);
    }
  };

  const calculateGrade = (marks: number) => {
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B";
    if (marks >= 60) return "C";
    if (marks >= 50) return "D";
    return "F";
  };

  const handleMarksChange = (studentId: string, field: string, value: any) => {
    setMarksData((prev) =>
      prev.map((item) => {
        if (item.student_id === studentId) {
          const updated = { ...item, [field]: value };
          if (field === "marks_obtained" && value !== "") {
            updated.grade = calculateGrade(parseInt(value));
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSubmit = async () => {
    setLoading(true);

    const examObj = exams.find((e) => e.id === selectedExam);
    const subjectObj = subjects.find((s) => s.id === selectedSubject);
    const examName = examObj ? `${examObj.exam_name} (${examObj.exam_type})` : "Exam";
    const subjectName = subjectObj?.name || "Subject";

    let savedCount = 0;
    let waSentCount = 0;

    try {
      for (const mark of marksData) {
        if (mark.marks_obtained !== "" && mark.marks_obtained !== null && mark.marks_obtained !== undefined) {
          const marksNum = parseInt(mark.marks_obtained);
          await supabase.from("marks").upsert({
            exam_id: selectedExam,
            student_id: mark.student_id,
            subject_id: selectedSubject,
            marks_obtained: marksNum,
            grade: mark.grade,
            remarks: mark.remarks,
          }, {
            onConflict: "exam_id,student_id,subject_id"
          });
          savedCount++;

          // Send WhatsApp Marks Report if enabled
          if (sendWhatsApp && schoolId) {
            try {
              const waRes = await sendMarksNotificationWhatsApp({
                schoolId,
                studentId: mark.student_id,
                examId: selectedExam,
                subjectId: selectedSubject,
                examName,
                subjectName,
                marksObtained: marksNum,
                grade: mark.grade,
                remarks: mark.remarks,
              });

              if (waRes.success) {
                waSentCount++;
              }
            } catch (waErr) {
              console.error("Failed to dispatch WhatsApp marks report:", waErr);
            }
          }
        }
      }

      toast({
        title: "Marks Saved Successfully",
        description: `Saved marks for ${savedCount} students.${waSentCount > 0 ? ` Sent WhatsApp report cards to ${waSentCount} parents.` : ""}`,
      });
    } catch (err: any) {
      toast({
        title: "Error saving marks",
        description: err.message || "Failed to save marks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Marks & Report Card Entry</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Select Exam</Label>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Choose exam" />
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
        <div>
          <Label>Select Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Choose subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedExam && selectedSubject && (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-32">Marks Obtained</TableHead>
                  <TableHead className="w-24">Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marksData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No students found in this class
                    </TableCell>
                  </TableRow>
                ) : (
                  marksData.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="e.g. 85"
                          value={student.marks_obtained}
                          onChange={(e) => handleMarksChange(student.student_id, "marks_obtained", e.target.value)}
                          className="w-24 font-semibold"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={student.grade}
                          readOnly
                          className="w-16 font-bold bg-muted"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Optional feedback..."
                          value={student.remarks}
                          onChange={(e) => handleMarksChange(student.student_id, "remarks", e.target.value)}
                          rows={1}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border p-4 bg-muted/30 flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <Label htmlFor="send-whatsapp-marks" className="font-semibold text-sm cursor-pointer">
                  Send Marks via WhatsApp to Parents
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-send each student's score, grade, and remarks to their parent's WhatsApp on save
              </p>
            </div>
            <Switch
              id="send-whatsapp-marks"
              checked={sendWhatsApp}
              onCheckedChange={setSendWhatsApp}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="mt-4" size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Broadcast Marks
          </Button>
        </>
      )}
    </Card>
  );
}