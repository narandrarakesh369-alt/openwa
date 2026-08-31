-- Add late/half-day status and absence reason to attendance_details
ALTER TABLE public.attendance_details 
ADD COLUMN IF NOT EXISTS absence_reason TEXT;

-- Update status constraint to include late and half_day
-- First drop existing check if any, then we'll handle via application logic

-- Create teacher leave management table
CREATE TABLE public.teacher_leaves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teacher_leaves
ALTER TABLE public.teacher_leaves ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_leaves
CREATE POLICY "Teachers can view their own leaves"
ON public.teacher_leaves FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can create their own leaves"
ON public.teacher_leaves FOR INSERT
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their pending leaves"
ON public.teacher_leaves FOR UPDATE
USING (teacher_id = auth.uid() AND status = 'pending');

CREATE POLICY "School admins can manage all leaves"
ON public.teacher_leaves FOR ALL
USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

-- Add installment and discount fields to fee_payments
ALTER TABLE public.fee_payments 
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason TEXT,
ADD COLUMN IF NOT EXISTS fine_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fine_reason TEXT;

-- Create certificates_issued table for TC and Bonafide
CREATE TABLE public.official_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('transfer_certificate', 'bonafide', 'character_certificate', 'study_certificate')),
  document_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID NOT NULL,
  reason TEXT,
  leaving_date DATE,
  conduct TEXT,
  remarks TEXT,
  document_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on official_documents
ALTER TABLE public.official_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for official_documents
CREATE POLICY "Students can view their documents"
ON public.official_documents FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's documents"
ON public.official_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM parent_students
  WHERE parent_students.parent_id = auth.uid()
  AND parent_students.student_id = official_documents.student_id
));

CREATE POLICY "School admins can manage documents"
ON public.official_documents FOR ALL
USING (has_role(auth.uid(), 'school_admin') AND school_id = get_user_school_id(auth.uid()));

-- Create sequence for document numbers
CREATE SEQUENCE IF NOT EXISTS tc_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS bonafide_number_seq START 1;