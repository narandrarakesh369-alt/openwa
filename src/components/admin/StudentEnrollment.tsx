import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";

export const StudentEnrollment = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchEnrolledStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load classes");
      return;
    }
    setClasses(data || []);
  };

  const fetchStudents = async () => {
    // Fetch all student role entries
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (roleError || !roleData || roleData.length === 0) {
      setStudents([]);
      return;
    }

    // Fetch profiles for those student users
    const userIds = roleData.map(r => r.user_id);
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profileError) {
      toast.error("Failed to load students");
      return;
    }

    setStudents((profiles || []).map(p => ({ profiles: p })));
  };

  const fetchEnrolledStudents = async () => {
    const { data, error } = await supabase
      .from("class_students")
      .select("id, student_id")
      .eq("class_id", selectedClass);

    if (error) {
      toast.error("Failed to load enrolled students");
      return;
    }

    if (data && data.length > 0) {
      const studentIds = data.map(d => d.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const enriched = data.map(enrollment => ({
        ...enrollment,
        profiles: profiles?.find(p => p.id === enrollment.student_id) || { full_name: "Unknown" },
      }));
      setEnrolledStudents(enriched);
    } else {
      setEnrolledStudents([]);
    }
  };

  const handleEnroll = async () => {
    if (!selectedClass || !selectedStudent) {
      toast.error("Please select both class and student");
      return;
    }

    const { error } = await supabase
      .from("class_students")
      .insert({
        class_id: selectedClass,
        student_id: selectedStudent
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Student already enrolled in this class");
      } else {
        toast.error("Failed to enroll student");
      }
      return;
    }

    toast.success("Student enrolled successfully");
    setSelectedStudent("");
    fetchEnrolledStudents();
  };

  const handleUnenroll = async (enrollmentId: string) => {
    if (!confirm("Are you sure you want to remove this student from the class?")) return;

    const { error } = await supabase
      .from("class_students")
      .delete()
      .eq("id", enrollmentId);

    if (error) {
      toast.error("Failed to remove student");
      return;
    }

    toast.success("Student removed successfully");
    fetchEnrolledStudents();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Enrollment</CardTitle>
        <CardDescription>Enroll students in classes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
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
          <div className="flex-1">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student: any) => (
                  <SelectItem key={student.profiles?.id} value={student.profiles?.id}>
                    {student.profiles?.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleEnroll}>
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll
          </Button>
        </div>

        {selectedClass && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Enrolled Students</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((enrollment: any) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.profiles?.full_name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUnenroll(enrollment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
