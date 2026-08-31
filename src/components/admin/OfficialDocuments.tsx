import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, FileText, Download, Printer, Loader2, GraduationCap, ScrollText } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  student_id: string;
  document_type: string;
  document_number: string;
  issue_date: string;
  reason?: string;
  leaving_date?: string;
  conduct?: string;
  remarks?: string;
  document_data: any;
  created_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  father_name: string;
  date_of_birth: string;
}

export const OfficialDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    document_type: "transfer_certificate",
    reason: "",
    leaving_date: "",
    conduct: "Good",
    remarks: ""
  });

  useEffect(() => {
    fetchDocuments();
    fetchStudents();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("official_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load documents");
      console.error(error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.school_id) return;

    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, admission_number, father_name, date_of_birth")
      .eq("school_id", userRole.school_id)
      .eq("status", "active");

    if (!error) {
      setStudents(data || []);
    }
  };

  const generateDocumentNumber = (type: string) => {
    const prefix = type === "transfer_certificate" ? "TC" : 
                   type === "bonafide" ? "BF" : 
                   type === "character_certificate" ? "CC" : "SC";
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}/${year}/${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.school_id) {
      toast.error("School not found");
      setSubmitting(false);
      return;
    }

    const student = students.find(s => s.id === formData.student_id);
    
    const { error } = await supabase.from("official_documents").insert({
      student_id: formData.student_id,
      school_id: userRole.school_id,
      document_type: formData.document_type,
      document_number: generateDocumentNumber(formData.document_type),
      issued_by: user.id,
      reason: formData.reason,
      leaving_date: formData.leaving_date || null,
      conduct: formData.conduct,
      remarks: formData.remarks,
      document_data: {
        student_name: student ? `${student.first_name} ${student.last_name}` : "",
        admission_number: student?.admission_number,
        father_name: student?.father_name,
        date_of_birth: student?.date_of_birth
      }
    });

    if (error) {
      toast.error("Failed to generate document");
      console.error(error);
    } else {
      toast.success("Document generated successfully");
      setIsOpen(false);
      setFormData({
        student_id: "",
        document_type: "transfer_certificate",
        reason: "",
        leaving_date: "",
        conduct: "Good",
        remarks: ""
      });
      fetchDocuments();
    }
    setSubmitting(false);
  };

  const getDocTypeBadge = (type: string) => {
    const config: Record<string, { label: string; class: string }> = {
      transfer_certificate: { label: "TC", class: "bg-danger/20 text-danger" },
      bonafide: { label: "Bonafide", class: "bg-primary/20 text-primary" },
      character_certificate: { label: "Character", class: "bg-success/20 text-success" },
      study_certificate: { label: "Study", class: "bg-accent/20 text-accent-foreground" }
    };
    const c = config[type] || { label: type, class: "bg-muted text-muted-foreground" };
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  const printDocument = (doc: Document) => {
    const student = doc.document_data;
    const content = `
      <html>
        <head>
          <title>${doc.document_type.replace("_", " ").toUpperCase()}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
            .doc-number { font-size: 14px; margin-top: 10px; }
            .content { line-height: 1.8; font-size: 16px; }
            .field { margin: 10px 0; }
            .label { font-weight: bold; }
            .signature { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 150px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${doc.document_type === "transfer_certificate" ? "Transfer Certificate" : doc.document_type === "bonafide" ? "Bonafide Certificate" : doc.document_type.replace("_", " ")}</div>
            <div class="doc-number">No: ${doc.document_number}</div>
            <div class="doc-number">Date: ${format(new Date(doc.issue_date), "dd MMMM yyyy")}</div>
          </div>
          <div class="content">
            <p>This is to certify that <strong>${student.student_name}</strong>, 
            S/o or D/o <strong>${student.father_name}</strong>, 
            bearing Admission No. <strong>${student.admission_number}</strong>, 
            Date of Birth <strong>${student.date_of_birth ? format(new Date(student.date_of_birth), "dd MMMM yyyy") : "N/A"}</strong>
            ${doc.document_type === "transfer_certificate" ? 
              `, has left the school on <strong>${doc.leaving_date ? format(new Date(doc.leaving_date), "dd MMMM yyyy") : "N/A"}</strong>.` : 
              " is a bonafide student of this institution."
            }</p>
            ${doc.conduct ? `<p class="field"><span class="label">Conduct:</span> ${doc.conduct}</p>` : ""}
            ${doc.reason ? `<p class="field"><span class="label">Reason:</span> ${doc.reason}</p>` : ""}
            ${doc.remarks ? `<p class="field"><span class="label">Remarks:</span> ${doc.remarks}</p>` : ""}
          </div>
          <div class="signature">
            <div class="signature-box">
              <div class="signature-line"></div>
              <p>Class Teacher</p>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <p>Principal</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Official Documents
            </CardTitle>
            <CardDescription>Generate TC, Bonafide, and other certificates</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80">
                <Plus className="h-4 w-4 mr-2" />
                Generate Document
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate Official Document</DialogTitle>
                <DialogDescription>Create a new certificate for a student</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Student</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.admission_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer_certificate">Transfer Certificate (TC)</SelectItem>
                      <SelectItem value="bonafide">Bonafide Certificate</SelectItem>
                      <SelectItem value="character_certificate">Character Certificate</SelectItem>
                      <SelectItem value="study_certificate">Study Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.document_type === "transfer_certificate" && (
                  <div>
                    <Label>Leaving Date</Label>
                    <Input
                      type="date"
                      value={formData.leaving_date}
                      onChange={(e) => setFormData({ ...formData, leaving_date: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label>Conduct</Label>
                  <Select
                    value={formData.conduct}
                    onValueChange={(value) => setFormData({ ...formData, conduct: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Very Good">Very Good</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for issuing certificate..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Remarks (Optional)</Label>
                  <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Any additional remarks..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={submitting || !formData.student_id}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate
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
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No documents generated yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Document No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} className="border-border/50">
                  <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                  <TableCell>{getDocTypeBadge(doc.document_type)}</TableCell>
                  <TableCell>{doc.document_data?.student_name || "N/A"}</TableCell>
                  <TableCell>{format(new Date(doc.issue_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => printDocument(doc)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
