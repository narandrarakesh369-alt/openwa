import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export function StudentMembershipView() {
  const [loading, setLoading] = useState(true);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);

  useEffect(() => {
    fetchFeeData();
  }, []);

  const fetchFeeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch student data
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (student) {
        setStudentData(student);

        // Fetch school separately
        const { data: school } = await supabase
          .from("schools")
          .select("*")
          .eq("id", student.school_id)
          .maybeSingle();

        setSchoolData(school);

        // Fetch fee payments
        const { data: payments } = await supabase
          .from("fee_payments")
          .select("*")
          .eq("student_id", student.id)
          .order("due_date", { ascending: false });

        setFeePayments(payments || []);
      }
    } catch (error) {
      console.error("Error fetching fee data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (payment: any) => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingPayments = feePayments.filter(p => p.status === "pending" || p.status === "overdue");
  const paidPayments = feePayments.filter(p => p.status === "paid");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Membership & Fee Payments</h1>
        <p className="text-muted-foreground mt-2">View your fee payment history and pending dues</p>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="bg-background p-4 rounded-lg border border-orange-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{payment.fee_type}</p>
                    <p className="text-sm text-muted-foreground">
                      Academic Year: {payment.academic_year}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {payment.status === "overdue" ? "Overdue" : "Pending"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount Due</p>
                    <p className="font-semibold">₹{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-semibold">
                      {format(new Date(payment.due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paidPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paidPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Receipt Header */}
                      <div className="text-center border-b pb-4">
                        <h3 className="text-lg font-semibold">{schoolData?.name || "School"}</h3>
                        <p className="text-sm text-muted-foreground">{schoolData?.address}</p>
                        <p className="text-sm text-muted-foreground">
                          Phone: {schoolData?.phone} | Email: {schoolData?.email}
                        </p>
                        <h4 className="text-xl font-bold mt-2 text-primary">FEE RECEIPT</h4>
                      </div>

                      {/* Receipt Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Receipt No.</p>
                          <p className="font-semibold">
                            {payment.transaction_id || `FEE-${payment.id.slice(0, 8).toUpperCase()}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-semibold">
                            {payment.updated_at ? format(new Date(payment.updated_at), "dd MMM yyyy") : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Academic Year</p>
                          <p className="font-semibold">{payment.academic_year}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fee Type</p>
                          <p className="font-semibold">{payment.fee_type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Student Name</p>
                          <p className="font-semibold">
                            {studentData?.first_name} {studentData?.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Admission No.</p>
                          <p className="font-semibold">{studentData?.admission_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount Paid</p>
                          <p className="font-semibold text-green-600">₹{payment.paid_amount || payment.amount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Method</p>
                          <p className="font-semibold">{payment.payment_method || "Cash"}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Badge variant="default" className="bg-green-500">Paid</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(payment)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingPayments.length === 0 && paidPayments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Fee Records Found</p>
            <p className="text-muted-foreground mt-2">
              No fee payments have been recorded for your account yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
