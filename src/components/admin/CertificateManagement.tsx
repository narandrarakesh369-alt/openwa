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
import { Award, Download, Plus, Upload } from "lucide-react";

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
  background_image_url: string | null;
}

export function CertificateManagement() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  const [formData, setFormData] = useState<{
    student_id: string;
    class_id: string;
    certificate_type: "academic" | "participation" | "attendance" | "excellence" | "performance" | "other";
    title: string;
    description: string;
    issue_date: string;
    template_id: string;
  }>({
    student_id: "",
    class_id: "",
    certificate_type: "academic",
    title: "",
    description: "",
    issue_date: new Date().toISOString().split("T")[0],
    template_id: "",
  });

  const [templateData, setTemplateData] = useState({
    name: "",
    background_image: null as File | null,
  });

  useEffect(() => {
    fetchCertificates();
    fetchTemplates();
    fetchClasses();
  }, []);

  const fetchCertificates = async () => {
    const { data, error } = await supabase
      .from("certificates")
      .select("id, student_id, title, certificate_type, issue_date")
      .order("issue_date", { ascending: false });

    if (error) {
      console.error("fetchCertificates error:", error);
      toast({ title: "Error fetching certificates", variant: "destructive" });
    } else {
      // Fetch student names separately to avoid PostgREST join issues
      const studentIds = [...new Set((data || []).map((c: any) => c.student_id).filter(Boolean))];
      let namesMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        if (profilesData) {
          profilesData.forEach((p: any) => { namesMap[p.id] = p.full_name; });
        }
      }
      // Attach profile names to certificates
      const enrichedData = (data || []).map((c: any) => ({
        ...c,
        profiles: { full_name: namesMap[c.student_id] || "Unknown" }
      }));
      setCertificates(enrichedData as any);
    }
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching templates", variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("*");
    setClasses(data || []);
  };

  const fetchStudentsByClass = async (classId: string) => {
    const { data } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId);
    
    if (data && data.length > 0) {
      const studentIds = data.map(s => s.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      setStudents(profiles || []);
    } else {
      setStudents([]);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateData.name) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    let backgroundUrl = null;

    if (templateData.background_image) {
      const fileExt = templateData.background_image.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(`templates/${fileName}`, templateData.background_image);

      if (uploadError) {
        toast({ title: "Error uploading template image", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("certificates")
        .getPublicUrl(`templates/${fileName}`);
      backgroundUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("certificate_templates").insert([
      {
        name: templateData.name,
        background_image_url: backgroundUrl,
      },
    ]);

    if (error) {
      toast({ title: "Error creating template", variant: "destructive" });
    } else {
      toast({ title: "Template created successfully" });
      setIsTemplateOpen(false);
      setTemplateData({ name: "", background_image: null });
      fetchTemplates();
    }
    setLoading(false);
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
        template_id: formData.template_id || null,
      },
    ]);

    if (error) {
      toast({ title: "Error creating certificate", variant: "destructive" });
    } else {
      toast({ title: "Certificate created successfully" });
      setIsCreateOpen(false);
      setFormData({
        student_id: "",
        class_id: "",
        certificate_type: "academic",
        title: "",
        description: "",
        issue_date: new Date().toISOString().split("T")[0],
        template_id: "",
      });
      fetchCertificates();
    }
    setLoading(false);
  };

  const handleBulkGenerate = async () => {
    if (!formData.class_id || !formData.title) {
      toast({ title: "Class and title are required for bulk generation", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const certificatesToCreate = students.map((student) => ({
      student_id: student.id,
      class_id: formData.class_id,
      certificate_type: formData.certificate_type,
      title: formData.title,
      description: formData.description,
      issue_date: formData.issue_date,
      issued_by: user?.id,
      template_id: formData.template_id || null,
    }));

    const { error } = await supabase.from("certificates").insert(certificatesToCreate);

    if (error) {
      toast({ title: "Error generating bulk certificates", variant: "destructive" });
    } else {
      toast({ title: `${students.length} certificates generated successfully` });
      setIsCreateOpen(false);
      fetchCertificates();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Certificate Management</h2>
        <div className="flex gap-2">
          <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Certificate Template</DialogTitle>
                <DialogDescription>Design a new certificate template</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={templateData.name}
                    onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                    placeholder="e.g., Academic Excellence Template"
                  />
                </div>
                <div>
                  <Label>Background Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setTemplateData({ ...templateData, background_image: e.target.files?.[0] || null })}
                  />
                </div>
                <Button onClick={handleCreateTemplate} disabled={loading}>
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Issue Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Issue Certificate</DialogTitle>
                <DialogDescription>Create a certificate for a student or class</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Class (for bulk generation)</Label>
                    <Select
                      value={formData.class_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, class_id: value });
                        fetchStudentsByClass(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
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

                  <div>
                    <Label>Individual Student (optional)</Label>
                    <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Template</Label>
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

                <div className="flex gap-2">
                  <Button onClick={handleCreateCertificate} disabled={loading || !formData.student_id}>
                    Issue to Student
                  </Button>
                  <Button onClick={handleBulkGenerate} disabled={loading || !formData.class_id} variant="secondary">
                    Generate for Entire Class
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Certificates</CardTitle>
          <CardDescription>View and manage issued certificates</CardDescription>
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
