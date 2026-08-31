import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const ClassManagement = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    teacher_id: ""
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData) return;

    // Fetch classes for this school
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", roleData.school_id)
      .order("name");

    if (classesError) {
      toast.error("Failed to load classes");
      return;
    }

    // Get unique teacher IDs
    const teacherIds = classesData
      ?.map(c => c.teacher_id)
      .filter(id => id !== null) || [];

    // Fetch teacher profiles separately
    const { data: teacherProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);

    // Combine the data
    const combinedData = classesData?.map(cls => ({
      ...cls,
      profiles: teacherProfiles?.find(p => p.id === cls.teacher_id) || null
    })) || [];

    setClasses(combinedData);
  };

  const fetchTeachers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData) return;

    // Fetch teacher roles for the school
    const { data: teacherRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, school_id")
      .eq("role", "teacher")
      .eq("school_id", roleData.school_id);

    if (rolesError) {
      console.error("Error fetching teachers:", rolesError);
      toast.error("Failed to load teachers");
      return;
    }

    // Fetch profiles separately
    const teacherIds = teacherRoles?.map(t => t.user_id) || [];
    
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);

    // Combine the data
    const combinedData = teacherRoles?.map(role => {
      const profile = profilesData?.find(p => p.id === role.user_id);
      return {
        user_id: role.user_id,
        profiles: profile
      };
    }) || [];

    setTeachers(combinedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.school_id) {
      toast.error("School not found");
      return;
    }

    const classData = {
      ...formData,
      school_id: userRole.school_id,
      teacher_id: formData.teacher_id || null
    };

    if (editingClass) {
      const { error } = await supabase
        .from("classes")
        .update(classData)
        .eq("id", editingClass.id);

      if (error) {
        toast.error("Failed to update class");
        return;
      }
      toast.success("Class updated successfully");
    } else {
      const { error } = await supabase
        .from("classes")
        .insert(classData);

      if (error) {
        toast.error("Failed to create class");
        return;
      }
      toast.success("Class created successfully");
    }

    setIsOpen(false);
    setEditingClass(null);
    setFormData({ name: "", section: "", teacher_id: "" });
    fetchClasses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete class");
      return;
    }

    toast.success("Class deleted successfully");
    fetchClasses();
  };

  const openDialog = (cls?: any) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        section: cls.section || "",
        teacher_id: cls.teacher_id || ""
      });
    } else {
      setEditingClass(null);
      setFormData({ name: "", section: "", teacher_id: "" });
    }
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Class Management</CardTitle>
            <CardDescription>Create and manage classes</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
                <DialogDescription>Enter class details below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Class Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Grade 10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g., A"
                  />
                </div>
                <div>
                  <Label htmlFor="teacher">Class Teacher</Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher: any) => (
                        <SelectItem key={teacher.profiles?.id} value={teacher.profiles?.id}>
                          {teacher.profiles?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingClass ? "Update" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class Name</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Class Teacher</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => (
              <TableRow key={cls.id}>
                <TableCell className="font-medium">{cls.name}</TableCell>
                <TableCell>{cls.section || "-"}</TableCell>
                <TableCell>{cls.profiles?.full_name || "Not assigned"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDialog(cls)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(cls.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
