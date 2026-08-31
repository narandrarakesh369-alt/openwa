import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Download, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BulkStudentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const downloadTemplate = () => {
    const csvContent = `First Name,Last Name,Gender,Date of Birth,Phone,Address,City,State,Pincode,Father Name,Father Phone,Father Occupation,Mother Name,Mother Phone,Mother Occupation,Blood Group,Emergency Contact,Previous School
John,Doe,Male,2010-01-15,9876543210,123 Main St,Mumbai,Maharashtra,400001,Robert Doe,9876543211,Engineer,Jane Doe,9876543212,Teacher,A+,9876543213,ABC School
Jane,Smith,Female,2011-03-20,9876543220,456 Park Ave,Delhi,Delhi,110001,Michael Smith,9876543221,Doctor,Sarah Smith,9876543222,Lawyer,B+,9876543223,XYZ School`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_bulk_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const student: any = {};
        headers.forEach((header, index) => {
          student[header] = values[index];
        });
        students.push(student);
      }
    }
    return students;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .single();

      if (!userRole?.school_id) throw new Error("School not found");

      const text = await file.text();
      const students = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;

      for (const student of students) {
        try {
          // Generate admission number
          const admissionNumber = `ADM${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          // Create user account
          const email = `${student['First Name'].toLowerCase()}.${student['Last Name'].toLowerCase()}@student.school.com`;
          const password = `student${Math.floor(Math.random() * 10000)}`;

          const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
            body: {
              email,
              password,
              full_name: `${student['First Name']} ${student['Last Name']}`,
              phone: student['Phone'],
              role: 'student',
              school_id: userRole.school_id
            }
          });

          if (authError) throw authError;

          // Insert student data
          const { error: studentError } = await supabase
            .from("students")
            .insert({
              user_id: authData.user.id,
              school_id: userRole.school_id,
              admission_number: admissionNumber,
              first_name: student['First Name'],
              last_name: student['Last Name'],
              gender: student['Gender'],
              date_of_birth: student['Date of Birth'],
              phone: student['Phone'],
              address: student['Address'],
              city: student['City'],
              state: student['State'],
              pincode: student['Pincode'],
              father_name: student['Father Name'],
              father_phone: student['Father Phone'],
              father_occupation: student['Father Occupation'],
              mother_name: student['Mother Name'],
              mother_phone: student['Mother Phone'],
              mother_occupation: student['Mother Occupation'],
              blood_group: student['Blood Group'],
              emergency_contact: student['Emergency Contact'],
              previous_school: student['Previous School'],
              status: 'active'
            });

          if (studentError) throw studentError;
          successCount++;
        } catch (err) {
          console.error("Error creating student:", err);
          errorCount++;
        }
      }

      toast.success(`Upload complete! ${successCount} students added, ${errorCount} failed`);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('student-csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload students");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Bulk Student Upload</h2>
          <p className="text-muted-foreground">Upload multiple students at once using a CSV file</p>
        </div>

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Download the template, fill in student details, and upload the CSV file. Each student will get automatic login credentials.
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button onClick={downloadTemplate} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="student-csv-upload" className="block text-sm font-medium mb-2">
              Upload CSV File
            </label>
            <Input
              id="student-csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Students"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
