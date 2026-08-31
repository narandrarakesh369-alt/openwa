import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

export const StudentAdmissionLetter = () => {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [classData, setClassData] = useState<any>(null);

  useEffect(() => {
    fetchAdmissionData();
  }, []);

  const fetchAdmissionData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch student details
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (student) {
      setStudentData(student);

      // Fetch school details
      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("id", student.school_id)
        .single();

      setSchoolData(school);

      // Fetch class details
      const { data: enrollment } = await supabase
        .from("class_students")
        .select("class_id, classes(name, section)")
        .eq("student_id", user.id)
        .single();

      if (enrollment) {
        setClassData(enrollment.classes);
      }
    }

    setLoading(false);
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No admission data found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Admission Letter</h1>
          <p className="text-muted-foreground">Official admission confirmation</p>
        </div>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-12 space-y-8">
          {/* Letterhead */}
          <div className="text-center border-b pb-6">
            <h2 className="text-3xl font-bold text-primary">{schoolData?.name}</h2>
            <p className="text-sm text-muted-foreground mt-2">{schoolData?.address}</p>
            <p className="text-sm text-muted-foreground">
              Phone: {schoolData?.phone} | Email: {schoolData?.email}
            </p>
          </div>

          {/* Letter content */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold">ADMISSION LETTER</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Admission No: {studentData.admission_number}
              </p>
            </div>

            <div className="space-y-4">
              <p>Date: {format(new Date(studentData.created_at), "PPP")}</p>

              <div>
                <p className="font-semibold">Dear {studentData.first_name} {studentData.last_name},</p>
              </div>

              <p className="text-justify">
                We are pleased to inform you that you have been admitted to <strong>{schoolData?.name}</strong> for 
                the academic year. Your admission has been confirmed to <strong>Class {classData?.name} 
                {classData?.section ? ` (Section ${classData.section})` : ""}</strong>.
              </p>

              <div className="space-y-2">
                <h4 className="font-semibold">Student Details:</h4>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{studentData.first_name} {studentData.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{format(new Date(studentData.date_of_birth), "PP")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{studentData.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Admission Number</p>
                    <p className="font-medium">{studentData.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Group</p>
                    <p className="font-medium">{studentData.blood_group || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{studentData.phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Parent/Guardian Details:</h4>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Father's Name</p>
                    <p className="font-medium">{studentData.father_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Father's Phone</p>
                    <p className="font-medium">{studentData.father_phone}</p>
                  </div>
                  {studentData.mother_name && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Mother's Name</p>
                        <p className="font-medium">{studentData.mother_name}</p>
                      </div>
                      {studentData.mother_phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Mother's Phone</p>
                          <p className="font-medium">{studentData.mother_phone}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <p className="text-justify">
                We look forward to your active participation in the school's academic and co-curricular activities. 
                Please ensure that all fees are paid on time and school rules are followed diligently.
              </p>

              <p>
                We wish you all the best in your academic journey with us.
              </p>
            </div>

            <div className="mt-12 pt-8 border-t flex justify-between">
              <div>
                <p className="font-semibold">Principal's Signature</p>
                <div className="mt-8 border-b border-gray-400 w-48"></div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{schoolData?.name}</p>
                <p className="text-sm text-muted-foreground">Official Seal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
