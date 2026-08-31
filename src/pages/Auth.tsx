import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
    fetchSchoolLogo();
  }, [navigate]);

  const fetchSchoolLogo = async (userId?: string) => {
    try {
      if (!userId) {
        setSchoolLogo("/logo.png");
        return;
      }

      // Get user's school from their profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", userId)
        .single();

      if (profile?.school_id) {
        // Fetch the school's logo
        const { data: school } = await supabase
          .from("schools")
          .select("logo_url, tagline")
          .eq("id", profile.school_id)
          .single();

        if (school?.logo_url) {
          setSchoolLogo(school.logo_url);
        }
      }
    } catch (error) {
      // Using default logo
      setSchoolLogo("/logo.png");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Check if user's school is active (not frozen)
      if (authData.user) {
        // Update logo to user's school logo
        await fetchSchoolLogo(authData.user.id);

        // Get user's profile to find their school
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", authData.user.id)
          .single();

        // Check if user is super_admin (they can always login)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id)
          .eq("role", "super_admin")
          .single();

        const isSuperAdmin = !!roleData;

        // If not super admin and has a school, check if school is active
        if (!isSuperAdmin && profile?.school_id) {
          const { data: school } = await supabase
            .from("schools")
            .select("is_active, name")
            .eq("id", profile.school_id)
            .single();

          if (school && !school.is_active) {
            // Sign out the user immediately
            await supabase.auth.signOut();
            
            toast({
              title: "Account Frozen",
              description: `${school.name} has been frozen by the administrator. Please contact support for assistance.`,
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }
      }

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #141831 0%, #1a2040 50%, #0f1428 100%)' }}>
      <Card className="w-full max-w-md shadow-2xl border-0" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-2">
            <img 
              src={schoolLogo || "/logo.png"} 
              alt="ArchEdu Logo" 
              className="w-28 h-28 object-contain"
            />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span style={{ color: '#FFFFFF' }}>Arch</span>
            <span style={{ color: '#33CCFF' }}>Edu</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email" style={{ color: 'rgba(255,255,255,0.8)' }}>Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-[#33CCFF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password" style={{ color: 'rgba(255,255,255,0.8)' }}>Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-[#33CCFF]"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 font-semibold text-white border-0"
              style={{ background: 'linear-gradient(135deg, #33CCFF 0%, #1a9fd4 100%)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <p className="text-xs text-center mt-6 px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            New students and staff are registered by school administrators. Please contact your school admin if you need an account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
