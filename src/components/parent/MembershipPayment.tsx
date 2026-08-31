import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function MembershipPayment() {
  const [payments, setPayments] = useState<any[]>([]);
  const [currentPayment, setCurrentPayment] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from("parent_payments")
      .select("*")
      .eq("parent_id", user?.id)
      .order("created_at", { ascending: false });

    setPayments(data || []);
    
    // Get current active payment
    const active = data?.find(p => p.status === "Paid" && new Date(p.expiry_date) > new Date());
    setCurrentPayment(active);
  };

  const handlePayment = () => {
    // This would integrate with Stripe/Razorpay
    toast({ 
      title: "Payment Gateway Integration Required",
      description: "Please provide Stripe/Razorpay API keys to enable payments"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      "Paid": "default",
      "Pending": "secondary",
      "Overdue": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Membership Status</h2>
        {currentPayment ? (
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">✓ Active Membership</p>
            <p className="text-sm text-muted-foreground mt-2">
              Valid until: {new Date(currentPayment.expiry_date).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <p className="text-lg font-semibold text-red-700 dark:text-red-300">⚠ No Active Membership</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please make a payment to continue accessing the platform
            </p>
            <Button onClick={handlePayment} className="mt-4">
              <CreditCard className="mr-2 h-4 w-4" /> Make Payment
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Payment History</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">₹{payment.amount}</TableCell>
                <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>{new Date(payment.expiry_date).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>
                  {payment.status === "Pending" ? (
                    <Button size="sm" onClick={handlePayment}>
                      <CreditCard className="mr-2 h-4 w-4" /> Pay Now
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" /> Receipt
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}