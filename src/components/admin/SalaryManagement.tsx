import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, Clock, CheckCircle, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SalaryManagement() {
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initData();
  }, [selectedMonth, selectedYear]);

  const initData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.school_id) return;

    setSchoolId(userRole.school_id);
    await fetchAllEmployees(userRole.school_id);
    await fetchSalaryRecords(userRole.school_id);
  };

  const fetchAllEmployees = async (sid: string) => {
    // Fetch from staff table (non-teaching staff)
    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .eq("school_id", sid)
      .order("name");

    // Fetch from teachers table
    const { data: teacherData } = await (supabase as any)
      .from("teachers")
      .select("*")
      .eq("school_id", sid)
      .order("first_name");

    // Merge teachers into same format
    const teachersFormatted = (teacherData || []).map((t: any) => ({
      id: t.id,
      name: `${t.first_name} ${t.last_name}`,
      designation: t.designation || "Teacher",
      department: t.department || "Teaching",
      salary_base: t.salary || 30000,
      allowances: Math.round((t.salary || 30000) * 0.15),
      deductions: Math.round((t.salary || 30000) * 0.05),
      employee_id: t.employee_id,
      phone: t.phone,
      type: "Teacher",
    }));

    const staffFormatted = (staffData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      designation: s.designation || "Staff",
      department: "Administration",
      salary_base: s.salary_base || 20000,
      allowances: s.allowances || 0,
      deductions: s.deductions || 0,
      employee_id: "",
      phone: "",
      type: "Staff",
    }));

    setAllEmployees([...teachersFormatted, ...staffFormatted]);
  };

  const fetchSalaryRecords = async (sid: string) => {
    const { data, error } = await supabase
      .from("salary_records")
      .select("*")
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchSalaryRecords error:", error);
      return;
    }

    // Enrich with staff/teacher names
    const staffIds = [...new Set((data || []).map((r: any) => r.staff_id).filter(Boolean))];
    let staffMap: Record<string, any> = {};

    if (staffIds.length > 0) {
      // Try staff table
      const { data: staffNames } = await supabase
        .from("staff")
        .select("id, name, designation")
        .in("id", staffIds);
      (staffNames || []).forEach((s: any) => { staffMap[s.id] = { name: s.name, designation: s.designation, type: "Staff" }; });

      // Try teachers table for remaining
      const missingIds = staffIds.filter(id => !staffMap[id]);
      if (missingIds.length > 0) {
        const { data: teacherNames } = await (supabase as any)
          .from("teachers")
          .select("id, first_name, last_name, designation")
          .in("id", missingIds);
        (teacherNames || []).forEach((t: any) => {
          staffMap[t.id] = { name: `${t.first_name} ${t.last_name}`, designation: t.designation, type: "Teacher" };
        });
      }
    }

    const enriched = (data || []).map((r: any) => ({
      ...r,
      staff_name: staffMap[r.staff_id]?.name || "Unknown",
      staff_designation: staffMap[r.staff_id]?.designation || "—",
      staff_type: staffMap[r.staff_id]?.type || "—",
    }));
    setSalaryRecords(enriched);
  };

  const processPayroll = async () => {
    if (!schoolId) return;
    setLoading(true);

    let processed = 0;
    for (const emp of allEmployees) {
      const netSalary = (emp.salary_base + emp.allowances) - emp.deductions;

      const { error } = await supabase.from("salary_records").upsert({
        staff_id: emp.id,
        month: selectedMonth,
        year: selectedYear,
        basic_salary: emp.salary_base,
        allowances: emp.allowances,
        deductions: emp.deductions,
        net_salary: netSalary,
        payment_status: "Pending",
      }, {
        onConflict: "staff_id,month,year"
      });

      if (!error) processed++;
    }

    setLoading(false);
    toast({ title: `Payroll processed for ${processed} employees` });
    fetchSalaryRecords(schoolId);
    setOpen(false);
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("salary_records")
      .update({ payment_status: "Paid", payment_date: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating payment", variant: "destructive" });
    } else {
      toast({ title: "Payment marked as paid" });
      if (schoolId) fetchSalaryRecords(schoolId);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("default", { month: "long", year: "numeric" });

  // Summary stats
  const totalPayroll = salaryRecords.reduce((s, r) => s + (r.net_salary || 0), 0);
  const paidCount = salaryRecords.filter(r => r.payment_status === "Paid").length;
  const pendingCount = salaryRecords.filter(r => r.payment_status === "Pending").length;
  const paidAmount = salaryRecords.filter(r => r.payment_status === "Paid").reduce((s, r) => s + (r.net_salary || 0), 0);
  const pendingAmount = salaryRecords.filter(r => r.payment_status === "Pending").reduce((s, r) => s + (r.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Salary Management</h2>
          <p className="text-muted-foreground">Manage payroll for all teachers and staff</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>
                  {new Date(2024, i).toLocaleDateString("default", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><DollarSign className="mr-2 h-4 w-4" /> Process Payroll</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Process Payroll — {monthName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>This will generate salary records for <strong>{allEmployees.length}</strong> employees ({allEmployees.filter(e => e.type === "Teacher").length} teachers + {allEmployees.filter(e => e.type === "Staff").length} staff).</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Teachers: {allEmployees.filter(e => e.type === "Teacher").length}</p>
                  <p>• Staff: {allEmployees.filter(e => e.type === "Staff").length}</p>
                  <p>• Total Payroll: ₹{allEmployees.reduce((s, e) => s + (e.salary_base + e.allowances - e.deductions), 0).toLocaleString("en-IN")}</p>
                </div>
                <Button onClick={processPayroll} disabled={loading} className="w-full">
                  {loading ? "Processing..." : "Confirm & Process Payroll"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{allEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold">₹{totalPayroll.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Paid ({paidCount})</p>
                <p className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending ({pendingCount})</p>
                <p className="text-2xl font-bold text-orange-600">₹{pendingAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Details — {monthName}</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No salary records for {monthName}.</p>
              <p className="text-sm text-muted-foreground">Click "Process Payroll" to generate salary records for all employees.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryRecords.map((record, idx) => (
                  <TableRow key={record.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{record.staff_name}</TableCell>
                    <TableCell>
                      <Badge variant={record.staff_type === "Teacher" ? "default" : "secondary"}>
                        {record.staff_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.staff_designation}</TableCell>
                    <TableCell>₹{(record.basic_salary || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-green-600">+₹{(record.allowances || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-red-600">-₹{(record.deductions || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="font-bold">₹{(record.net_salary || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={record.payment_status === "Paid" ? "default" : "destructive"}>
                        {record.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.payment_date
                        ? new Date(record.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {record.payment_status === "Pending" && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(record.id)}>
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Employees Reference */}
      {salaryRecords.length === 0 && allEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Employees ({allEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEmployees.map((emp, idx) => (
                  <TableRow key={emp.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <Badge variant={emp.type === "Teacher" ? "default" : "secondary"}>{emp.type}</Badge>
                    </TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>₹{emp.salary_base.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-green-600">+₹{emp.allowances.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-red-600">-₹{emp.deductions.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="font-bold">₹{(emp.salary_base + emp.allowances - emp.deductions).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}