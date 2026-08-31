import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Printer, Download } from "lucide-react";

interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  father_name: string;
  father_phone: string;
}

interface Class {
  id: string;
  name: string;
  section: string | null;
}

export const StudentPrintList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.school_id) return;

      let query = supabase
        .from("students")
        .select("*")
        .eq("school_id", userRole.school_id);

      if (selectedClass !== "all") {
        const { data: enrollments } = await supabase
          .from("class_students")
          .select("student_id")
          .eq("class_id", selectedClass);

        const studentIds = enrollments?.map(e => e.student_id) || [];
        if (studentIds.length > 0) {
          query = query.in("user_id", studentIds);
        } else {
          setStudents([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order("first_name");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const csvContent = [
      ["Admission No.", "Name", "Gender", "Phone", "Father Name", "Father Phone"].join(","),
      ...students.map(s => [
        s.admission_number,
        `${s.first_name} ${s.last_name}`,
        s.gender,
        s.phone,
        s.father_name,
        s.father_phone
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_list_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Student list downloaded");
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <h2 className="text-2xl font-bold">Print Student List</h2>
          <div className="flex gap-2">
            <Button onClick={handleDownloadCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="print:hidden">
          <label className="block text-sm font-medium mb-2">Filter by Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `- ${cls.section}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : students.length === 0 ? (
          <p className="text-muted-foreground">No students found</p>
        ) : (
          <div className="print:text-sm">
            <h3 className="text-lg font-semibold mb-4 hidden print:block">
              Student List - {new Date().toLocaleDateString()}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Father Name</TableHead>
                  <TableHead>Father Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>{student.admission_number}</TableCell>
                    <TableCell>{student.first_name} {student.last_name}</TableCell>
                    <TableCell>{student.gender}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>{student.father_name}</TableCell>
                    <TableCell>{student.father_phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
};
