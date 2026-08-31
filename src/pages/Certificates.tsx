import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CertificateManagement } from "@/components/admin/CertificateManagement";
import { CertificateIssuance } from "@/components/teacher/CertificateIssuance";
import { CertificateView } from "@/components/shared/CertificateView";

export default function Certificates() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(roleData?.role || null);

      // If parent, fetch child's ID
      if (roleData?.role === "parent") {
        const { data: childData } = await supabase
          .from("parent_students")
          .select("student_id")
          .eq("parent_id", user.id)
          .limit(1)
          .single();
        
        setSelectedStudentId(childData?.student_id);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {userRole === "school_admin" && <CertificateManagement />}
      {userRole === "teacher" && <CertificateIssuance />}
      {(userRole === "student" || userRole === "parent") && (
        <CertificateView studentId={selectedStudentId} />
      )}
    </div>
  );
}
