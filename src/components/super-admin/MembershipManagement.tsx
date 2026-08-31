import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentMembership {
  student_id: string;
  student_name: string;
  school_name: string;
  school_id: string;
  total_pending: number;
  total_paid: number;
  account_status: string;
}

export const MembershipManagement = () => {
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<StudentMembership[]>([]);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      setLoading(true);

      // Fetch all students with their school and fee information
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          user_id,
          first_name,
          last_name,
          school_id,
          schools (
            name
          )
        `);

      if (studentsError) throw studentsError;

      // Fetch all fee payments
      const { data: feeData, error: feeError } = await supabase
        .from("fee_payments")
        .select("student_id, status, amount, paid_amount");

      if (feeError) throw feeError;

      // Fetch profile statuses
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, account_status");

      if (profilesError) throw profilesError;

      // Process the data
      const membershipList: StudentMembership[] = studentsData.map((student: any) => {
        const studentFees = feeData?.filter(fee => fee.student_id === student.user_id) || [];
        const totalPending = studentFees
          .filter(fee => fee.status === "pending" || fee.status === "overdue")
          .reduce((sum, fee) => sum + (Number(fee.amount) - Number(fee.paid_amount || 0)), 0);
        const totalPaid = studentFees
          .filter(fee => fee.status === "paid")
          .reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);

        const profile = profilesData?.find(p => p.id === student.user_id);

        return {
          student_id: student.user_id,
          student_name: `${student.first_name} ${student.last_name}`,
          school_name: student.schools?.name || "N/A",
          school_id: student.school_id,
          total_pending: totalPending,
          total_paid: totalPaid,
          account_status: profile?.account_status || "Active"
        };
      });

      setMemberships(membershipList);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemberships = memberships.filter(membership => {
    if (filter === "paid") return membership.total_pending === 0;
    if (filter === "unpaid") return membership.total_pending > 0;
    return true;
  });

  const handleUnfreeze = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: "Active" })
        .eq("id", studentId);

      if (error) throw error;

      // Refresh the list
      fetchMemberships();
    } catch (error) {
      console.error("Error unfreezing account:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Student Membership Management</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {filteredMemberships.length} students
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Pending Amount</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMemberships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMemberships.map((membership) => (
                  <TableRow key={membership.student_id}>
                    <TableCell className="font-medium">{membership.student_name}</TableCell>
                    <TableCell>{membership.school_name}</TableCell>
                    <TableCell className="text-right">₹{membership.total_paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {membership.total_pending > 0 ? (
                        <span className="text-destructive font-medium">
                          ₹{membership.total_pending.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">₹0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={membership.account_status === "Frozen" ? "destructive" : "default"}>
                        {membership.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={membership.total_pending > 0 ? "destructive" : "default"}>
                        {membership.total_pending > 0 ? "Unpaid" : "Paid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {membership.account_status === "Frozen" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnfreeze(membership.student_id)}
                        >
                          Unfreeze
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
