import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Play, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const Schools = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [deletedSchools, setDeletedSchools] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    is_active: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "super_admin") {
      fetchSchools();
    }
  };

  const fetchSchools = async () => {
    // Fetch active schools
    const { data: activeData } = await supabase
      .from("schools")
      .select("*")
      .is("deleted_at", null)
      .order("name");

    // Fetch deleted schools
    const { data: deletedData } = await supabase
      .from("schools")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    setSchools(activeData || []);
    setDeletedSchools(deletedData || []);
  };

  const handleEdit = (school: any) => {
    setSelectedSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      is_active: school.is_active
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedSchool) return;

    const { error } = await supabase
      .from("schools")
      .update({
        name: formData.name,
        code: formData.code,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        is_active: formData.is_active
      })
      .eq("id", selectedSchool.id);

    if (error) {
      toast.error("Failed to update school");
      return;
    }

    toast.success("School updated successfully");
    setEditDialogOpen(false);
    fetchSchools();
  };

  const handleDeleteConfirm = (school: any) => {
    setSelectedSchool(school);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (school: any) => {
    const { error } = await supabase
      .from("schools")
      .update({ is_active: !school.is_active })
      .eq("id", school.id);

    if (error) {
      toast.error("Failed to update school status");
      console.error("Error:", error);
      return;
    }

    toast.success(`School ${!school.is_active ? "activated" : "paused"} successfully`);
    fetchSchools();
  };

  const handleDelete = async () => {
    if (!selectedSchool) return;

    // Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from("schools")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", selectedSchool.id);

    if (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete school");
      return;
    }

    toast.success("School moved to trash. It will be permanently deleted after 30 days.");
    setDeleteDialogOpen(false);
    fetchSchools();
  };

  const handleRestore = async (school: any) => {
    const { error } = await supabase
      .from("schools")
      .update({ deleted_at: null })
      .eq("id", school.id);

    if (error) {
      console.error("Restore error:", error);
      toast.error("Failed to restore school");
      return;
    }

    toast.success("School restored successfully");
    fetchSchools();
  };

  const handlePermanentDelete = async (school: any) => {
    // Call edge function to delete users first
    const { error: userDeleteError } = await supabase.functions.invoke('delete-school-users', {
      body: { school_id: school.id }
    });

    if (userDeleteError) {
      console.error("Error deleting users:", userDeleteError);
      toast.error("Failed to delete school users");
      return;
    }

    // Then permanently delete the school
    const { error } = await supabase
      .from("schools")
      .delete()
      .eq("id", school.id);

    if (error) {
      console.error("Permanent delete error:", error);
      toast.error("Failed to permanently delete school");
      return;
    }

    toast.success("School permanently deleted");
    fetchSchools();
  };

  return (
    <AuthenticatedLayout>
      <div className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Schools</h1>
            <p className="text-muted-foreground mt-2">Manage all schools in the system</p>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList>
              <TabsTrigger value="active">Active Schools</TabsTrigger>
              <TabsTrigger value="deleted">Deleted Schools ({deletedSchools.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle>Active Schools</CardTitle>
                  <CardDescription>List of registered schools</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schools.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{school.code}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{school.email}</div>
                              <div className="text-muted-foreground">{school.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={school.is_active ? "default" : "destructive"}>
                              {school.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(school)}
                                title="Edit School"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(school)}
                                title={school.is_active ? "Pause School" : "Activate School"}
                              >
                                {school.is_active ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteConfirm(school)}
                                title="Delete School"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {schools.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No schools found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deleted">
              <Card>
                <CardHeader>
                  <CardTitle>Deleted Schools</CardTitle>
                  <CardDescription>Schools will be permanently deleted 30 days after deletion</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Deleted Date</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedSchools.map((school) => {
                        const deletedDate = new Date(school.deleted_at);
                        const daysRemaining = 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <TableRow key={school.id}>
                            <TableCell className="font-medium">{school.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{school.code}</Badge>
                            </TableCell>
                            <TableCell>{deletedDate.toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={daysRemaining > 7 ? "secondary" : "destructive"}>
                                {daysRemaining} days
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRestore(school)}
                                  title="Restore School"
                                >
                                  <RotateCcw className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePermanentDelete(school)}
                                  title="Permanently Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {deletedSchools.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No deleted schools
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit School</DialogTitle>
                <DialogDescription>Update school information</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">School Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>Update School</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move School to Trash</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{selectedSchool?.name}"? The school will be moved to trash and can be restored within 30 days. After 30 days, it will be permanently deleted along with all user accounts.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AuthenticatedLayout>
  );
};

export default Schools;
