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
import { Plus, Pause, Trash2, Play } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { schoolSchema } from "@/lib/validation";

export const SchoolManagement = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
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
      .select("*")
      .order("name");
    setSchools(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = schoolSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ');
      toast.error(errors);
      return;
    }

    try {
      // Call edge function to create school and admin via admin API
      const { data, error } = await supabase.functions.invoke('create-school', {
        body: formData
      });

      if (error) {
        toast.error(error.message || "Failed to create school");
        return;
      }

      toast.success("School created successfully");
      setOpen(false);
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
      toast.error(error.message || "Failed to create school");
    }
  };

  const toggleSchoolStatus = async (schoolId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("schools")
      .update({ is_active: !currentStatus })
      .eq("id", schoolId);

    if (error) {
      toast.error("Failed to update school status");
      return;
    }

    toast.success(`School ${!currentStatus ? "activated" : "paused"}`);
    fetchSchools();
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
            <CardDescription>Add and manage schools</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New School</DialogTitle>
                <DialogDescription>Fill in the school details and admin credentials</DialogDescription>
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
                  <div className="col-span-2 border-t pt-4">
                    <h4 className="font-medium mb-3">Admin Account Details</h4>
                  </div>
                  <div>
                    <Label>Admin Name</Label>
                    <Input
                      value={formData.admin_name}
                      onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Admin Email</Label>
                    <Input
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Admin Password</Label>
                    <Input
                      type="password"
                      value={formData.admin_password}
                      onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                      required
                      minLength={8}
                      placeholder="Min 8 characters"
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                </div>
                <Button type="submit" className="w-full">Create School & Admin</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
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
                    {school.is_active ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSchoolStatus(school.id, school.is_active)}
                    >
                      {school.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
      </CardContent>
    </Card>
  );
};
