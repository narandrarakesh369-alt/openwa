import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, MessageSquare, Check, X, ArrowUpCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PlanInfo {
  plan_type: string;
  whatsapp_enabled: boolean;
  school_status: string;
}

interface WhatsAppUsage {
  messages_sent: number;
  message_limit: number;
}

interface PendingRequest {
  id: string;
  requested_plan: string;
  status: string;
  requested_at: string;
}

const PLAN_FEATURES = {
  BASIC: {
    price: 299,
    features: [
      { name: "Attendance", included: true },
      { name: "Homework & Notes", included: true },
      { name: "Timetable", included: true },
      { name: "Exams & Reports", included: true },
      { name: "Certificates", included: true },
      { name: "Parent & Student Apps", included: true },
      { name: "WhatsApp Absent Alerts", included: false },
      { name: "WhatsApp Fee Reminders", included: false },
      { name: "WhatsApp Announcements", included: false },
    ],
    whatsappLimit: 0,
  },
  STANDARD: {
    price: 399,
    features: [
      { name: "Attendance", included: true },
      { name: "Homework & Notes", included: true },
      { name: "Timetable", included: true },
      { name: "Exams & Reports", included: true },
      { name: "Certificates", included: true },
      { name: "Parent & Student Apps", included: true },
      { name: "WhatsApp Absent Alerts", included: true },
      { name: "WhatsApp Fee Reminders", included: false },
      { name: "WhatsApp Announcements", included: false },
    ],
    whatsappLimit: 1000,
  },
  PREMIUM: {
    price: 499,
    features: [
      { name: "Attendance", included: true },
      { name: "Homework & Notes", included: true },
      { name: "Timetable", included: true },
      { name: "Exams & Reports", included: true },
      { name: "Certificates", included: true },
      { name: "Parent & Student Apps", included: true },
      { name: "WhatsApp Absent Alerts", included: true },
      { name: "WhatsApp Fee Reminders", included: true },
      { name: "WhatsApp Announcements", included: true },
      { name: "Priority Support", included: true },
    ],
    whatsappLimit: 3000,
  },
};

export const PlanInfoCard = () => {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [whatsappUsage, setWhatsappUsage] = useState<WhatsAppUsage | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlanInfo();
  }, []);

  const fetchPlanInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's school
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!roleData?.school_id) return;
      setSchoolId(roleData.school_id);

      // Get school plan info
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("plan_type, whatsapp_enabled, school_status")
        .eq("id", roleData.school_id)
        .single();

      if (schoolError) throw schoolError;
      setPlanInfo(schoolData);

      // Get WhatsApp usage for current month
      const currentMonth = format(new Date(), "yyyy-MM");
      const { data: usageData } = await supabase
        .from("whatsapp_usage")
        .select("messages_sent, message_limit")
        .eq("school_id", roleData.school_id)
        .eq("month_year", currentMonth)
        .single();

      setWhatsappUsage(usageData);

      // Check for pending upgrade request
      const { data: requestData } = await supabase
        .from("plan_change_requests")
        .select("id, requested_plan, status, requested_at")
        .eq("school_id", roleData.school_id)
        .eq("status", "Pending")
        .order("requested_at", { ascending: false })
        .limit(1)
        .single();

      setPendingRequest(requestData);
    } catch (error: any) {
      console.error("Error fetching plan info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeRequest = async () => {
    if (!selectedPlan || !schoolId) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("plan_change_requests")
        .insert({
          school_id: schoolId,
          requested_plan: selectedPlan,
          requested_by: user.id,
        });

      if (error) throw error;

      toast.success("Upgrade request submitted. Super Admin will review it shortly.");
      setUpgradeDialogOpen(false);
      setSelectedPlan("");
      fetchPlanInfo();
    } catch (error: any) {
      toast.error("Failed to submit request: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "BASIC": return "bg-slate-500";
      case "STANDARD": return "bg-blue-500";
      case "PREMIUM": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return <Card className="animate-pulse h-48" />;
  }

  if (!planInfo) {
    return null;
  }

  const currentPlanDetails = PLAN_FEATURES[planInfo.plan_type as keyof typeof PLAN_FEATURES];
  const usagePercent = whatsappUsage && whatsappUsage.message_limit > 0
    ? (whatsappUsage.messages_sent / whatsappUsage.message_limit) * 100
    : 0;
  const isNearLimit = usagePercent >= 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className={`h-6 w-6 ${getPlanColor(planInfo.plan_type).replace("bg-", "text-")}`} />
            <div>
              <CardTitle className="flex items-center gap-2">
                {planInfo.plan_type} Plan
                <Badge className={getPlanColor(planInfo.plan_type)}>
                  ₹{currentPlanDetails.price}/Student/Year
                </Badge>
              </CardTitle>
              <CardDescription>Your current subscription plan</CardDescription>
            </div>
          </div>
          {planInfo.plan_type !== "PREMIUM" && !pendingRequest && (
            <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Request Upgrade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Plan Upgrade</DialogTitle>
                  <DialogDescription>
                    Select the plan you want to upgrade to. Super Admin will review your request.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                    {Object.entries(PLAN_FEATURES)
                      .filter(([plan]) => {
                        const planOrder = { BASIC: 1, STANDARD: 2, PREMIUM: 3 };
                        return planOrder[plan as keyof typeof planOrder] > planOrder[planInfo.plan_type as keyof typeof planOrder];
                      })
                      .map(([plan, details]) => (
                        <div
                          key={plan}
                          className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedPlan === plan ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <RadioGroupItem value={plan} id={plan} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={plan} className="text-base font-semibold cursor-pointer">
                              {plan} - ₹{details.price}/Student/Year
                            </Label>
                            <div className="mt-2 space-y-1">
                              {details.features
                                .filter((f) => f.included && !currentPlanDetails.features.find((cf) => cf.name === f.name && cf.included))
                                .map((feature) => (
                                  <div key={feature.name} className="flex items-center gap-2 text-sm text-green-600">
                                    <Check className="h-4 w-4" />
                                    {feature.name}
                                  </div>
                                ))}
                              {details.whatsappLimit > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MessageSquare className="h-4 w-4" />
                                  {details.whatsappLimit.toLocaleString()} WhatsApp msgs/month
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </RadioGroup>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpgradeRequest} disabled={!selectedPlan || submitting}>
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {pendingRequest && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Upgrade to {pendingRequest.requested_plan} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Features List */}
        <div>
          <h4 className="font-medium mb-3">Plan Features</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentPlanDetails.features.map((feature) => (
              <div
                key={feature.name}
                className={`flex items-center gap-2 text-sm ${
                  feature.included ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {feature.included ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                {feature.name}
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Usage */}
        {planInfo.plan_type !== "BASIC" && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp Usage This Month
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Messages Sent</span>
                <span>
                  {whatsappUsage?.messages_sent || 0} / {whatsappUsage?.message_limit || currentPlanDetails.whatsappLimit}
                </span>
              </div>
              <Progress 
                value={usagePercent} 
                className={`h-2 ${isNearLimit ? "[&>div]:bg-amber-500" : ""}`} 
              />
              {isNearLimit && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Approaching message limit. Contact Super Admin to increase limit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <span className="text-sm">WhatsApp Notifications</span>
          <Badge variant={planInfo.whatsapp_enabled ? "default" : "secondary"}>
            {planInfo.whatsapp_enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {planInfo.plan_type === "BASIC" && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Upgrade to STANDARD or PREMIUM</strong> to enable WhatsApp notifications for attendance alerts, fee reminders, and announcements.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
