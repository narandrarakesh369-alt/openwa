import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Users, GraduationCap, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  phone: string;
  join_date: string;
  type: "teacher" | "staff";
}

export const StaffList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "teacher" | "staff">("all");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole) return;

      const allEmployees: Employee[] = [];

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", userRole.school_id)
        .order("created_at", { ascending: false });

      if (teachersError) throw teachersError;

      // Fetch profiles for teachers
      if (teachersData && teachersData.length > 0) {
        const userIds = teachersData.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        teachersData.forEach(teacher => {
          const profile = profiles?.find(p => p.id === teacher.user_id);
          allEmployees.push({
            id: teacher.id,
            employee_id: teacher.employee_id,
            name: `${teacher.first_name} ${teacher.last_name}`,
            email: profile?.email || "N/A",
            designation: teacher.designation,
            phone: teacher.phone,
            join_date: teacher.created_at,
            type: "teacher"
          });
        });
      }

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("school_id", userRole.school_id)
        .order("created_at", { ascending: false });

      if (staffError) throw staffError;

      if (staffData) {
        staffData.forEach(member => {
          allEmployees.push({
            id: member.id,
            employee_id: member.id.slice(0, 8).toUpperCase(),
            name: member.name,
            email: member.email,
            designation: member.designation,
            phone: "N/A",
            join_date: member.join_date,
            type: "staff"
          });
        });
      }

      // Sort all employees by join date
      allEmployees.sort((a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime());
      setEmployees(allEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchTerm === "" || 
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || emp.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const teacherCount = employees.filter(e => e.type === "teacher").length;
  const staffCount = employees.filter(e => e.type === "staff").length;

  if (loading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all ${filterType === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterType("all")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filterType === "teacher" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterType("teacher")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <GraduationCap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teachers</p>
              <p className="text-2xl font-bold">{teacherCount}</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filterType === "staff" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterType("staff")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Briefcase className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Other Staff</p>
              <p className="text-2xl font-bold">{staffCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Employee List */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold">
            {filterType === "all" ? "All Employees" : filterType === "teacher" ? "Teachers" : "Other Staff"}
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <p className="text-muted-foreground">
            {searchTerm ? "No employees found matching your search." : "No employees registered yet. Add employees using the 'Add New' menu."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Join Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employee_id}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>
                      <Badge variant={employee.type === "teacher" ? "default" : "secondary"}>
                        {employee.type === "teacher" ? "Teacher" : "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell>{new Date(employee.join_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
