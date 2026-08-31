-- Fix schools table RLS policies to allow super_admin to update

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins can update schools" ON schools;
DROP POLICY IF EXISTS "Super admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Super admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Super admins can delete schools" ON schools;

-- Create comprehensive super_admin policies for schools table
CREATE POLICY "Super admins can view all schools"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update schools"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete schools"
  ON schools
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );