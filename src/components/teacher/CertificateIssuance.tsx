import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Plus } from "lucide-react";

interface Certificate {
  id: string;
  student_id: string;
  title: string;
  certificate_type: string;
  issue_date: string;
  profiles?: { full_name: string };
}

interface CertificateTemplate {
  id: string;
  name: string;
}

export function CertificateIssuance() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState<{
    student_id: string;
    certificate_type: "academic" | "participation" | "attendance" | "excellence" | "performance" | "other";
    title: string;
    description: string;
    issue_date: string;
    template_id: string;
  }>({
    student_id: "",
    certificate_type: "performance",
    title: "",
    description: "",
    issue_date: new Date().toISOString().split("T")[0],
    template_id: "",
  });

  useEffect(() => {
    fetchCertificates();
    fetchTemplates();
    fetchStudents();
  }, []);

  const fetchCertificates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("certificates")
      .select("id, student_id, title, certificate_type, issue_date")
      .eq("issued_by", user?.id)
      .order("issue_date", { ascending: false });

    if (error) {
      toast({ title: "Error fetching certificates", variant: "destructive" });
      return;
    }

    // Fetch student profiles separately
    if (data && data.length > 0) {
      const studentIds = [...new Set(data.map(c => c.student_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const certsWithProfiles = data.map(cert => ({
        ...cert,
        profiles: profiles?.find(p => p.id === cert.student_id) || { full_name: "Unknown" },
      }));
      setCertificates(certsWithProfiles as Certificate[]);
    } else {
      setCertificates([]);
    }
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*");

    if (!error) {
      setTemplates(data || []);
    }
  };

  const fetchStudents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Step 1: Fetch classes where this teacher is the class teacher
    const { data: teacherClasses } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", user.id);

    // Step 2: Fetch subjects where this teacher teaches
    const { data: teacherSubjects } = await supabase
      .from("subjects")
      .select("class_id")
      .eq("teacher_id", user.id);

    // Combine class IDs from both sources
    const classIds = new Set<string>();
    (teacherClasses || []).forEach(c => classIds.add(c.id));
    (teacherSubjects || []).forEach(s => { if (s.class_id) classIds.add(s.class_id); });

    if (classIds.size === 0) {
      setStudents([]);
      return;
    }

    // Step 3: Fetch students in those classes
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id")
      .in("class_id", Array.from(classIds));

    if (!classStudents || classStudents.length === 0) {
      setStudents([]);
      return;
    }

    // Step 4: Fetch profiles for those students
    const studentIds = [...new Set(classStudents.map(cs => cs.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);

    setStudents(profiles || []);
  };

  const handleCreateCertificate = async () => {
    if (!formData.student_id || !formData.title) {
      toast({ title: "Student and title are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("certificates").insert([
      {
        ...formData,
        issued_by: user?.id,
        teacher_id: user?.id,
        template_id: formData.template_id || null,
      },
    ]);

    if (error) {
      toast({ title: "Error creating certificate", variant: "destructive" });
    } else {
      toast({ title: "Certificate issued successfully" });
      setIsCreateOpen(false);
      setFormData({
        student_id: "",
        certificate_type: "performance",
        title: "",
        description: "",
        issue_date: new Date().toISOString().split("T")[0],
        template_id: "",
      });
      fetchCertificates();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Issue Certificates</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Issue Certificate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Certificate</DialogTitle>
              <DialogDescription>Create a certificate for a student</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student: any) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Certificate Type</Label>
                <Select value={formData.certificate_type} onValueChange={(value: any) => setFormData({ ...formData, certificate_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="participation">Participation</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="excellence">Excellence</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template (Optional)</Label>
                <Select value={formData.template_id} onValueChange={(value) => setFormData({ ...formData, template_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Best Performer in Science"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about the achievement"
                />
              </div>

              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateCertificate} disabled={loading} className="w-full">
                Issue Certificate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Award className="inline mr-2 h-5 w-5" />
            My Issued Certificates
          </CardTitle>
          <CardDescription>Certificates you have issued to students</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell>{cert.profiles?.full_name}</TableCell>
                  <TableCell>{cert.title}</TableCell>
                  <TableCell className="capitalize">{cert.certificate_type}</TableCell>
                  <TableCell>{new Date(cert.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
