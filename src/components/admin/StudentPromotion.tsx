import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Class {
  id: string;
  name: string;
  section: string | null;
}

interface Student {
  id: string;
  user_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
}

export const StudentPromotion = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fromClass, setFromClass] = useState<string>("");
  const [toClass, setToClass] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (fromClass) {
      fetchStudentsInClass();
    }
  }, [fromClass]);

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.school_id) return;

      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", userRole.school_id)
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to fetch classes");
    }
  };

  const fetchStudentsInClass = async () => {
    try {
      setLoading(true);
      const { data: enrollments, error: enrollError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", fromClass);

      if (enrollError) throw enrollError;

      const studentIds = enrollments?.map(e => e.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .in("user_id", studentIds)
        .order("first_name");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (userId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedStudents(newSet);
  };

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.user_id)));
    }
  };

  const handlePromote = async () => {
    if (!fromClass || !toClass) {
      toast.error("Please select both classes");
      return;
    }

    if (fromClass === toClass) {
      toast.error("Cannot promote to the same class");
      return;
    }

    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setPromoting(true);

    try {
      // Remove from old class
      const { error: deleteError } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", fromClass)
        .in("student_id", Array.from(selectedStudents));

      if (deleteError) throw deleteError;

      // Add to new class
      const newEnrollments = Array.from(selectedStudents).map(studentId => ({
        class_id: toClass,
        student_id: studentId
      }));

      const { error: insertError } = await supabase
        .from("class_students")
        .insert(newEnrollments);

      if (insertError) throw insertError;

      toast.success(`Successfully promoted ${selectedStudents.size} student(s)`);
      setSelectedStudents(new Set());
      fetchStudentsInClass();
    } catch (error: any) {
      console.error("Error promoting students:", error);
      toast.error(error.message || "Failed to promote students");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Promote Students</h2>
          <p className="text-muted-foreground">Move students from one class to another</p>
        </div>

        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            Select students from the current class and promote them to the next class. This will update their class enrollment.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">From Class</label>
            <Select value={fromClass} onValueChange={setFromClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select current class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.section ? `- ${cls.section}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">To Class</label>
            <Select value={toClass} onValueChange={setToClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id} disabled={cls.id === fromClass}>
                    {cls.name} {cls.section ? `- ${cls.section}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fromClass && (
          <>
            {loading ? (
              <p>Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground">No students found in selected class</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Students ({selectedStudents.size} of {students.length} selected)
                  </h3>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedStudents.size === students.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {students.map(student => (
                    <div key={student.id} className="p-3 flex items-center gap-3 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedStudents.has(student.user_id)}
                        onCheckedChange={() => toggleStudent(student.user_id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {student.admission_number}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handlePromote}
                  disabled={promoting || selectedStudents.size === 0 || !toClass}
                  className="w-full gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  {promoting ? "Promoting..." : `Promote ${selectedStudents.size} Student(s)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
