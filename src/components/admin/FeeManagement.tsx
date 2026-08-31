import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, DollarSign, Percent, AlertTriangle, Receipt, Loader2, CreditCard, MessageSquare } from "lucide-react";
import { feeSchema } from "@/lib/validation";
import { sendFeeNotificationWhatsApp } from "@/lib/whatsapp";

export const FeeManagement = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [discountDialog, setDiscountDialog] = useState<{ open: boolean; feeId: string }>({ open: false, feeId: "" });
  const [fineDialog, setFineDialog] = useState<{ open: boolean; feeId: string }>({ open: false, feeId: "" });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; feeId: string }>({ open: false, feeId: "" });
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    student_id: "",
    fee_type: "Tuition",
    amount: "",
    due_date: "",
    academic_year: new Date().getFullYear().toString(),
    total_installments: "1",
    installment_number: "1"
  });

  const [discountData, setDiscountData] = useState({ amount: "", reason: "" });
  const [fineData, setFineData] = useState({ amount: "", reason: "" });
  const [paymentData, setPaymentData] = useState({ amount: "", method: "cash" });
  const [schoolId, setSchoolId] = useState<string>("");
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(true);

  useEffect(() => {
    fetchFees();
    fetchStudents();
    fetchSchoolId();
  }, []);

  const fetchSchoolId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("school_id").eq("user_id", user.id).maybeSingle();
    if (data?.school_id) setSchoolId(data.school_id);
  };

  const fetchFees = async () => {
    const { data, error } = await supabase
      .from("fee_payments")
      .select("*")
      .order("due_date", { ascending: false });

    if (error) {
      console.error("fetchFees error:", error);
      toast.error("Failed to load fees");
      return;
    }
    setFees(data || []);

    // Fetch student names for display
    const studentIds = [...new Set((data || []).map((f: any) => f.student_id).filter(Boolean))];
    if (studentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      if (profilesData) {
        const namesMap: Record<string, string> = {};
        profilesData.forEach((p: any) => { namesMap[p.id] = p.full_name; });
        setStudentNames(prev => ({ ...prev, ...namesMap }));
      }
    }
  };

  const fetchStudents = async () => {
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (roleError) {
      console.error("fetchStudents role error:", roleError);
      toast.error("Failed to load students");
      return;
    }

    const userIds = (roleData || []).map((r: any) => r.user_id);
    if (userIds.length === 0) {
      setStudents([]);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("fetchStudents profiles error:", profilesError);
      toast.error("Failed to load students");
      return;
    }
    setStudents(profilesData || []);

    // Update names map
    const namesMap: Record<string, string> = {};
    (profilesData || []).forEach((p: any) => { namesMap[p.id] = p.full_name; });
    setStudentNames(prev => ({ ...prev, ...namesMap }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate input
    const validation = feeSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ');
      toast.error(errors);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.school_id) {
      toast.error("School not found");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("fee_payments")
      .insert({
        student_id: formData.student_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        fee_type: formData.fee_type,
        academic_year: formData.academic_year,
        school_id: userRole.school_id,
        total_installments: parseInt(formData.total_installments),
        installment_number: parseInt(formData.installment_number)
      });

    if (error) {
      toast.error("Failed to create fee record");
      setLoading(false);
      return;
    }

    toast.success("Fee record created successfully");
    setIsOpen(false);
    setFormData({
      student_id: "",
      fee_type: "Tuition",
      amount: "",
      due_date: "",
      academic_year: new Date().getFullYear().toString(),
      total_installments: "1",
      installment_number: "1"
    });
    fetchFees();
    setLoading(false);
  };

  const applyDiscount = async () => {
    if (!discountData.amount) return;
    setLoading(true);

    const { error } = await supabase
      .from("fee_payments")
      .update({
        discount_amount: parseFloat(discountData.amount),
        discount_reason: discountData.reason
      })
      .eq("id", discountDialog.feeId);

    if (error) {
      toast.error("Failed to apply discount");
    } else {
      toast.success("Discount applied successfully");
      fetchFees();
    }
    setDiscountDialog({ open: false, feeId: "" });
    setDiscountData({ amount: "", reason: "" });
    setLoading(false);
  };

  const applyFine = async () => {
    if (!fineData.amount) return;
    setLoading(true);

    const { error } = await supabase
      .from("fee_payments")
      .update({
        fine_amount: parseFloat(fineData.amount),
        fine_reason: fineData.reason
      })
      .eq("id", fineDialog.feeId);

    if (error) {
      toast.error("Failed to apply fine");
    } else {
      toast.success("Fine applied successfully");
      fetchFees();
    }
    setFineDialog({ open: false, feeId: "" });
    setFineData({ amount: "", reason: "" });
    setLoading(false);
  };

  const updatePayment = async () => {
    const fee = fees.find(f => f.id === paymentDialog.feeId);
    if (!fee || !paymentData.amount) return;
    setLoading(true);

    const effectiveAmount = fee.amount - (fee.discount_amount || 0) + (fee.fine_amount || 0);
    const newPaidAmount = (fee.paid_amount || 0) + parseFloat(paymentData.amount);
    const status = newPaidAmount >= effectiveAmount ? "paid" : newPaidAmount > 0 ? "partial" : "pending";

    const { error } = await supabase
      .from("fee_payments")
      .update({
        paid_amount: newPaidAmount,
        status,
        payment_method: paymentData.method
      })
      .eq("id", paymentDialog.feeId);

    if (error) {
      toast.error("Failed to update payment");
    } else {
      toast.success("Payment recorded successfully");
      
      // Auto-send WhatsApp receipt to parent
      if (sendWhatsAppReceipt && schoolId) {
        try {
          await sendFeeNotificationWhatsApp({
            schoolId,
            studentId: fee.student_id,
            type: "receipt",
            amount: paymentData.amount,
            feeType: fee.fee_type,
          });
          toast.success("WhatsApp receipt sent to parent");
        } catch (waErr) {
          console.error("Failed to send WhatsApp fee receipt:", waErr);
        }
      }

      fetchFees();
    }
    setPaymentDialog({ open: false, feeId: "" });
    setPaymentData({ amount: "", method: "cash" });
    setLoading(false);
  };

  const handleSendReminder = async (fee: any) => {
    if (!schoolId) {
      toast.error("School ID not found");
      return;
    }
    const dueAmount = getEffectiveAmount(fee) - (fee.paid_amount || 0);
    try {
      const res = await sendFeeNotificationWhatsApp({
        schoolId,
        studentId: fee.student_id,
        type: "reminder",
        amount: dueAmount,
        feeType: fee.fee_type,
        dueDate: fee.due_date,
      });

      if (res.success) {
        toast.success(`WhatsApp reminder sent to ${studentNames[fee.student_id] || "Parent"}`);
      } else {
        toast.error("Failed to send WhatsApp reminder");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to dispatch reminder");
    }
  };

  const getEffectiveAmount = (fee: any) => {
    return fee.amount - (fee.discount_amount || 0) + (fee.fine_amount || 0);
  };

  const getStatusBadge = (fee: any) => {
    const config: Record<string, { class: string; label: string }> = {
      paid: { class: "bg-success/20 text-success", label: "Paid" },
      partial: { class: "bg-warning/20 text-warning", label: "Partial" },
      pending: { class: "bg-danger/20 text-danger", label: "Pending" }
    };
    const c = config[fee.status] || config.pending;
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Fee Management
            </CardTitle>
            <CardDescription>Manage student fees with installments, discounts, and fines</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80">
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50">
              <DialogHeader>
                <DialogTitle>Add New Fee</DialogTitle>
                <DialogDescription>Create a fee record for a student</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student">Student</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fee_type">Fee Type</Label>
                  <Select
                    value={formData.fee_type}
                    onValueChange={(value) => setFormData({ ...formData, fee_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tuition">Tuition</SelectItem>
                      <SelectItem value="Library">Library</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Lab">Lab</SelectItem>
                      <SelectItem value="Exam">Exam</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Installments</Label>
                    <Select
                      value={formData.total_installments}
                      onValueChange={(value) => setFormData({ ...formData, total_installments: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6, 12].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Installment #</Label>
                    <Select
                      value={formData.installment_number}
                      onValueChange={(value) => setFormData({ ...formData, installment_number: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: parseInt(formData.total_installments) }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="2024"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>Student</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Discount/Fine</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Installment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map((fee) => (
              <TableRow key={fee.id} className="border-border/50">
                <TableCell className="font-medium">{studentNames[fee.student_id] || 'Unknown'}</TableCell>
                <TableCell>{fee.fee_type}</TableCell>
                <TableCell>
                  <span className={fee.discount_amount || fee.fine_amount ? "line-through text-muted-foreground" : ""}>
                    ₹{fee.amount}
                  </span>
                  {(fee.discount_amount || fee.fine_amount) && (
                    <span className="ml-2 font-medium">₹{getEffectiveAmount(fee)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {fee.discount_amount > 0 && (
                      <span className="text-success text-xs">-₹{fee.discount_amount}</span>
                    )}
                    {fee.fine_amount > 0 && (
                      <span className="text-danger text-xs">+₹{fee.fine_amount}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>₹{fee.paid_amount || 0}</TableCell>
                <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {fee.total_installments > 1 && (
                    <Badge variant="outline">{fee.installment_number}/{fee.total_installments}</Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(fee)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                      onClick={() => setDiscountDialog({ open: true, feeId: fee.id })}
                      title="Apply Discount"
                    >
                      <Percent className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger/10"
                      onClick={() => setFineDialog({ open: true, feeId: fee.id })}
                      title="Apply Fine"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                    {fee.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                        onClick={() => handleSendReminder(fee)}
                        title="Send WhatsApp Due Reminder"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => setPaymentDialog({ open: true, feeId: fee.id })}
                      title="Record Payment"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Discount Dialog */}
      <Dialog open={discountDialog.open} onOpenChange={(open) => setDiscountDialog({ open, feeId: discountDialog.feeId })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-success" />
              Apply Discount
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Discount Amount</Label>
              <Input
                type="number"
                value={discountData.amount}
                onChange={(e) => setDiscountData({ ...discountData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={discountData.reason}
                onChange={(e) => setDiscountData({ ...discountData, reason: e.target.value })}
                placeholder="e.g., Scholarship, Sibling discount..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialog({ open: false, feeId: "" })}>Cancel</Button>
            <Button onClick={applyDiscount} disabled={loading} className="bg-success text-success-foreground hover:bg-success/90">
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fine Dialog */}
      <Dialog open={fineDialog.open} onOpenChange={(open) => setFineDialog({ open, feeId: fineDialog.feeId })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Apply Fine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fine Amount</Label>
              <Input
                type="number"
                value={fineData.amount}
                onChange={(e) => setFineData({ ...fineData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={fineData.reason}
                onChange={(e) => setFineData({ ...fineData, reason: e.target.value })}
                placeholder="e.g., Late payment penalty..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFineDialog({ open: false, feeId: "" })}>Cancel</Button>
            <Button onClick={applyFine} disabled={loading} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Apply Fine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, feeId: paymentDialog.feeId })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentData.method}
                onValueChange={(value) => setPaymentData({ ...paymentData, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-3 bg-muted/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <Label htmlFor="send-wa-receipt" className="text-xs font-semibold cursor-pointer">
                    WhatsApp Receipt to Parent
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Send payment confirmation to parent via WhatsApp
                </p>
              </div>
              <Switch
                id="send-wa-receipt"
                checked={sendWhatsAppReceipt}
                onCheckedChange={setSendWhatsAppReceipt}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, feeId: "" })}>Cancel</Button>
            <Button onClick={updatePayment} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
