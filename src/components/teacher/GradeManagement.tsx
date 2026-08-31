import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Award } from "lucide-react";
import { gradeSchema } from "@/lib/validation";

export const GradeManagement = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    class_id: "",
    subject_id: "",
    student_id: "",
    exam_name: "",
    marks_obtained: 0,
    total_marks: 100,
    grade: "",
    term: "",
    academic_year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.class_id) {
      fetchStudents();
    }
  }, [formData.class_id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [classesRes, subjectsRes] = await Promise.all([
      supabase.from("classes").select("*").eq("teacher_id", user.id),
      supabase.from("subjects").select("*")
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", formData.class_id);

    if (data && data.length > 0) {
      const studentIds = data.map(d => d.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const enriched = data.map(d => ({
        ...d,
        profiles: profiles?.find(p => p.id === d.student_id) || { id: d.student_id, full_name: "Unknown" },
      }));
      setStudents(enriched);
    } else {
      setStudents([]);
    }
  };

  const calculateGrade = (obtained: number, total: number) => {
    const percentage = (obtained / total) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = gradeSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ');
      toast.error(errors);
      return;
    }

    const grade = calculateGrade(formData.marks_obtained, formData.total_marks);

    const { error } = await supabase.from("grades").insert({
      ...formData,
      grade
    });

    if (error) {
      toast.error("Failed to add grade");
      return;
    }

    toast.success("Grade added successfully");
    setOpen(false);
    setFormData({
      class_id: "",
      subject_id: "",
      student_id: "",
      exam_name: "",
      marks_obtained: 0,
      total_marks: 100,
      grade: "",
      term: "",
      academic_year: new Date().getFullYear().toString()
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Grade Management</CardTitle>
            <CardDescription>Add and manage student grades</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student Grade</DialogTitle>
                <DialogDescription>Enter exam results for a student</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Class</Label>
                  <Select value={formData.class_id} onValueChange={(value) => setFormData({ ...formData, class_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Student</Label>
                  <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student: any) => (
                        <SelectItem key={student.student_id} value={student.student_id}>
                          {student.profiles?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
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
                <div>
                  <Label>Exam Name</Label>
                  <Input
                    value={formData.exam_name}
                    onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                    placeholder="e.g., Mid-term Exam"
                    required
                  />
                </div>
                <div>
                  <Label>Term</Label>
                  <Select value={formData.term} onValueChange={(value) => setFormData({ ...formData, term: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Term 1</SelectItem>
                      <SelectItem value="2">Term 2</SelectItem>
                      <SelectItem value="3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Marks Obtained</Label>
                    <Input
                      type="number"
                      value={formData.marks_obtained}
                      onChange={(e) => setFormData({ ...formData, marks_obtained: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Grade</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Award className="h-12 w-12 mr-3 opacity-50" />
          <p>Click "Add Grade" to start entering student marks</p>
        </div>
      </CardContent>
    </Card>
  );
};