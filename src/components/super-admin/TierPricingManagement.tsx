import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, MessageSquare, Building2, CheckCircle, XCircle, Clock, Settings, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface School {
  id: string;
  name: string;
  code: string;
  plan_type: string;
  plan_expiry: string | null;
  whatsapp_enabled: boolean;
  school_status: string;
  is_active: boolean;
}

interface WhatsAppUsage {
  school_id: string;
  month_year: string;
  messages_sent: number;
  message_limit: number;
}

interface PlanRequest {
  id: string;
  school_id: string;
  requested_plan: string;
  requested_by: string;
  status: string;
  requested_at: string;
  school?: { name: string };
}

const PLAN_DETAILS = {
  BASIC: {
    price: 299,
    color: "bg-slate-500",
    features: ["Attendance", "Homework & Notes", "Timetable", "Exams & Reports", "Certificates", "Parent & Student Apps"],
    whatsappLimit: 0,
  },
  STANDARD: {
    price: 399,
    color: "bg-blue-500",
    features: ["Everything in BASIC", "WhatsApp Absent Alerts"],
    whatsappLimit: 1000,
  },
  PREMIUM: {
    price: 499,
    color: "bg-amber-500",
    features: ["Everything in STANDARD", "WhatsApp Fee Reminders", "WhatsApp Announcements", "Priority Support"],
    whatsappLimit: 3000,
  },
};

export const TierPricingManagement = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [whatsappUsage, setWhatsappUsage] = useState<WhatsAppUsage[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customLimit, setCustomLimit] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from("schools")
        .select("id, name, code, plan_type, plan_expiry, whatsapp_enabled, school_status, is_active")
        .is("deleted_at", null)
        .order("name");

      if (schoolsError) throw schoolsError;

      // Fetch WhatsApp usage for current month
      const currentMonth = format(new Date(), "yyyy-MM");
      const { data: usageData, error: usageError } = await supabase
        .from("whatsapp_usage")
        .select("*")
        .eq("month_year", currentMonth);

      if (usageError) throw usageError;

      // Fetch pending plan requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("plan_change_requests")
        .select("*, school:school_id(name)")
        .eq("status", "Pending")
        .order("requested_at", { ascending: false });

      if (requestsError) throw requestsError;

      setSchools(schoolsData || []);
      setWhatsappUsage(usageData || []);
      setPlanRequests(requestsData || []);
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSchoolUsage = (schoolId: string) => {
    return whatsappUsage.find((u) => u.school_id === schoolId);
  };

  const handlePlanChange = async (schoolId: string, newPlan: string) => {
    try {
      const messageLimit = PLAN_DETAILS[newPlan as keyof typeof PLAN_DETAILS].whatsappLimit;
      const whatsappEnabled = newPlan !== "BASIC";

      const { error } = await supabase
        .from("schools")
        .update({ 
          plan_type: newPlan, 
          whatsapp_enabled: whatsappEnabled 
        })
        .eq("id", schoolId);

      if (error) throw error;

      // Update or create usage record with new limit
      const currentMonth = format(new Date(), "yyyy-MM");
      await supabase
        .from("whatsapp_usage")
        .upsert({
          school_id: schoolId,
          month_year: currentMonth,
          message_limit: messageLimit,
        }, { onConflict: "school_id,month_year" });

      toast.success(`Plan updated to ${newPlan}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update plan: " + error.message);
    }
  };

  const handleWhatsAppToggle = async (schoolId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ whatsapp_enabled: enabled })
        .eq("id", schoolId);

      if (error) throw error;
      toast.success(`WhatsApp ${enabled ? "enabled" : "disabled"}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update WhatsApp status: " + error.message);
    }
  };

  const handleStatusChange = async (schoolId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ school_status: status })
        .eq("id", schoolId);

      if (error) throw error;
      toast.success(`School status updated to ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  const handleLimitOverride = async () => {
    if (!selectedSchool || !customLimit) return;

    try {
      const currentMonth = format(new Date(), "yyyy-MM");
      const { error } = await supabase
        .from("whatsapp_usage")
        .upsert({
          school_id: selectedSchool.id,
          month_year: currentMonth,
          message_limit: parseInt(customLimit),
        }, { onConflict: "school_id,month_year" });

      if (error) throw error;
      toast.success("Message limit updated");
      setEditDialogOpen(false);
      setCustomLimit("");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update limit: " + error.message);
    }
  };

  const handleRequestAction = async (requestId: string, action: "Approved" | "Rejected", schoolId: string, requestedPlan: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: requestError } = await supabase
        .from("plan_change_requests")
        .update({ 
          status: action, 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id 
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      if (action === "Approved") {
        await handlePlanChange(schoolId, requestedPlan);
      }

      toast.success(`Request ${action.toLowerCase()}`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to process request: " + error.message);
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "BASIC": return "bg-slate-500";
      case "STANDARD": return "bg-blue-500";
      case "PREMIUM": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Plan Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(PLAN_DETAILS).map(([plan, details]) => (
          <Card key={plan} className={`border-t-4 ${details.color.replace("bg-", "border-")}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Crown className={`h-5 w-5 ${details.color.replace("bg-", "text-")}`} />
                {plan}
              </CardTitle>
              <CardDescription>₹{details.price} / Student / Year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schools.filter((s) => s.plan_type === plan).length}
              </div>
              <p className="text-sm text-muted-foreground">Schools on this plan</p>
              <div className="mt-2 text-xs text-muted-foreground">
                WhatsApp: {details.whatsappLimit === 0 ? "Not included" : `${details.whatsappLimit.toLocaleString()} msgs/month`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="schools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schools" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            School Plans
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Upgrade Requests
            {planRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">{planRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schools">
          <Card>
            <CardHeader>
              <CardTitle>School Plan Management</CardTitle>
              <CardDescription>Manage plans, WhatsApp access, and school status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => {
                    const usage = getSchoolUsage(school.id);
                    const usagePercent = usage ? (usage.messages_sent / usage.message_limit) * 100 : 0;
                    
                    return (
                      <TableRow key={school.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{school.name}</div>
                            <div className="text-sm text-muted-foreground">{school.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={school.plan_type}
                            onValueChange={(value) => handlePlanChange(school.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BASIC">BASIC</SelectItem>
                              <SelectItem value="STANDARD">STANDARD</SelectItem>
                              <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={school.whatsapp_enabled}
                              onCheckedChange={(checked) => handleWhatsAppToggle(school.id, checked)}
                              disabled={school.plan_type === "BASIC"}
                            />
                            <span className="text-sm">
                              {school.whatsapp_enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {school.plan_type !== "BASIC" && usage ? (
                            <div className="space-y-1 w-32">
                              <Progress value={usagePercent} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                {usage.messages_sent} / {usage.message_limit}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={school.school_status}
                            onValueChange={(value) => handleStatusChange(school.id, value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Frozen">Frozen</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Dialog open={editDialogOpen && selectedSchool?.id === school.id} onOpenChange={(open) => {
                            setEditDialogOpen(open);
                            if (open) setSelectedSchool(school);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Override Message Limit</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>School: {school.name}</Label>
                                  <div className="text-sm text-muted-foreground">
                                    Current Plan: {school.plan_type} (Default: {PLAN_DETAILS[school.plan_type as keyof typeof PLAN_DETAILS].whatsappLimit} msgs)
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="limit">Custom Message Limit</Label>
                                  <Input
                                    id="limit"
                                    type="number"
                                    placeholder="Enter custom limit"
                                    value={customLimit}
                                    onChange={(e) => setCustomLimit(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleLimitOverride}>
                                  Save Override
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Pending Upgrade Requests</CardTitle>
              <CardDescription>Review and approve plan upgrade requests from schools</CardDescription>
            </CardHeader>
            <CardContent>
              {planRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending upgrade requests
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Requested Plan</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.school?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPlanBadgeColor(request.requested_plan)}>
                            {request.requested_plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.requested_at), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRequestAction(request.id, "Approved", request.school_id, request.requested_plan)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRequestAction(request.id, "Rejected", request.school_id, request.requested_plan)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Usage Overview</CardTitle>
              <CardDescription>Monitor WhatsApp message usage across schools</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Messages Sent</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools
                    .filter((s) => s.plan_type !== "BASIC")
                    .map((school) => {
                      const usage = getSchoolUsage(school.id);
                      const sent = usage?.messages_sent || 0;
                      const limit = usage?.message_limit || PLAN_DETAILS[school.plan_type as keyof typeof PLAN_DETAILS].whatsappLimit;
                      const percent = limit > 0 ? (sent / limit) * 100 : 0;
                      const isNearLimit = percent >= 80;
                      const isOverLimit = percent >= 100;

                      return (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell>
                            <Badge className={getPlanBadgeColor(school.plan_type)}>
                              {school.plan_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{sent.toLocaleString()}</TableCell>
                          <TableCell>{limit.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="w-32 space-y-1">
                              <Progress 
                                value={Math.min(percent, 100)} 
                                className={`h-2 ${isOverLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
                              />
                              <div className="text-xs text-muted-foreground">{percent.toFixed(1)}%</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isOverLimit ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Limit Reached
                              </Badge>
                            ) : isNearLimit ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Near Limit
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
