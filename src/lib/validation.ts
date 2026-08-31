import { z } from "zod";

// User validation
export const userSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().trim().regex(/^[\d\s\-\+\(\)]*$/, "Invalid phone number format").max(20, "Phone number too long").optional().or(z.literal("")),
  role: z.enum(["teacher", "student", "parent", "school_admin", "super_admin"], {
    required_error: "Role is required",
  }),
});

// School validation
export const schoolSchema = z.object({
  name: z.string().trim().min(3, "School name must be at least 3 characters").max(200, "School name too long"),
  code: z.string().trim().min(2, "School code must be at least 2 characters").max(20, "School code too long").regex(/^[A-Z0-9]+$/, "School code must contain only uppercase letters and numbers"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().regex(/^[\d\s\-\+\(\)]*$/, "Invalid phone number format").max(20, "Phone number too long").optional().or(z.literal("")),
  address: z.string().trim().max(500, "Address too long").optional().or(z.literal("")),
  admin_email: z.string().trim().email("Invalid admin email address").max(255, "Email must be less than 255 characters"),
  admin_password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  admin_name: z.string().trim().min(2, "Admin name must be at least 2 characters").max(100, "Admin name too long"),
});

// Fee validation
export const feeSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  fee_type: z.string().trim().min(1, "Fee type is required").max(50, "Fee type too long"),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0").refine((val) => parseFloat(val) <= 1000000, "Amount too large"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  academic_year: z.string().trim().regex(/^\d{4}$/, "Academic year must be a 4-digit year").refine((val) => parseInt(val) >= 2000 && parseInt(val) <= 2100, "Invalid academic year"),
});

// Grade validation
export const gradeSchema = z.object({
  class_id: z.string().uuid("Invalid class ID"),
  subject_id: z.string().uuid("Invalid subject ID"),
  student_id: z.string().uuid("Invalid student ID"),
  exam_name: z.string().trim().min(1, "Exam name is required").max(100, "Exam name too long"),
  marks_obtained: z.number().int("Marks must be a whole number").min(0, "Marks cannot be negative"),
  total_marks: z.number().int("Total marks must be a whole number").min(1, "Total marks must be at least 1").max(1000, "Total marks too large"),
  term: z.string().trim().min(1, "Term is required"),
  academic_year: z.string().trim().regex(/^\d{4}$/, "Academic year must be a 4-digit year"),
}).refine((data) => data.marks_obtained <= data.total_marks, {
  message: "Marks obtained cannot exceed total marks",
  path: ["marks_obtained"],
});

// Attendance validation
export const attendanceSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  class_id: z.string().uuid("Invalid class ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  status: z.enum(["present", "absent", "late"], {
    required_error: "Status is required",
  }),
});
