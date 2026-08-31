-- Create class enrollments table
CREATE TABLE public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  marks_obtained INTEGER,
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- Create grades table
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  marks_obtained INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  grade TEXT,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timetable table
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fees table
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  fee_type TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parent-student relationships
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_students
CREATE POLICY "School admins can manage enrollments" ON public.class_students
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    EXISTS (SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.school_id = get_user_school_id(auth.uid()))
  );

CREATE POLICY "Teachers can view their class enrollments" ON public.class_students
  FOR SELECT USING (
    has_role(auth.uid(), 'teacher'::user_role) AND
    EXISTS (SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid())
  );

CREATE POLICY "Students can view their enrollments" ON public.class_students
  FOR SELECT USING (student_id = auth.uid());

-- RLS Policies for assignments
CREATE POLICY "Teachers can manage assignments" ON public.assignments
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view assignments for their classes" ON public.assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_students WHERE class_students.class_id = assignments.class_id AND class_students.student_id = auth.uid())
  );

CREATE POLICY "School admins can view all assignments" ON public.assignments
  FOR SELECT USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.school_id = get_user_school_id(auth.uid()))
  );

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can manage their submissions" ON public.assignment_submissions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view and grade submissions" ON public.assignment_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM assignments WHERE assignments.id = assignment_submissions.assignment_id AND assignments.teacher_id = auth.uid())
  );

-- RLS Policies for grades
CREATE POLICY "Teachers can insert grades" ON public.grades
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'teacher'::user_role)
  );

CREATE POLICY "Teachers can view grades for their subjects" ON public.grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = grades.class_id 
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own grades" ON public.grades
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's grades" ON public.grades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students WHERE parent_students.parent_id = auth.uid() AND parent_students.student_id = grades.student_id)
  );

CREATE POLICY "School admins can manage grades" ON public.grades
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.school_id = get_user_school_id(auth.uid()))
  );

-- RLS Policies for timetable
CREATE POLICY "School admins can manage timetable" ON public.timetable
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    EXISTS (SELECT 1 FROM classes WHERE classes.id = timetable.class_id AND classes.school_id = get_user_school_id(auth.uid()))
  );

CREATE POLICY "Teachers can view their timetable" ON public.timetable
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their class timetable" ON public.timetable
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_students WHERE class_students.class_id = timetable.class_id AND class_students.student_id = auth.uid())
  );

-- RLS Policies for fees
CREATE POLICY "School admins can manage fees" ON public.fees
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "Students can view their fees" ON public.fees
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's fees" ON public.fees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students WHERE parent_students.parent_id = auth.uid() AND parent_students.student_id = fees.student_id)
  );

-- RLS Policies for parent_students
CREATE POLICY "School admins can manage parent-student relationships" ON public.parent_students
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::user_role)
  );

CREATE POLICY "Parents can view their children" ON public.parent_students
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Students can view their parents" ON public.parent_students
  FOR SELECT USING (student_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();