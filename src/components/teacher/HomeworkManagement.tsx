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
import { Plus, Edit, Trash2, FileText, Upload, Download } from "lucide-react";
import { format } from "date-fns";

export const HomeworkManagement = () => {
  const { toast } = useToast();
  const [homework, setHomework] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
    due_date: "",
    attachment_file: null as File | null,
  });

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch teacher's subjects
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("*, class:class_id(id, name, section)")
      .eq("teacher_id", user.id);

    if (subjectsData) {
      setSubjects(subjectsData);
      const uniqueClasses = Array.from(
        new Map(subjectsData.filter(s => s.class).map(s => [s.class.id, s.class])).values()
      );
      setClasses(uniqueClasses);
    }

    fetchHomework();
  };

  const fetchHomework = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("homework")
      .select(`
        *,
        class:class_id(name, section),
        subject:subject_id(name),
        submissions:homework_submissions(count)
      `)
      .eq("teacher_id", user.id)
      .order("due_date", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching homework",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setHomework(data || []);
    }
  };

  const uploadFile = async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('homework-files')
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }

    const { data } = supabase.storage
      .from('homework-files')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingFile(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let attachment_url = editingHomework?.attachment_url || null;

    if (formData.attachment_file) {
      const url = await uploadFile(formData.attachment_file, user.id);
      if (url) attachment_url = url;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      teacher_id: user.id,
      due_date: new Date(formData.due_date).toISOString(),
      attachment_url,
    };

    if (editingHomework) {
      const { error } = await supabase
        .from("homework")
        .update(payload)
        .eq("id", editingHomework.id);

      if (error) {
        toast({
          title: "Error updating homework",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Homework updated successfully" });
        closeDialog();
        fetchHomework();
      }
    } else {
      const { error } = await supabase
        .from("homework")
        .insert(payload);

      if (error) {
        toast({
          title: "Error creating homework",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Homework created successfully" });
        closeDialog();
        fetchHomework();
      }
    }

    setUploadingFile(false);
  };

  const handleEdit = (hw: any) => {
    setEditingHomework(hw);
    setFormData({
      title: hw.title,
      description: hw.description,
      class_id: hw.class_id,
      subject_id: hw.subject_id,
      due_date: format(new Date(hw.due_date), "yyyy-MM-dd'T'HH:mm"),
      attachment_file: null,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this homework?")) return;

    const { error } = await supabase
      .from("homework")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting homework",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Homework deleted successfully" });
      fetchHomework();
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingHomework(null);
    setFormData({
      title: "",
      description: "",
      class_id: "",
      subject_id: "",
      due_date: "",
      attachment_file: null,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Homework Management</CardTitle>
              <CardDescription>Create and manage homework assignments</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingHomework(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Homework
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingHomework ? "Edit Homework" : "Create Homework"}</DialogTitle>
                  <DialogDescription>
                    {editingHomework ? "Update homework details" : "Create a new homework assignment"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="class">Class *</Label>
                      <Select
                        value={formData.class_id}
                        onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                      >
                        <SelectTrigger id="class">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} {cls.section || ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Select
                        value={formData.subject_id}
                        onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                      >
                        <SelectTrigger id="subject">
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
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="file">Attachment (Optional)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                      onChange={(e) => setFormData({ ...formData, attachment_file: e.target.files?.[0] || null })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 10MB. Supported: PDF, DOC, DOCX, JPG, PNG, TXT
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadingFile}>
                      {uploadingFile ? "Uploading..." : editingHomework ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {homework.map((hw) => {
          const dueDate = new Date(hw.due_date);
          const isOverdue = dueDate < new Date();
          
          return (
            <Card key={hw.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {hw.title}
                      {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {hw.class?.name} {hw.class?.section || ""} • {hw.subject?.name} • Due: {format(dueDate, "PPp")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(hw)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(hw.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{hw.description}</p>
                {hw.attachment_url && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <a href={hw.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      View Attachment
                    </a>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Submissions: {hw.submissions?.[0]?.count || 0}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
