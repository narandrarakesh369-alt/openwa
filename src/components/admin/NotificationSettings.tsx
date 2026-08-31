import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Mail, MessageSquare, Bell, Send, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface NotificationSettings {
  id?: string;
  attendance_notification: boolean;
  fee_reminder: boolean;
  exam_notification: boolean;
  announcement_notification: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  sms_api_key: string;
  sms_sender_id: string;
  email_from_name: string;
  email_from_address: string;
}

interface NotificationLog {
  id: string;
  notification_type: string;
  channel: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export const NotificationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingExamNotif, setSendingExamNotif] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    attendance_notification: true,
    fee_reminder: true,
    exam_notification: true,
    announcement_notification: true,
    sms_enabled: false,
    email_enabled: true,
    sms_api_key: "",
    sms_sender_id: "",
    email_from_name: "",
    email_from_address: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.school_id) {
        setSchoolId(roleData.school_id);
        await Promise.all([
          fetchSettings(roleData.school_id),
          fetchLogs(roleData.school_id),
        ]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async (schoolId: string) => {
    const { data } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (data) {
      setSettings({
        id: data.id,
        attendance_notification: data.attendance_notification ?? true,
        fee_reminder: data.fee_reminder ?? true,
        exam_notification: data.exam_notification ?? true,
        announcement_notification: data.announcement_notification ?? true,
        sms_enabled: data.sms_enabled ?? false,
        email_enabled: data.email_enabled ?? true,
        sms_api_key: data.sms_api_key || "",
        sms_sender_id: data.sms_sender_id || "",
        email_from_name: data.email_from_name || "",
        email_from_address: data.email_from_address || "",
      });
    }
  };

  const fetchLogs = async (schoolId: string) => {
    const { data } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) setLogs(data);
  };

  const handleSave = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const payload = {
        school_id: schoolId,
        attendance_notification: settings.attendance_notification,
        fee_reminder: settings.fee_reminder,
        exam_notification: settings.exam_notification,
        announcement_notification: settings.announcement_notification,
        sms_enabled: settings.sms_enabled,
        email_enabled: settings.email_enabled,
        sms_api_key: settings.sms_api_key || null,
        sms_sender_id: settings.sms_sender_id || null,
        email_from_name: settings.email_from_name || null,
        email_from_address: settings.email_from_address || null,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("notification_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_settings")
          .insert(payload);
        if (error) throw error;
      }

      toast({ title: "Settings saved successfully" });
      fetchSettings(schoolId);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendExamNotifications = async () => {
    if (!schoolId) return;
    setSendingExamNotif(true);
    try {
      const { data, error } = await supabase.functions.invoke('exam-notification', {
        body: { schoolId, daysAhead: 7 }
      });

      if (error) throw error;

      toast({ 
        title: "Exam notifications sent",
        description: `Created ${data.notificationsCreated} notifications for ${data.examsProcessed} exams`
      });
      
      // Refresh logs
      await fetchLogs(schoolId);
    } catch (error) {
      console.error("Error sending exam notifications:", error);
      toast({ title: "Failed to send notifications", variant: "destructive" });
    } finally {
      setSendingExamNotif(false);
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
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Notification Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" /> Notification Types
                </CardTitle>
                <CardDescription>Choose which notifications to send to parents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attendance Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send alerts when student is absent</p>
                  </div>
                  <Switch
                    checked={settings.attendance_notification}
                    onCheckedChange={(v) => setSettings({ ...settings, attendance_notification: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Fee Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send fee due date reminders</p>
                  </div>
                  <Switch
                    checked={settings.fee_reminder}
                    onCheckedChange={(v) => setSettings({ ...settings, fee_reminder: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Exam Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send exam schedules and results</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={sendExamNotifications}
                      disabled={sendingExamNotif}
                    >
                      {sendingExamNotif ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarCheck className="h-4 w-4" />
                      )}
                      <span className="ml-1">Send Now</span>
                    </Button>
                    <Switch
                      checked={settings.exam_notification}
                      onCheckedChange={(v) => setSettings({ ...settings, exam_notification: v })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Announcement Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send school announcements</p>
                  </div>
                  <Switch
                    checked={settings.announcement_notification}
                    onCheckedChange={(v) => setSettings({ ...settings, announcement_notification: v })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Channels
                </CardTitle>
                <CardDescription>Configure notification channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email_enabled}
                    onCheckedChange={(v) => setSettings({ ...settings, email_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.sms_enabled}
                    onCheckedChange={(v) => setSettings({ ...settings, sms_enabled: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {settings.email_enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" /> Email Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>From Name</Label>
                    <Input
                      value={settings.email_from_name}
                      onChange={(e) => setSettings({ ...settings, email_from_name: e.target.value })}
                      placeholder="School Name"
                    />
                  </div>
                  <div>
                    <Label>From Email Address</Label>
                    <Input
                      type="email"
                      value={settings.email_from_address}
                      onChange={(e) => setSettings({ ...settings, email_from_address: e.target.value })}
                      placeholder="noreply@school.com"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {settings.sms_enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> SMS Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>SMS API Key</Label>
                    <Input
                      type="password"
                      value={settings.sms_api_key}
                      onChange={(e) => setSettings({ ...settings, sms_api_key: e.target.value })}
                      placeholder="Enter API key"
                    />
                  </div>
                  <div>
                    <Label>Sender ID</Label>
                    <Input
                      value={settings.sms_sender_id}
                      onChange={(e) => setSettings({ ...settings, sms_sender_id: e.target.value })}
                      placeholder="SCHOOL"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="mt-6">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>View all sent notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="capitalize">{log.notification_type}</TableCell>
                      <TableCell className="capitalize">{log.channel}</TableCell>
                      <TableCell>{log.recipient_email || log.recipient_phone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject || log.message}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.status === "sent" ? "bg-green-100 text-green-800" :
                          log.status === "failed" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {log.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No notifications sent yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
