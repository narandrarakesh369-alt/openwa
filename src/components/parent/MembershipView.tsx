import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export const MembershipView = () => {
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (!roleData) return;

    const { data } = await supabase
      .from("schools")
      .select("*")
      .eq("id", roleData.school_id)
      .single();

    setSchool(data);
  };

  const isActive = school?.is_active;
  const expiresAt = school?.membership_expires_at;
  const daysRemaining = expiresAt 
    ? Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Membership</CardTitle>
        <CardDescription>View your school membership status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={isActive ? "default" : "destructive"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">School</span>
            <span className="text-sm">{school?.name}</span>
          </div>
          {expiresAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Expires On</span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          {daysRemaining !== null && daysRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Days Remaining</span>
              <Badge variant="outline">{daysRemaining} days</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
