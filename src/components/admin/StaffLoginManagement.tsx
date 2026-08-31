import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Key, Mail, GraduationCap, Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Teacher {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation: string;
  user_id: string;
  profiles: {
    email: string;
  };
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  designation: string;
  user_id: string | null;
}

export const StaffLoginManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; userId: string; type: "teacher" | "staff" } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("teachers");

  useEffect(() => {
    fetchTeachers();
    fetchStaffMembers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.school_id) return;

      const { data, error } = await (supabase as any)
        .from("teachers")
        .select("*")
        .eq("school_id", userRole.school_id)
        .order("first_name");

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((t: any) => t.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const teachersWithProfiles = data.map((teacher: any) => ({
          ...teacher,
          profiles: profiles?.find(p => p.id === teacher.user_id) || { email: "" }
        }));

        setTeachers(teachersWithProfiles as Teacher[]);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.school_id) return;

      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("school_id", userRole.school_id)
        .order("name");

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to fetch staff members");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResettingPassword(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Use admin API to reset password
      const { error } = await supabase.auth.admin.updateUserById(
        selectedUser.userId,
        { password: newPassword }
      );

      if (error) throw error;

      toast.success(`Password reset successfully for ${selectedUser.name}`);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    return (
      teacher.employee_id.toLowerCase().includes(searchLower) ||
      teacher.first_name.toLowerCase().includes(searchLower) ||
      teacher.last_name.toLowerCase().includes(searchLower) ||
      teacher.designation.toLowerCase().includes(searchLower) ||
      teacher.profiles?.email?.toLowerCase().includes(searchLower)
    );
  });

  const filteredStaff = staffMembers.filter(staff => {
    const searchLower = searchTerm.toLowerCase();
    return (
      staff.name.toLowerCase().includes(searchLower) ||
      staff.email.toLowerCase().includes(searchLower) ||
      staff.designation.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Manage Login Credentials</h2>
              <p className="text-muted-foreground">Reset passwords and manage access for teachers and staff</p>
            </div>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="teachers" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                Teachers ({teachers.length})
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Other Staff ({staffMembers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teachers" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : filteredTeachers.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  {searchTerm ? "No teachers found matching your search." : "No teachers registered yet."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Email (Login)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map(teacher => (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <Badge variant="outline">{teacher.employee_id}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{teacher.first_name} {teacher.last_name}</TableCell>
                        <TableCell>{teacher.designation}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {teacher.profiles?.email || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser({
                              id: teacher.id,
                              name: `${teacher.first_name} ${teacher.last_name}`,
                              userId: teacher.user_id,
                              type: "teacher"
                            })}
                            className="gap-2"
                          >
                            <Key className="h-4 w-4" />
                            Reset Password
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="staff" className="mt-4">
              {filteredStaff.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  {searchTerm ? "No staff members found matching your search." : "No staff members registered yet."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Email (Login)</TableHead>
                      <TableHead>Has Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map(staff => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>{staff.designation}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {staff.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={staff.user_id ? "default" : "secondary"}>
                            {staff.user_id ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {staff.user_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser({
                                id: staff.id,
                                name: staff.name,
                                userId: staff.user_id!,
                                type: "staff"
                              })}
                              className="gap-2"
                            >
                              <Key className="h-4 w-4" />
                              Reset Password
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No login account</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name}
              <Badge variant="outline" className="ml-2">
                {selectedUser?.type === "teacher" ? "Teacher" : "Staff"}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
