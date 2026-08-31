import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap, Briefcase } from "lucide-react";

const staffSchema = z.object({
  staffType: z.enum(["teacher", "other_staff"]),
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  bloodGroup: z.string().optional(),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  qualification: z.string().optional(),
  experienceYears: z.string().optional(),
  specialization: z.string().optional(),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().optional(),
  salary: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

export function StaffRegistration() {
  const [loading, setLoading] = useState(false);
  const [staffType, setStaffType] = useState<"teacher" | "other_staff">("teacher");
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      staffType: "teacher",
    },
  });

  const handleStaffTypeChange = (value: "teacher" | "other_staff") => {
    setStaffType(value);
    setValue("staffType", value);
  };

  const onSubmit = async (data: StaffFormData) => {
    setLoading(true);
    try {
      // Get current user's school
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.school_id) throw new Error("School not found");

      // Create user account using edge function (doesn't affect current session)
      const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          full_name: `${data.firstName} ${data.lastName}`,
          phone: data.phone,
          role: 'teacher',
          school_id: userRole.school_id,
        }
      });

      if (createUserError) throw createUserError;
      if (!createUserData?.user) throw new Error("Failed to create user");

      if (data.staffType === "teacher") {
        // Create teacher record in teachers table
        const { error: teacherError } = await (supabase as any).from("teachers").insert({
          user_id: createUserData.user.id,
          school_id: userRole.school_id,
          employee_id: data.employeeId,
          first_name: data.firstName,
          last_name: data.lastName,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          blood_group: data.bloodGroup || null,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          emergency_contact: data.emergencyContact,
          qualification: data.qualification || "N/A",
          experience_years: data.experienceYears ? parseInt(data.experienceYears) : null,
          specialization: data.specialization || null,
          designation: data.designation,
          department: data.department || null,
          salary: data.salary ? parseFloat(data.salary) : null,
        });

        if (teacherError) throw teacherError;

        toast({
          title: "Teacher registered successfully",
          description: `Login: ${data.email} / ${data.password}`,
        });
      } else {
        // Create staff record in staff table
        const { error: staffError } = await supabase.from("staff").insert({
          user_id: createUserData.user.id,
          school_id: userRole.school_id,
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          designation: data.designation,
          join_date: new Date().toISOString().split('T')[0],
          salary_base: data.salary ? parseFloat(data.salary) : 0,
          allowances: 0,
          deductions: 0,
        });

        if (staffError) throw staffError;

        toast({
          title: "Staff member registered successfully",
          description: `Login: ${data.email} / ${data.password}`,
        });
      }

      reset();
      setStaffType("teacher");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Registration</CardTitle>
        <CardDescription>Register new teacher or staff member and create login credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Staff Type Selector */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Employee Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => handleStaffTypeChange("teacher")}
                className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${
                  staffType === "teacher"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${staffType === "teacher" ? "bg-primary/10" : "bg-muted"}`}>
                  <GraduationCap className={`h-6 w-6 ${staffType === "teacher" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold">Teacher</p>
                  <p className="text-xs text-muted-foreground">Teaching staff with class assignments</p>
                </div>
              </div>
              <div
                onClick={() => handleStaffTypeChange("other_staff")}
                className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${
                  staffType === "other_staff"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${staffType === "other_staff" ? "bg-primary/10" : "bg-muted"}`}>
                  <Briefcase className={`h-6 w-6 ${staffType === "other_staff" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold">Other Staff</p>
                  <p className="text-xs text-muted-foreground">Non-teaching staff (accountant, clerk, etc.)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input id="employeeId" {...register("employeeId")} />
                {errors.employeeId && <p className="text-destructive text-sm">{errors.employeeId.message}</p>}
              </div>

              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && <p className="text-destructive text-sm">{errors.firstName.message}</p>}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && <p className="text-destructive text-sm">{errors.lastName.message}</p>}
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                {errors.dateOfBirth && <p className="text-destructive text-sm">{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select onValueChange={(value) => setValue("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-destructive text-sm">{errors.gender.message}</p>}
              </div>

              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Input id="bloodGroup" {...register("bloodGroup")} placeholder="e.g., A+" />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" {...register("phone")} />
                {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact *</Label>
                <Input id="emergencyContact" {...register("emergencyContact")} />
                {errors.emergencyContact && <p className="text-destructive text-sm">{errors.emergencyContact.message}</p>}
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Login Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email (Username) *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" {...register("address")} />
                {errors.address && <p className="text-destructive text-sm">{errors.address.message}</p>}
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" {...register("city")} />
                {errors.city && <p className="text-destructive text-sm">{errors.city.message}</p>}
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
                <Input id="state" {...register("state")} />
                {errors.state && <p className="text-destructive text-sm">{errors.state.message}</p>}
              </div>

              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input id="pincode" {...register("pincode")} />
                {errors.pincode && <p className="text-destructive text-sm">{errors.pincode.message}</p>}
              </div>
            </div>
          </div>

          {/* Professional Information - Show different fields based on type */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {staffType === "teacher" ? "Teaching Information" : "Job Information"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="designation">Designation *</Label>
                <Input 
                  id="designation" 
                  {...register("designation")} 
                  placeholder={staffType === "teacher" ? "e.g., Senior Teacher, HOD" : "e.g., Accountant, Admin"} 
                />
                {errors.designation && <p className="text-destructive text-sm">{errors.designation.message}</p>}
              </div>

              {staffType === "teacher" && (
                <>
                  <div>
                    <Label htmlFor="qualification">Qualification *</Label>
                    <Input id="qualification" {...register("qualification")} placeholder="e.g., B.Ed, M.Ed" />
                  </div>

                  <div>
                    <Label htmlFor="experienceYears">Experience (Years)</Label>
                    <Input id="experienceYears" type="number" {...register("experienceYears")} />
                  </div>

                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input id="specialization" {...register("specialization")} placeholder="e.g., Mathematics, Science" />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" {...register("department")} />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="salary">Salary (₹)</Label>
                <Input id="salary" type="number" {...register("salary")} />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {staffType === "teacher" ? "Register Teacher" : "Register Staff Member"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}