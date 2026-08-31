import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Parent {
  id: string;
  full_name: string;
  email: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface Relationship {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  parent_name: string;
  student_name: string;
}

export default function ParentStudentManagement() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [relationshipType, setRelationshipType] = useState("parent");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchParents(), fetchStudents(), fetchRelationships()]);
  };

  const fetchParents = async () => {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "parent");

    if (!userRoles) return;

    const parentIds = userRoles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", parentIds);

    setParents(profiles || []);
  };

  const fetchStudents = async () => {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (!userRoles) return;

    const studentIds = userRoles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds);

    setStudents(profiles || []);
  };

  const fetchRelationships = async () => {
    const { data } = await supabase
      .from("parent_students")
      .select(`
        id,
        parent_id,
        student_id,
        relationship
      `);

    if (!data) return;

    const enrichedData = await Promise.all(
      data.map(async (rel) => {
        const { data: parent } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", rel.parent_id)
          .single();

        const { data: student } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", rel.student_id)
          .single();

        return {
          ...rel,
          parent_name: parent?.full_name || "Unknown",
          student_name: student?.full_name || "Unknown",
        };
      })
    );

    setRelationships(enrichedData);
  };

  const addRelationship = async () => {
    if (!selectedParent || !selectedStudent || !relationshipType) {
      toast.error("Please select both parent and student");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("parent_students").insert({
      parent_id: selectedParent,
      student_id: selectedStudent,
      relationship: relationshipType,
    });

    if (error) {
      toast.error("Failed to add relationship: " + error.message);
    } else {
      toast.success("Relationship added successfully");
      setSelectedParent("");
      setSelectedStudent("");
      setRelationshipType("parent");
      fetchRelationships();
    }
    setLoading(false);
  };

  const deleteRelationship = async (id: string) => {
    const { error } = await supabase
      .from("parent_students")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete relationship");
    } else {
      toast.success("Relationship removed successfully");
      fetchRelationships();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Parent-Student Relationship</CardTitle>
          <CardDescription>Link parents to their children</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Parent</label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose parent" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.full_name} ({parent.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Relationship</label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={addRelationship} disabled={loading} className="w-full md:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Relationship
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Relationships</CardTitle>
          <CardDescription>Manage parent-student connections</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No relationships found
                  </TableCell>
                </TableRow>
              ) : (
                relationships.map((rel) => (
                  <TableRow key={rel.id}>
                    <TableCell>{rel.parent_name}</TableCell>
                    <TableCell>{rel.student_name}</TableCell>
                    <TableCell className="capitalize">{rel.relationship}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Relationship</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this parent-student relationship?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRelationship(rel.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
