import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Printer, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Teacher {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation: string;
  phone: string;
  blood_group: string | null;
  profiles: {
    email: string;
  };
}

interface School {
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
}

export const StaffIDCards = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.school_id) return;

      // Fetch school details
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("id", userRole.school_id)
        .single();

      setSchool(schoolData);

      // Fetch teachers
      const { data: teachersData, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", userRole.school_id)
        .order("first_name");

      if (error) throw error;

      if (teachersData && teachersData.length > 0) {
        const userIds = teachersData.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const teachersWithProfiles = teachersData.map(teacher => ({
          ...teacher,
          profiles: profiles?.find(p => p.id === teacher.user_id) || { email: "" }
        }));

        setTeachers(teachersWithProfiles as Teacher[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacher = (id: string) => {
    const newSet = new Set(selectedTeachers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTeachers(newSet);
  };

  const toggleAll = () => {
    if (selectedTeachers.size === teachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(teachers.map(t => t.id)));
    }
  };

  const handlePrint = () => {
    if (selectedTeachers.size === 0) {
      toast.error("Please select at least one staff member");
      return;
    }
    window.print();
  };

  const selectedTeachersList = teachers.filter(t => selectedTeachers.has(t.id));

  return (
    <>
      <Card className="p-6 print:hidden">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Staff ID Cards</h2>
              <p className="text-muted-foreground">Generate and print staff identification cards</p>
            </div>
            <Button onClick={handlePrint} disabled={selectedTeachers.size === 0} className="gap-2">
              <Printer className="h-4 w-4" />
              Print {selectedTeachers.size > 0 && `(${selectedTeachers.size})`}
            </Button>
          </div>

          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              Select staff members and click print to generate ID cards. Make sure to use card-sized paper (3.5" x 2") for printing.
            </AlertDescription>
          </Alert>

          {loading ? (
            <p>Loading...</p>
          ) : teachers.length === 0 ? (
            <p className="text-muted-foreground">No staff members found</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Staff Members ({selectedTeachers.size} of {teachers.length} selected)
                </h3>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedTeachers.size === teachers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="p-3 flex items-center gap-3 hover:bg-muted/50">
                    <Checkbox
                      checked={selectedTeachers.has(teacher.id)}
                      onCheckedChange={() => toggleTeacher(teacher.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.employee_id} - {teacher.designation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Printable ID Cards */}
      <div className="hidden print:block">
        <div className="grid grid-cols-2 gap-4 p-4">
          {selectedTeachersList.map(teacher => (
            <div key={teacher.id} className="border-2 border-black rounded-lg p-4 w-[3.5in] h-[2in] flex flex-col justify-between page-break-inside-avoid">
              <div className="flex items-start gap-3">
                {school?.logo_url && (
                  <img src={school.logo_url} alt="School Logo" className="w-12 h-12 object-contain" />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-xs">{school?.name}</h3>
                  <p className="text-[8px] text-gray-600">{school?.address}</p>
                </div>
              </div>
              
              <div className="text-center border-t pt-2">
                <p className="font-bold text-sm">{teacher.first_name} {teacher.last_name}</p>
                <p className="text-xs text-gray-600">{teacher.designation}</p>
                <p className="text-[10px] mt-1">ID: {teacher.employee_id}</p>
              </div>
              
              <div className="flex justify-between text-[8px] text-gray-600 border-t pt-1">
                <span>Blood: {teacher.blood_group || "N/A"}</span>
                <span>{teacher.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
