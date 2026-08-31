import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Download, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BulkTeacherUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const downloadTemplate = () => {
    const csvContent = `First Name,Last Name,Gender,Date of Birth,Phone,Address,City,State,Pincode,Designation,Qualification,Department,Specialization,Experience Years,Salary,Blood Group,Emergency Contact
Robert,Johnson,Male,1985-05-10,9876543230,789 Oak St,Mumbai,Maharashtra,400002,Senior Teacher,M.Sc,Science,Physics,10,50000,O+,9876543231
Sarah,Williams,Female,1990-08-15,9876543240,321 Elm St,Delhi,Delhi,110002,Teacher,B.Ed,Mathematics,Algebra,5,40000,A-,9876543241`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_bulk_upload_template.csv';
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
    const teachers = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const teacher: any = {};
        headers.forEach((header, index) => {
          teacher[header] = values[index];
        });
        teachers.push(teacher);
      }
    }
    return teachers;
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
      const teachers = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;

      for (const teacher of teachers) {
        try {
          // Generate employee ID
          const employeeId = `EMP${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          // Create user account
          const email = `${teacher['First Name'].toLowerCase()}.${teacher['Last Name'].toLowerCase()}@teacher.school.com`;
          const password = `teacher${Math.floor(Math.random() * 10000)}`;

          const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
            body: {
              email,
              password,
              full_name: `${teacher['First Name']} ${teacher['Last Name']}`,
              phone: teacher['Phone'],
              role: 'teacher',
              school_id: userRole.school_id
            }
          });

          if (authError) throw authError;

          // Insert teacher data
          const { error: teacherError } = await supabase
            .from("teachers")
            .insert({
              user_id: authData.user.id,
              school_id: userRole.school_id,
              employee_id: employeeId,
              first_name: teacher['First Name'],
              last_name: teacher['Last Name'],
              gender: teacher['Gender'],
              date_of_birth: teacher['Date of Birth'],
              phone: teacher['Phone'],
              address: teacher['Address'],
              city: teacher['City'],
              state: teacher['State'],
              pincode: teacher['Pincode'],
              designation: teacher['Designation'],
              qualification: teacher['Qualification'],
              department: teacher['Department'],
              specialization: teacher['Specialization'],
              experience_years: parseInt(teacher['Experience Years']) || 0,
              salary: parseFloat(teacher['Salary']) || 0,
              blood_group: teacher['Blood Group'],
              emergency_contact: teacher['Emergency Contact'],
              status: 'active'
            });

          if (teacherError) throw teacherError;
          successCount++;
        } catch (err) {
          console.error("Error creating teacher:", err);
          errorCount++;
        }
      }

      toast.success(`Upload complete! ${successCount} teachers added, ${errorCount} failed`);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('teacher-csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload teachers");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Bulk Teacher Upload</h2>
          <p className="text-muted-foreground">Upload multiple teachers at once using a CSV file</p>
        </div>

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Download the template, fill in teacher details, and upload the CSV file. Each teacher will get automatic login credentials.
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
            <label htmlFor="teacher-csv-upload" className="block text-sm font-medium mb-2">
              Upload CSV File
            </label>
            <Input
              id="teacher-csv-upload"
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
            {uploading ? "Uploading..." : "Upload Teachers"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
