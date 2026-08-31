-- Create exams table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name TEXT NOT NULL,
  exam_type TEXT NOT NULL, -- Midterm, Final, Unit Test
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exam_subjects table
CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  max_marks INTEGER NOT NULL DEFAULT 100,
  exam_date DATE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create marks table
CREATE TABLE IF NOT EXISTS public.marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  marks_obtained INTEGER NOT NULL,
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id, subject_id)
);

-- Create fee_structures table
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL, -- tuition, transport, exam, etc
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhance fee_payments table (rename existing fees table)
ALTER TABLE public.fees RENAME TO fee_payments;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  designation TEXT NOT NULL,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary_base NUMERIC(10,2) NOT NULL,
  allowances NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  account_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create salary_structure table
CREATE TABLE IF NOT EXISTS public.salary_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  base_salary NUMERIC(10,2) NOT NULL,
  hra NUMERIC(10,2) DEFAULT 0,
  da NUMERIC(10,2) DEFAULT 0,
  other_allowances NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create salary_records table
CREATE TABLE IF NOT EXISTS public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  basic_salary NUMERIC(10,2) NOT NULL,
  allowances NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2) NOT NULL,
  payment_date DATE,
  payment_status TEXT DEFAULT 'Pending',
  payment_method TEXT,
  payslip_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, month, year)
);

-- Create school_subscriptions table
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create parent_payments table
CREATE TABLE IF NOT EXISTS public.parent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  expiry_date DATE NOT NULL,
  status TEXT DEFAULT 'Pending',
  transaction_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add account_status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'Active';

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exams
CREATE POLICY "School admins can manage exams" ON public.exams
  FOR ALL USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Teachers can view exams" ON public.exams
  FOR SELECT USING (has_role(auth.uid(), 'teacher') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Students can view their class exams" ON public.exams
  FOR SELECT USING (
    has_role(auth.uid(), 'student') AND 
    EXISTS (SELECT 1 FROM class_students WHERE class_students.student_id = auth.uid() AND class_students.class_id = exams.class_id)
  );

-- RLS Policies for exam_subjects
CREATE POLICY "School admins can manage exam subjects" ON public.exam_subjects
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin') AND 
    EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_subjects.exam_id AND exams.school_id = get_user_school_id(auth.uid()))
  );

CREATE POLICY "Teachers can manage their exam subjects" ON public.exam_subjects
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view exam subjects" ON public.exam_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exams e 
      JOIN class_students cs ON cs.class_id = e.class_id 
      WHERE e.id = exam_subjects.exam_id AND cs.student_id = auth.uid()
    )
  );

-- RLS Policies for marks
CREATE POLICY "School admins can view marks" ON public.marks
  FOR SELECT USING (
    has_role(auth.uid(), 'school_admin') AND 
    EXISTS (SELECT 1 FROM exams WHERE exams.id = marks.exam_id AND exams.school_id = get_user_school_id(auth.uid()))
  );

CREATE POLICY "Teachers can manage marks for their subjects" ON public.marks
  FOR ALL USING (
    has_role(auth.uid(), 'teacher') AND 
    EXISTS (SELECT 1 FROM exam_subjects WHERE exam_subjects.exam_id = marks.exam_id AND exam_subjects.subject_id = marks.subject_id AND exam_subjects.teacher_id = auth.uid())
  );

CREATE POLICY "Students can view their marks" ON public.marks
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's marks" ON public.marks
  FOR SELECT USING (
    has_role(auth.uid(), 'parent') AND 
    EXISTS (SELECT 1 FROM parent_students WHERE parent_students.parent_id = auth.uid() AND parent_students.student_id = marks.student_id)
  );

-- RLS Policies for fee_structures
CREATE POLICY "School admins can manage fee structures" ON public.fee_structures
  FOR ALL USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Users can view fee structures" ON public.fee_structures
  FOR SELECT USING (school_id = get_user_school_id(auth.uid()));

-- RLS Policies for staff
CREATE POLICY "School admins can manage staff" ON public.staff
  FOR ALL USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Staff can view their own record" ON public.staff
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for salary_structure
CREATE POLICY "School admins can manage salary structure" ON public.salary_structure
  FOR ALL USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

-- RLS Policies for salary_records
CREATE POLICY "School admins can manage salary records" ON public.salary_records
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin') AND 
    EXISTS (SELECT 1 FROM staff WHERE staff.id = salary_records.staff_id AND staff.school_id = get_user_school_id(auth.uid()))
  );

CREATE POLICY "Staff can view their salary records" ON public.salary_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = salary_records.staff_id AND staff.user_id = auth.uid())
  );

-- RLS Policies for school_subscriptions
CREATE POLICY "Super admins can manage subscriptions" ON public.school_subscriptions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School admins can view their subscription" ON public.school_subscriptions
  FOR SELECT USING (school_id = get_user_school_id(auth.uid()));

-- RLS Policies for parent_payments
CREATE POLICY "Parents can manage their payments" ON public.parent_payments
  FOR ALL USING (parent_id = auth.uid());

CREATE POLICY "School admins can view parent payments" ON public.parent_payments
  FOR SELECT USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins can view all payments" ON public.parent_payments
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_exams_school_id ON public.exams(school_id);
CREATE INDEX idx_exams_class_id ON public.exams(class_id);
CREATE INDEX idx_exam_subjects_exam_id ON public.exam_subjects(exam_id);
CREATE INDEX idx_marks_exam_id ON public.marks(exam_id);
CREATE INDEX idx_marks_student_id ON public.marks(student_id);
CREATE INDEX idx_staff_school_id ON public.staff(school_id);
CREATE INDEX idx_salary_records_staff_id ON public.salary_records(staff_id);
CREATE INDEX idx_parent_payments_parent_id ON public.parent_payments(parent_id);