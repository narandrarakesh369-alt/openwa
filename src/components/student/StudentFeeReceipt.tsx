import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export const StudentFeeReceipt = () => {
  const [loading, setLoading] = useState(true);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);

  useEffect(() => {
    fetchFeeData();
  }, []);

  const fetchFeeData = async () => {
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

      // Fetch fee payments
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      setFeePayments(payments || []);
    }

    setLoading(false);
  };

  const handleDownload = (payment: any) => {
    // In a real application, this would generate and download a PDF
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const paidPayments = feePayments.filter(p => p.status === "paid");
  const pendingPayments = feePayments.filter(p => p.status === "pending" || p.status === "overdue");

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Receipts</h1>
        <p className="text-muted-foreground">View and download your fee payment receipts</p>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Pending Payments</h3>
                <p className="text-sm text-orange-800 mt-1">
                  You have {pendingPayments.length} pending fee payment{pendingPayments.length > 1 ? "s" : ""}. 
                  Please clear your dues at the earliest.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Payments</h2>
          {pendingPayments.map((payment) => (
            <Card key={payment.id} className="border-orange-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{payment.fee_type}</h3>
                      <Badge variant="destructive">
                        {payment.status === "overdue" ? "Overdue" : "Pending"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Academic Year: {payment.academic_year}</p>
                      <p>Amount: ₹{payment.amount}</p>
                      <p>Due Date: {format(new Date(payment.due_date), "PPP")}</p>
                      {payment.paid_amount > 0 && (
                        <p>Paid: ₹{payment.paid_amount} | Remaining: ₹{payment.amount - payment.paid_amount}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paid Receipts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payment History</h2>
        {paidPayments.length > 0 ? (
          paidPayments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{payment.fee_type}</h3>
                      <Badge className="bg-green-100 text-green-800">Paid</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Receipt No</p>
                        <p className="font-medium">{payment.transaction_id || payment.id.slice(0, 8)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Academic Year</p>
                        <p className="font-medium">{payment.academic_year}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount Paid</p>
                        <p className="font-medium">₹{payment.paid_amount || payment.amount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Date</p>
                        <p className="font-medium">{format(new Date(payment.updated_at), "PPP")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium capitalize">{payment.payment_method || "Cash"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Student Name</p>
                        <p className="font-medium">{studentData?.first_name} {studentData?.last_name}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        School: {schoolData?.name} | Admission No: {studentData?.admission_number}
                      </p>
                    </div>
                  </div>

                  <Button onClick={() => handleDownload(payment)} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No payment history available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
