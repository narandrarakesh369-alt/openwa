import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const HomeworkView = ({ studentId }: { studentId?: string }) => {
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    fetchHomework();
  }, [studentId]);

  const fetchHomework = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetStudentId = studentId || user.id;

    const { data: enrollments } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", targetStudentId);

    if (!enrollments || enrollments.length === 0) return;

    const { data } = await supabase
      .from("assignments")
      .select("*, subjects(name)")
      .in("class_id", enrollments.map(e => e.class_id))
      .order("due_date", { ascending: true });

    setAssignments(data || []);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homework & Assignments</CardTitle>
        <CardDescription>View and download assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-1 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{assignment.title}</h4>
                      {isOverdue(assignment.due_date) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {assignment.subjects?.name} • {assignment.total_marks} marks
                    </p>
                    <p className="text-sm">{assignment.description}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
          {assignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No homework assigned</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
