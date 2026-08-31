import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Calendar, User, MessageSquare, Loader2 } from "lucide-react";

const Announcements = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target_audience: "all",
    announcement_type: "general",
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", session.user.id)
      .single();

    if (roleData) {
      setUserRole(roleData.role);
      setSchoolId(roleData.school_id);
      fetchAnnouncements();
      if (roleData.role === "school_admin" || roleData.role === "teacher") {
        fetchClasses();
      }
    }

    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles:created_by (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching announcements",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAnnouncements(data || []);
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("name");

    if (data) {
      setClasses(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);

    try {
      const { data: insertedData, error } = await supabase
        .from("announcements")
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error creating announcement",
          description: error.message,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // If WhatsApp broadcast is enabled, send notifications to school parents
      let waMessage = "";
      if (sendWhatsApp && schoolId) {
        try {
          const { data: waResponse, error: waError } = await supabase.functions.invoke("announcement-notification", {
            body: {
              announcementId: insertedData?.id,
              title: formData.title,
              message: formData.message,
              announcementType: formData.announcement_type,
              targetAudience: formData.target_audience,
              schoolId: schoolId,
            },
          });

          if (waError) {
            console.error("WhatsApp broadcast error:", waError);
            waMessage = " (WhatsApp notification failed to send)";
          } else if (waResponse?.whatsappSent > 0) {
            waMessage = ` (Sent to ${waResponse.whatsappSent} parents via WhatsApp)`;
          }
        } catch (waErr) {
          console.error("WhatsApp invocation failed:", waErr);
        }
      }

      toast({
        title: "Announcement Created Successfully",
        description: `Announcement posted.${waMessage}`,
      });

      setDialogOpen(false);
      setFormData({
        title: "",
        message: "",
        target_audience: "all",
        announcement_type: "general",
      });
      fetchAnnouncements();
    } catch (err: any) {
      toast({
        title: "Failed to create announcement",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAnnouncements = announcements.filter(
    (a) => filterType === "all" || a.announcement_type === filterType
  );

  const getAudienceBadge = (audience: string) => {
    if (audience === "all") return <Badge>Whole School</Badge>;
    if (audience.startsWith("role:")) return <Badge variant="secondary">{audience.split(":")[1]}</Badge>;
    if (audience.startsWith("class:")) {
      const classInfo = classes.find((c) => c.id === audience.split(":")[1]);
      return <Badge variant="outline">{classInfo ? `${classInfo.name} ${classInfo.section || ""}` : "Class"}</Badge>;
    }
    return <Badge>{audience}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: any = {
      general: "default",
      exam: "destructive",
      holiday: "secondary",
      event: "outline",
    };
    return <Badge variant={variants[type] || "default"}>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canCreateAnnouncement = userRole === "school_admin" || userRole === "teacher";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar userRole={userRole} />
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Megaphone className="h-8 w-8 text-primary" />
                Announcements
              </h1>
              <p className="text-muted-foreground">View and broadcast announcements to students and parents</p>
            </div>
            {canCreateAnnouncement && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                    <DialogDescription>Post a new announcement to notify students and parents</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                      <Input
                        id="title"
                        placeholder="e.g. Annual Sports Day Schedule"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                      <Textarea
                        id="message"
                        placeholder="Enter the full announcement details..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={formData.announcement_type}
                          onValueChange={(value) => setFormData({ ...formData, announcement_type: value })}
                        >
                          <SelectTrigger id="type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="exam">Exam</SelectItem>
                            <SelectItem value="holiday">Holiday</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="audience">Target Audience</Label>
                        <Select
                          value={formData.target_audience}
                          onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                        >
                          <SelectTrigger id="audience">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {userRole === "school_admin" && <SelectItem value="all">Whole School (All Parents)</SelectItem>}
                            {userRole === "school_admin" && <SelectItem value="role:teacher">All Teachers</SelectItem>}
                            <SelectItem value="role:student">All Students</SelectItem>
                            <SelectItem value="role:parent">All Parents</SelectItem>
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={`class:${c.id}`}>
                                Class {c.name} {c.section || ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* WhatsApp Broadcast Option */}
                    <div className="rounded-lg border p-4 bg-muted/40 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          <Label htmlFor="send-whatsapp" className="font-semibold text-sm cursor-pointer">
                            Broadcast via WhatsApp
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Auto-send this announcement via WhatsApp to parents in your school
                        </p>
                      </div>
                      <Switch
                        id="send-whatsapp"
                        checked={sendWhatsApp}
                        onCheckedChange={setSendWhatsApp}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Announcement
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs value={filterType} onValueChange={setFilterType} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="exam">Exams</TabsTrigger>
              <TabsTrigger value="holiday">Holidays</TabsTrigger>
              <TabsTrigger value="event">Events</TabsTrigger>
            </TabsList>

            <TabsContent value={filterType} className="space-y-4">
              {filteredAnnouncements.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No announcements found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {announcement.title}
                            {getTypeBadge(announcement.announcement_type)}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {announcement.profiles?.full_name || "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </span>
                            {getAudienceBadge(announcement.target_audience)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{announcement.message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Announcements;
