-- Drop old attendance tables and create fresh simple structure
DROP TABLE IF EXISTS attendance_audit CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS attendance_summary CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;

-- Simple attendance system tables
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  submitted_by uuid NOT NULL,
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(class_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(attendance_id, student_id)
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "Teachers and admins can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::user_role) OR 
    has_role(auth.uid(), 'school_admin'::user_role)
  );

CREATE POLICY "Teachers and admins can create attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::user_role) OR 
    has_role(auth.uid(), 'school_admin'::user_role)
  );

CREATE POLICY "Admins can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));

-- RLS Policies for attendance_details
CREATE POLICY "Teachers and admins can view attendance details"
  ON attendance_details FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::user_role) OR 
    has_role(auth.uid(), 'school_admin'::user_role)
  );

CREATE POLICY "Teachers and admins can create attendance details"
  ON attendance_details FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::user_role) OR 
    has_role(auth.uid(), 'school_admin'::user_role)
  );

CREATE POLICY "Admins can update attendance details"
  ON attendance_details FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "Admins can delete attendance details"
  ON attendance_details FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));