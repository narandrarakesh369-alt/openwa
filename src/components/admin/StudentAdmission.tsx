import { useState, useEffect, useRef } from "react";
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
import { Loader2, Camera, Upload, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const studentSchema = z.object({
  admissionNumber: z.string().min(1, "Admission number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  bloodGroup: z.string().optional(),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  fatherName: z.string().min(1, "Father's name is required"),
  fatherPhone: z.string().min(1, "Father's phone is required"),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  motherOccupation: z.string().optional(),
  previousSchool: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
});

type StudentFormData = z.infer<typeof studentSchema>;

export const StudentAdmission = () => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData) return;

    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", roleData.school_id)
      .order("name");

    setClasses(data || []);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Photo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;
    
    setUploadingPhoto(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `${userId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Photo upload error:", error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!userRole?.school_id) throw new Error("School not found");

      // Create user account using edge function (doesn't affect current session)
      const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          full_name: `${data.firstName} ${data.lastName}`,
          phone: data.phone,
          role: 'student',
          school_id: userRole.school_id
        }
      });

      if (createUserError) throw createUserError;
      if (!createUserData?.user) throw new Error("Failed to create user");

      const newUserId = createUserData.user.id;

      // Upload photo if provided
      const photoUrl = await uploadPhoto(newUserId);

      // Create student record in students table
      const { error: studentError } = await (supabase as any).from("students").insert({
        user_id: newUserId,
        school_id: userRole.school_id,
        admission_number: data.admissionNumber,
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        blood_group: data.bloodGroup,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        emergency_contact: data.emergencyContact,
        father_name: data.fatherName,
        father_phone: data.fatherPhone,
        father_occupation: data.fatherOccupation,
        mother_name: data.motherName,
        mother_phone: data.motherPhone,
        mother_occupation: data.motherOccupation,
        previous_school: data.previousSchool,
        photo_url: photoUrl,
      });

      if (studentError) throw studentError;

      // Enroll student in class (enrollments table for records)
      const { error: enrollmentError } = await (supabase as any).from("enrollments").insert({
        student_id: newUserId,
        class_id: data.classId,
        school_id: userRole.school_id,
        academic_year: new Date().getFullYear().toString(),
      });

      if (enrollmentError) throw enrollmentError;

      // Also insert into class_students (this is what teachers/attendance/homework reads)
      const { error: classStudentError } = await supabase.from("class_students").insert({
        student_id: newUserId,
        class_id: data.classId,
      });

      if (classStudentError) {
        console.error("class_students insert error:", classStudentError);
        // Don't throw - enrollment already succeeded, this is supplementary
      }

      toast({
        title: "Student admitted successfully",
        description: `Login credentials: ${data.email} / ${data.password}`,
      });

      reset();
      removePhoto();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Admission</CardTitle>
        <CardDescription>Register new student and create login credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Student Photo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Student Photo</h3>
            <div className="flex items-center gap-6">
              <Avatar className="h-32 w-32 border-2 border-dashed border-muted-foreground/50">
                <AvatarImage src={photoPreview || undefined} alt="Student photo" />
                <AvatarFallback className="bg-muted">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {photoPreview ? "Change Photo" : "Upload Photo"}
                </Button>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePhoto}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG</p>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admissionNumber">Admission Number *</Label>
                <Input id="admissionNumber" {...register("admissionNumber")} />
                {errors.admissionNumber && <p className="text-destructive text-sm">{errors.admissionNumber.message}</p>}
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

          {/* Father Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Father / Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input id="fatherName" {...register("fatherName")} />
                {errors.fatherName && <p className="text-destructive text-sm">{errors.fatherName.message}</p>}
              </div>

              <div>
                <Label htmlFor="fatherPhone">Father's Phone *</Label>
                <Input id="fatherPhone" {...register("fatherPhone")} />
                {errors.fatherPhone && <p className="text-destructive text-sm">{errors.fatherPhone.message}</p>}
              </div>

              <div>
                <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                <Input id="fatherOccupation" {...register("fatherOccupation")} />
              </div>
            </div>
          </div>

          {/* Mother Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Mother Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input id="motherName" {...register("motherName")} />
              </div>

              <div>
                <Label htmlFor="motherPhone">Mother's Phone</Label>
                <Input id="motherPhone" {...register("motherPhone")} />
              </div>

              <div>
                <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                <Input id="motherOccupation" {...register("motherOccupation")} />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="classId">Class *</Label>
                <Select onValueChange={(value) => setValue("classId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.classId && <p className="text-destructive text-sm">{errors.classId.message}</p>}
              </div>

              <div>
                <Label htmlFor="previousSchool">Previous School</Label>
                <Input id="previousSchool" {...register("previousSchool")} />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register Student
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};