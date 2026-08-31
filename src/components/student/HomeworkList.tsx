import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export const HomeworkList = () => {
  const { toast } = useToast();
  const [homework, setHomework] = useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  useEffect(() => {
    fetchHomework();
    
    // Real-time subscription
    const channel = supabase
      .channel("homework-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "homework_submissions",
        },
        () => {
          fetchHomework();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchHomework = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get student's classes
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", user.id);

    if (!classData || classData.length === 0) return;

    const classIds = classData.map((c) => c.class_id);

    // Fetch homework (no embedded joins to avoid 400 errors)
    const { data: hwData, error } = await supabase
      .from("homework")
      .select("*")
      .in("class_id", classIds)
      .order("due_date", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching homework",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!hwData || hwData.length === 0) {
      setHomework([]);
      return;
    }

    // Fetch related data separately
    const subjectIds = [...new Set(hwData.map(h => h.subject_id).filter(Boolean))];
    const teacherIds = [...new Set(hwData.map(h => h.teacher_id).filter(Boolean))];
    const hwIds = hwData.map(h => h.id);

    const [classesRes, subjectsRes, profilesRes, submissionsRes] = await Promise.all([
      supabase.from("classes").select("id, name, section").in("id", classIds),
      subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
      teacherIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", teacherIds) : { data: [] },
      supabase.from("homework_submissions").select("*").in("homework_id", hwIds).eq("student_id", user.id),
    ]);

    const classesMap = Object.fromEntries((classesRes.data || []).map(c => [c.id, c]));
    const subjectsMap = Object.fromEntries(((subjectsRes as any).data || []).map((s: any) => [s.id, s]));
    const profilesMap = Object.fromEntries(((profilesRes as any).data || []).map((p: any) => [p.id, p]));

    // Merge data client-side
    const enriched = hwData.map(hw => ({
      ...hw,
      class: classesMap[hw.class_id] || null,
      subject: subjectsMap[hw.subject_id] || null,
      teacher: profilesMap[hw.teacher_id] || null,
      submission: (submissionsRes.data || []).filter(s => s.homework_id === hw.id),
    }));

    setHomework(enriched);
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
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedHomework) return;

    let file_url = null;

    if (submissionFile) {
      file_url = await uploadFile(submissionFile, user.id);
      if (!file_url) {
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("homework_submissions")
      .upsert({
        homework_id: selectedHomework.id,
        student_id: user.id,
        submission_text: submissionText,
        file_url,
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: "Error submitting homework",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Homework submitted successfully" });
      setDialogOpen(false);
      setSubmissionText("");
      setSubmissionFile(null);
      fetchHomework();
    }

    setUploading(false);
  };

  const getStatusBadge = (hw: any) => {
    const dueDate = new Date(hw.due_date);
    const isOverdue = dueDate < new Date();
    const submission = hw.submission?.[0];

    if (submission) {
      if (submission.grade !== null) {
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Graded ({submission.grade}/100)
          </Badge>
        );
      }
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Submitted
        </Badge>
      );
    }

    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const stats = {
    total: homework.length,
    submitted: homework.filter((hw) => hw.submission?.length > 0).length,
    pending: homework.filter((hw) => !hw.submission?.length && new Date(hw.due_date) >= new Date()).length,
    overdue: homework.filter((hw) => !hw.submission?.length && new Date(hw.due_date) < new Date()).length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Homework Progress</CardTitle>
          <CardDescription>Your homework completion status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-md">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-4 border rounded-md bg-green-50">
              <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
              <div className="text-sm text-muted-foreground">Submitted</div>
            </div>
            <div className="text-center p-4 border rounded-md bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-4 border rounded-md bg-red-50">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Completion Rate</span>
              <span>{stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%</span>
            </div>
            <Progress value={stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {homework.map((hw) => {
          const submission = hw.submission?.[0];
          
          return (
            <Card key={hw.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {hw.title}
                      {getStatusBadge(hw)}
                    </CardTitle>
                    <CardDescription>
                      {hw.subject?.name} • {hw.teacher?.full_name} • Due: {format(new Date(hw.due_date), "PPp")}
                    </CardDescription>
                  </div>
                  {!submission && (
                    <Dialog open={dialogOpen && selectedHomework?.id === hw.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (open) setSelectedHomework(hw);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Submit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Homework</DialogTitle>
                          <DialogDescription>{hw.title}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <Label htmlFor="text">Written Answer</Label>
                            <Textarea
                              id="text"
                              value={submissionText}
                              onChange={(e) => setSubmissionText(e.target.value)}
                              rows={6}
                              placeholder="Type your answer here..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="file">Upload File (Optional)</Label>
                            <Input
                              id="file"
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                              onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Max 10MB. Supported: PDF, DOC, DOCX, JPG, PNG, TXT
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={uploading}>
                              {uploading ? "Submitting..." : "Submit"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
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
                {submission && (
                  <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
                    <div className="font-semibold text-sm">Your Submission</div>
                    {submission.submission_text && (
                      <p className="text-sm whitespace-pre-wrap">{submission.submission_text}</p>
                    )}
                    {submission.file_url && (
                      <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        View Submitted File
                      </a>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Submitted on {format(new Date(submission.submitted_at), "PPp")}
                    </div>
                    {submission.feedback && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm font-semibold text-blue-900">Teacher Feedback:</div>
                        <p className="text-sm text-blue-800">{submission.feedback}</p>
                        {submission.grade !== null && (
                          <div className="text-sm font-semibold text-blue-900 mt-1">
                            Grade: {submission.grade}/100
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
