import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  MessageSquare, 
  Wifi, 
  Send, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  LogOut,
  ChevronDown,
  ChevronUp,
  KeyRound
} from "lucide-react";

interface SessionStatusData {
  id?: string;
  name?: string;
  status: "disconnected" | "starting" | "qr_ready" | "ready" | "connected" | "authenticated" | "failed" | "unknown";
  phone?: string | null;
  pushName?: string | null;
  connectedAt?: string | null;
}

export const WhatsAppSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Connection & QR States
  const [sessionData, setSessionData] = useState<SessionStatusData>({ status: "unknown" });
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [gettingPairingCode, setGettingPairingCode] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [settings, setSettings] = useState({
    server_url: "https://eden-donations-create-engagement.trycloudflare.com",
    api_key: "owa_k1_322c97c576644741ef2f38ffef81d63d969ceebaf9a4336ede757b2f0a165116",
    session_id: "schools",
    active_status: true,
  });

  useEffect(() => {
    fetchSchoolAndSettings();
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const fetchSchoolAndSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("school_id, schools:school_id(name)")
        .eq("user_id", user.id)
        .single();

      if (roleData?.school_id) {
        setSchoolId(roleData.school_id);
        const schoolObj: any = roleData.schools;
        const currentSchoolName = schoolObj?.name || "School";
        setSchoolName(currentSchoolName);

        const { data: settingsData } = await supabase
          .from("whatsapp_settings")
          .select("*")
          .eq("school_id", roleData.school_id)
          .maybeSingle();

        const activeServer = settingsData?.server_url || "https://eden-donations-create-engagement.trycloudflare.com";
        const activeKey = settingsData?.api_key || "owa_k1_322c97c576644741ef2f38ffef81d63d969ceebaf9a4336ede757b2f0a165116";
        const activeSession = settingsData?.session_id || "schools";

        setSettings({
          server_url: activeServer,
          api_key: activeKey,
          session_id: activeSession,
          active_status: settingsData?.active_status ?? true,
        });

        // Check OpenWA session status
        await checkSessionStatus(activeServer, activeKey, activeSession);
      }
    } catch (error) {
      console.error("Error fetching school and settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check OpenWA session status
  const checkSessionStatus = async (
    serverUrl = settings.server_url,
    apiKey = settings.api_key,
    sessionName = settings.session_id
  ) => {
    if (!serverUrl || !apiKey) return;

    try {
      const cleanUrl = serverUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/sessions`, {
        headers: { "X-API-Key": apiKey },
      });

      if (res.ok) {
        const sessions: any[] = await res.json();
        
        // Find by name, ID, or fallback to the first active/ready session
        let found = sessions.find((s) => s.name === sessionName || s.id === sessionName);
        if (!found && sessions.length > 0) {
          found = sessions.find((s) => s.status === "ready" || s.status === "connected") || sessions[0];
          if (found) {
            setSettings((prev) => ({ ...prev, session_id: found.name || found.id }));
          }
        }

        if (found) {
          const isReady = found.status === "ready" || found.status === "connected" || found.status === "authenticated" || (found.engineLoaded && !!found.phone);

          setSessionData({
            id: found.id,
            name: found.name,
            status: isReady ? "ready" : (found.status || "disconnected"),
            phone: found.phone,
            pushName: found.pushName,
            connectedAt: found.connectedAt,
          });

          if (found.status === "qr_ready") {
            fetchQRCode(cleanUrl, apiKey, found.id);
          } else if (isReady) {
            setQrCodeData(null);
            stopPolling();
          }
        } else {
          setSessionData({ status: "disconnected" });
        }
      }
    } catch (e) {
      console.error("Failed to query OpenWA session:", e);
    }
  };

  // Fetch QR Code for the session
  const fetchQRCode = async (serverUrl: string, apiKey: string, sessionId: string) => {
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/sessions/${sessionId}/qr`, {
        headers: { "X-API-Key": apiKey },
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.qrCode || data.qr || data.data;
        if (raw) {
          setQrCodeData(raw);
        }
      }
    } catch (e) {
      console.error("Failed to fetch QR code:", e);
    }
  };

  // Start WhatsApp Session and poll for QR
  const handleConnect = async () => {
    if (!settings.server_url || !settings.api_key) {
      toast({ title: "Please configure Server URL and API Key first", variant: "destructive" });
      return;
    }

    setConnecting(true);
    setQrCodeData(null);
    setPairingCode(null);

    const cleanUrl = settings.server_url.replace(/\/+$/, "");
    const sessionName = settings.session_id || "schools";

    try {
      // 1. Query existing sessions
      const listRes = await fetch(`${cleanUrl}/api/sessions`, {
        headers: { "X-API-Key": settings.api_key },
      });

      let sessionId: string | null = null;
      let existingSession: any = null;

      if (listRes.ok) {
        const sessions: any[] = await listRes.json();
        existingSession = sessions.find((s) => s.name === sessionName || s.id === sessionName) || (sessions.length > 0 ? sessions[0] : null);
        if (existingSession) {
          sessionId = existingSession.id;
          if (existingSession.status === "ready" || existingSession.status === "connected") {
            setSessionData({
              id: existingSession.id,
              name: existingSession.name,
              status: "ready",
              phone: existingSession.phone,
              pushName: existingSession.pushName,
              connectedAt: existingSession.connectedAt,
            });
            setConnecting(false);
            toast({
              title: "✅ WhatsApp Already Connected!",
              description: `Active on +${existingSession.phone || "School Phone"}`,
            });
            handleSave(false);
            return;
          }
        }
      }

      if (!sessionId) {
        // Create session
        const createRes = await fetch(`${cleanUrl}/api/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": settings.api_key,
          },
          body: JSON.stringify({ name: sessionName }),
        });

        if (createRes.ok) {
          const newSession = await createRes.json();
          sessionId = newSession.id;
        }
      }

      if (!sessionId) {
        throw new Error("Failed to initialize session on OpenWA gateway");
      }

      // 2. Start session (gracefully handle if already started)
      try {
        const startRes = await fetch(`${cleanUrl}/api/sessions/${sessionId}/start`, {
          method: "POST",
          headers: { "X-API-Key": settings.api_key },
        });

        if (!startRes.ok && startRes.status !== 400) {
          const errText = await startRes.text();
          console.warn("Session start response:", startRes.status, errText);
        }
      } catch (startErr) {
        console.warn("Start request exception:", startErr);
      }

      toast({
        title: "Session Initialized",
        description: "Checking WhatsApp connection / generating QR code...",
      });

      // 3. Immediately attempt to fetch QR code
      fetchQRCode(cleanUrl, settings.api_key, sessionId);

      // 4. Start polling for QR and connection status
      stopPolling();
      const targetSessionId = sessionId;

      pollIntervalRef.current = setInterval(async () => {
        try {
          const checkRes = await fetch(`${cleanUrl}/api/sessions/${targetSessionId}`, {
            headers: { "X-API-Key": settings.api_key },
          });

          if (checkRes.ok) {
            const current: any = await checkRes.json();
            const isReady = current.status === "ready" || current.status === "connected" || current.status === "authenticated" || (current.engineLoaded && !!current.phone);

            setSessionData({
              id: current.id,
              name: current.name,
              status: isReady ? "ready" : (current.status || "starting"),
              phone: current.phone,
              pushName: current.pushName,
              connectedAt: current.connectedAt,
            });

            if (isReady) {
              setQrCodeData(null);
              stopPolling();
              setConnecting(false);
              toast({
                title: "✅ WhatsApp Connected Successfully!",
                description: `Linked to +${current.phone || "School Phone"}`,
              });
              handleSave(false);
            } else if (current.status === "qr_ready" || current.status === "starting" || current.status === "created") {
              fetchQRCode(cleanUrl, settings.api_key, targetSessionId);
            }
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 2000);

    } catch (err: any) {
      console.error("Connect error:", err);
      toast({
        title: "Connection Failed",
        description: err.message || "Could not start WhatsApp session",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  // Request 8-digit Pairing Code
  const handleRequestPairingCode = async () => {
    if (!pairingPhone) {
      toast({ title: "Please enter your school phone number", variant: "destructive" });
      return;
    }

    if (!sessionData.id) {
      toast({ title: "Please start the connection first", variant: "destructive" });
      return;
    }

    setGettingPairingCode(true);
    const cleanUrl = settings.server_url.replace(/\/+$/, "");

    try {
      const cleanPhone = pairingPhone.replace(/\D/g, "");
      const res = await fetch(`${cleanUrl}/api/sessions/${sessionData.id}/pairing-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": settings.api_key,
        },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      });

      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode || data.code);
        toast({
          title: "Pairing Code Generated",
          description: "Enter this 8-digit code in WhatsApp on your phone",
        });
      } else {
        const errText = await res.text();
        toast({
          title: "Pairing Code Failed",
          description: errText.slice(0, 100),
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to request pairing code",
        variant: "destructive",
      });
    } finally {
      setGettingPairingCode(false);
    }
  };

  // Log out / Disconnect WhatsApp
  const handleLogout = async () => {
    if (!sessionData.id) return;
    setLoggingOut(true);
    const cleanUrl = settings.server_url.replace(/\/+$/, "");

    try {
      const res = await fetch(`${cleanUrl}/api/sessions/${sessionData.id}/logout`, {
        method: "POST",
        headers: { "X-API-Key": settings.api_key },
      });

      if (res.ok) {
        stopPolling();
        setQrCodeData(null);
        setPairingCode(null);
        setSessionData({ status: "disconnected" });
        toast({ title: "WhatsApp Disconnected" });
      } else {
        toast({ title: "Failed to disconnect session", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Logout Error", description: e.message, variant: "destructive" });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSave = async (showToast = true) => {
    if (!schoolId) {
      if (showToast) toast({ title: "School not found", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_settings")
        .upsert({
          school_id: schoolId,
          api_provider: "OpenWA",
          api_key: settings.api_key,
          server_url: settings.server_url,
          session_id: settings.session_id,
          active_status: settings.active_status,
        });

      if (error) throw error;

      if (showToast) {
        toast({ title: "WhatsApp settings saved successfully" });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      if (showToast) {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) {
      toast({ title: "Please enter a recipient phone number", variant: "destructive" });
      return;
    }

    setSendingTest(true);
    try {
      const cleanUrl = settings.server_url.replace(/\/+$/, "");
      let cleaned = testPhone.replace(/\D/g, "");
      if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
      if (cleaned.length <= 10) cleaned = "91" + cleaned;
      const chatId = cleaned + "@c.us";

      const response = await fetch(
        `${cleanUrl}/api/sessions/${settings.session_id}/messages/send-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": settings.api_key,
          },
          body: JSON.stringify({
            chatId,
            text: `✅ *Test Message*\n\nWhatsApp notifications from *${schoolName}* are active and working!`,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "✅ Test Message Delivered!",
          description: "WhatsApp message was sent successfully.",
        });
      } else {
        const errorBody = await response.text();
        toast({
          title: "❌ Failed to send message",
          description: `Server returned ${response.status}: ${errorBody.slice(0, 100)}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Failed to send",
        description: error.message || "Could not reach OpenWA server",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
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

  const isConnected = sessionData.status === "ready" || sessionData.status === "connected" || sessionData.status === "authenticated";
  const isQrReady = sessionData.status === "qr_ready" || !!qrCodeData;
  const isStarting = (sessionData.status === "starting" || sessionData.status === "initializing" || connecting) && !isConnected;

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection Hub */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-green-600" />
                <CardTitle className="text-xl">School WhatsApp Gateway</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Link your school WhatsApp phone to send automatic attendance alerts, fee reminders, marks, and announcements
              </CardDescription>
            </div>
            <div>
              {isConnected ? (
                <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4" /> Connected & Ready
                </Badge>
              ) : isStarting ? (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200 px-3 py-1 text-sm flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting Engine...
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 px-3 py-1 text-sm flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Disconnected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {isConnected ? (
            /* Connected State Display */
            <div className="rounded-xl border bg-green-50/60 dark:bg-green-950/20 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200 flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    Active School WhatsApp Phone
                  </p>
                  <p className="text-2xl font-bold font-mono text-foreground tracking-wide">
                    {sessionData.phone ? `+${sessionData.phone.replace(/\D/g, "")}` : "Active Gateway Connected"}
                  </p>
                  {sessionData.pushName && (
                    <p className="text-xs text-muted-foreground">
                      Linked Account: <span className="font-medium text-foreground">{sessionData.pushName}</span> (Session: {settings.session_id})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkSessionStatus()}
                    title="Refresh Status"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2"
                  >
                    {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Disconnect Number
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-green-200/60 dark:border-green-800/30 text-xs text-green-800 dark:text-green-300 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                All student absent notices, fee reminders, marks cards, and school announcements will automatically send through this phone number.
              </div>
            </div>
          ) : (
            /* Disconnected / Linking State with QR */
            <div className="space-y-6">
              {!isQrReady && !isStarting ? (
                <div className="rounded-xl border border-dashed p-8 text-center space-y-4 bg-muted/20">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="font-semibold text-base">No WhatsApp Number Connected</h4>
                    <p className="text-sm text-muted-foreground">
                      Click below to generate a QR code and link your school's WhatsApp phone in seconds.
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={handleConnect} 
                    disabled={connecting}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                  >
                    {connecting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <QrCode className="h-5 w-5 mr-2" />}
                    Connect WhatsApp Number
                  </Button>
                </div>
              ) : (
                /* QR Code and Pairing Tabs */
                <Tabs defaultValue="qr" className="space-y-4">
                  <TabsList className="grid grid-cols-2 max-w-xs">
                    <TabsTrigger value="qr" className="flex items-center gap-1.5">
                      <QrCode className="h-4 w-4" /> Scan QR Code
                    </TabsTrigger>
                    <TabsTrigger value="pairing" className="flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4" /> 8-Digit Code
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="qr" className="space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-xl border bg-card">
                      {qrCodeData ? (
                        <div className="p-3 bg-white rounded-lg shadow-sm border flex flex-col items-center">
                          <img
                            src={qrCodeData.startsWith("data:") ? qrCodeData : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeData)}`}
                            alt="WhatsApp Connection QR Code"
                            className="w-[200px] h-[200px]"
                          />
                          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1 font-medium">
                            <RefreshCw className="h-3 w-3 animate-spin text-green-600" /> Listening for scan...
                          </p>
                        </div>
                      ) : (
                        <div className="w-[220px] h-[220px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                          <p className="text-xs text-muted-foreground">Starting WhatsApp engine & generating QR code...</p>
                        </div>
                      )}

                      <div className="space-y-3 flex-1">
                        <h4 className="font-semibold text-base">How to Link with WhatsApp:</h4>
                        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                          <li>Open <strong>WhatsApp</strong> on your school phone</li>
                          <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong> &gt; <strong>Linked Devices</strong></li>
                          <li>Tap <strong>Link a Device</strong></li>
                          <li>Point your camera at this QR code to connect</li>
                        </ol>

                        <div className="pt-2 flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                            <RefreshCw className={`h-4 w-4 mr-1.5 ${connecting ? "animate-spin" : ""}`} /> Refresh QR
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pairing" className="space-y-4">
                    <div className="p-6 rounded-xl border bg-card space-y-4 max-w-md">
                      <div className="space-y-1">
                        <Label htmlFor="pairing_phone">School Phone Number</Label>
                        <Input
                          id="pairing_phone"
                          placeholder="e.g. +91 98765 43210"
                          value={pairingPhone}
                          onChange={(e) => setPairingPhone(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Enter phone number with country code (e.g. +91)</p>
                      </div>

                      <Button onClick={handleRequestPairingCode} disabled={gettingPairingCode || !pairingPhone}>
                        {gettingPairingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Get 8-Digit Pairing Code
                      </Button>

                      {pairingCode && (
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Your Pairing Code</p>
                          <p className="text-3xl font-mono font-bold tracking-widest text-primary">{pairingCode}</p>
                          <p className="text-xs text-muted-foreground pt-1">
                            Open WhatsApp &gt; Linked Devices &gt; Link with phone number instead &gt; Enter this code
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}

          {/* Quick Notification Settings */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Enable Automated Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Allows automated WhatsApp triggers for student attendance, fees, marks, and announcements
              </p>
            </div>
            <Switch
              checked={settings.active_status}
              onCheckedChange={(checked) => {
                setSettings({ ...settings, active_status: checked });
                handleSave(false);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Send Test Message Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Send Test Message</CardTitle>
          </div>
          <CardDescription>
            Test that WhatsApp messages are successfully dispatched to parents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-1">
            <Label htmlFor="test_phone">Recipient Phone Number</Label>
            <Input
              id="test_phone"
              placeholder="+91 98765 43210"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Include country code (e.g. +91)</p>
          </div>
          <Button
            variant="secondary"
            onClick={handleSendTestMessage}
            disabled={sendingTest || !testPhone}
          >
            {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Test Message
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Gateway Settings (Collapsible) */}
      <Card>
        <CardHeader 
          className="cursor-pointer select-none pb-4" 
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Advanced Gateway Settings</CardTitle>
            </div>
            {showAdvanced ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
          <CardDescription>Configure the underlying OpenWA server URL, API key, and session name</CardDescription>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-4 pt-2 border-t">
            <div>
              <Label htmlFor="server_url">OpenWA Server URL</Label>
              <Input
                id="server_url"
                value={settings.server_url}
                onChange={(e) => setSettings({ ...settings, server_url: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="api_key">Gateway API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="session_id">Session Identifier</Label>
              <Input
                id="session_id"
                value={settings.session_id}
                onChange={(e) => setSettings({ ...settings, session_id: e.target.value })}
              />
            </div>

            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Advanced Settings
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};