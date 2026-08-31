import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Edit, Trash2, Filter, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const subjectColors = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-green-100 text-green-800 border-green-300",
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "bg-orange-100 text-orange-800 border-orange-300",
  "bg-pink-100 text-pink-800 border-pink-300",
  "bg-indigo-100 text-indigo-800 border-indigo-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
];

export const SubjectManagement = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    subject_code: "",
    description: "",
    class_id: "",
    teacher_id: "",
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [filterClass, filterTeacher]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("name");

    if (data) {
      setClasses(data);
    }
  };

  const fetchTeachers = async () => {
    // First get all teacher user IDs from user_roles
    const { data: teacherRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");

    if (!teacherRoles || teacherRoles.length === 0) {
      setTeachers([]);
      return;
    }

    const teacherIds = teacherRoles.map(role => role.user_id);

    // Then get profiles for those teachers
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds)
      .order("full_name");

    if (data) {
      setTeachers(data);
    }
  };

  const fetchSubjects = async () => {
    let query = supabase
      .from("subjects")
      .select(`
        *,
        classes!subjects_class_id_fkey (
          name,
          section
        )
      `)
      .order("name");

    if (filterClass !== "all") {
      query = query.eq("class_id", filterClass);
    }

    if (filterTeacher !== "all") {
      query = query.eq("teacher_id", filterTeacher);
    }

    const { data: subjectsData, error } = await query;

    if (error) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Manually fetch teacher names for subjects that have teachers
    if (subjectsData) {
      const subjectsWithTeachers = await Promise.all(
        subjectsData.map(async (subject) => {
          if (subject.teacher_id) {
            const { data: teacherData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", subject.teacher_id)
              .single();
            
            return {
              ...subject,
              class: subject.classes,
              teacher: teacherData
            };
          }
          return {
            ...subject,
            class: subject.classes,
            teacher: null
          };
        })
      );
      setSubjects(subjectsWithTeachers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!roleData) return;

    const payload = {
      ...formData,
      school_id: roleData.school_id,
      class_id: formData.class_id === "unassigned" ? null : formData.class_id || null,
      teacher_id: formData.teacher_id === "unassigned" ? null : formData.teacher_id || null,
    };

    if (editingSubject) {
      const { error } = await supabase
        .from("subjects")
        .update(payload)
        .eq("id", editingSubject.id);

      if (error) {
        toast({
          title: "Error updating subject",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subject updated successfully",
        });
        closeDialog();
        fetchSubjects();
      }
    } else {
      const { error } = await supabase
        .from("subjects")
        .insert(payload);

      if (error) {
        toast({
          title: "Error creating subject",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subject created successfully",
        });
        closeDialog();
        fetchSubjects();
      }
    }
  };

  const handleEdit = (subject: any) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      subject_code: subject.subject_code || "",
      description: subject.description || "",
      class_id: subject.class_id || "",
      teacher_id: subject.teacher_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting subject",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subject deleted successfully",
      });
      fetchSubjects();
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSubject(null);
    setFormData({
      name: "",
      subject_code: "",
      description: "",
      class_id: "",
      teacher_id: "",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subject Management</CardTitle>
              <CardDescription>Create and manage subjects for your school</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingSubject(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSubject ? "Edit Subject" : "Add New Subject"}</DialogTitle>
                  <DialogDescription>
                    {editingSubject ? "Update subject details" : "Create a new subject"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Subject Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Mathematics"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Subject Code</Label>
                    <Input
                      id="code"
                      value={formData.subject_code}
                      onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                      placeholder="e.g., MATH101"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the subject"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="class">Assign to Class</Label>
                    <Select
                      value={formData.class_id}
                      onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                    >
                      <SelectTrigger id="class">
                        <SelectValue placeholder="Select a class (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No class</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.section || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="teacher">Assign to Teacher</Label>
                    <Select
                      value={formData.teacher_id}
                      onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                    >
                      <SelectTrigger id="teacher">
                        <SelectValue placeholder="Select a teacher (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No teacher</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingSubject ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Filter by Class</Label>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.section || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Filter by Teacher</Label>
            <Select value={filterTeacher} onValueChange={setFilterTeacher}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No subjects found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject, index) => (
                <Card key={subject.id} className={`border-2 ${subjectColors[index % subjectColors.length]}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        {subject.subject_code && (
                          <Badge variant="outline" className="mt-2">
                            {subject.subject_code}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subject.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {subject.description && (
                      <p className="text-sm text-muted-foreground">{subject.description}</p>
                    )}
                    {subject.class && (
                      <div className="text-sm">
                        <strong>Class:</strong> {subject.class.name} {subject.class.section || ""}
                      </div>
                    )}
                    {subject.teacher && (
                      <div className="text-sm flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <strong>Teacher:</strong> {subject.teacher.full_name}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subject.subject_code && `${subject.subject_code} • `}
                        {subject.class && `${subject.class.name} ${subject.class.section || ""} • `}
                        {subject.teacher && subject.teacher.full_name}
                      </div>
                      {subject.description && (
                        <p className="text-xs text-muted-foreground mt-1">{subject.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
