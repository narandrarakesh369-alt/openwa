import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Lock, Unlock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const SchoolManagementEnhanced = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    admin_email: "",
    admin_password: "",
    admin_name: ""
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase
      .from("schools")
      .select(`
        *,
        school_subscriptions(plan_name, end_date, payment_status)
      `)
      .order("name");
    setSchools(data || []);
  };

  const handleEdit = (school: any) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      admin_email: "",
      admin_password: "",
      admin_name: "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSchool) {
        // Update existing school
        const { error } = await supabase
          .from("schools")
          .update({
            name: formData.name,
            code: formData.code,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
          })
          .eq("id", editingSchool.id);

        if (error) throw error;
        toast.success("School updated successfully");
      } else {
        // Create new school
        const { error } = await supabase.functions.invoke('create-school', {
          body: formData
        });

        if (error) throw error;
        toast.success("School created successfully");
      }

      setOpen(false);
      setEditingSchool(null);
      setFormData({
        name: "",
        code: "",
        email: "",
        phone: "",
        address: "",
        admin_email: "",
        admin_password: "",
        admin_name: ""
      });
      fetchSchools();
    } catch (error: any) {
      toast.error(error.message || "Failed to save school");
    }
  };

  const toggleSchoolStatus = async (schoolId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .update({ is_active: !currentStatus })
        .eq("id", schoolId)
        .select();

      if (error) {
        console.error("Error toggling school status:", error);
        toast.error(`Failed to update school status: ${error.message}`);
        return;
      }

      toast.success(`School ${!currentStatus ? "activated" : "frozen"}`);
      fetchSchools();
    } catch (error: any) {
      console.error("Error in toggleSchoolStatus:", error);
      toast.error(`Failed to update school status: ${error.message}`);
    }
  };

  const deleteSchool = async (schoolId: string) => {
    const { error } = await supabase
      .from("schools")
      .delete()
      .eq("id", schoolId);

    if (error) {
      toast.error("Failed to delete school");
      return;
    }

    toast.success("School deleted successfully");
    fetchSchools();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>School Management</CardTitle>
            <CardDescription>Create, edit, freeze, or delete schools</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditingSchool(null);
              setFormData({
                name: "",
                code: "",
                email: "",
                phone: "",
                address: "",
                admin_email: "",
                admin_password: "",
                admin_name: ""
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
                <DialogDescription className="text-sm">
                  {editingSchool ? "Update school information" : "Fill in the school details and admin credentials"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>School Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>School Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>School Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>School Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  {!editingSchool && (
                    <>
                      <div className="col-span-2 border-t pt-4">
                        <h4 className="font-medium mb-3">Admin Account Details</h4>
                      </div>
                      <div>
                        <Label>Admin Name</Label>
                        <Input
                          value={formData.admin_name}
                          onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                          required={!editingSchool}
                        />
                      </div>
                      <div>
                        <Label>Admin Email</Label>
                        <Input
                          type="email"
                          value={formData.admin_email}
                          onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                          required={!editingSchool}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Admin Password</Label>
                        <Input
                          type="password"
                          value={formData.admin_password}
                          onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                          required={!editingSchool}
                          minLength={8}
                          placeholder="Min 8 characters"
                        />
                      </div>
                    </>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  {editingSchool ? "Update School" : "Create School & Admin"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Subscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">{school.code}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm">
                    <div>{school.email}</div>
                    <div className="text-muted-foreground">{school.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={school.is_active ? "default" : "destructive"}>
                    {school.is_active ? "Active" : "Frozen"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {school.school_subscriptions?.[0] ? (
                    <div className="text-sm">
                      <div>{school.school_subscriptions[0].plan_name}</div>
                      <div className="text-muted-foreground text-xs">
                        Until: {new Date(school.school_subscriptions[0].end_date).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No subscription</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(school)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSchoolStatus(school.id, school.is_active)}
                    >
                      {school.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete School?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {school.name} and all associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSchool(school.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};