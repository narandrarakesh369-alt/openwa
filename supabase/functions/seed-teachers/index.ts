import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const teachers = [
  { email: 'rajesh.kumar@littlestars.edu', full_name: 'Rajesh Kumar', first_name: 'Rajesh', last_name: 'Kumar', phone: '9876543210', gender: 'Male', dob: '1985-03-15', qualification: 'M.Ed', specialization: 'Mathematics', designation: 'Senior Teacher', department: 'Science', experience: 12, salary: 55000 },
  { email: 'priya.sharma@littlestars.edu', full_name: 'Priya Sharma', first_name: 'Priya', last_name: 'Sharma', phone: '9876543212', gender: 'Female', dob: '1990-07-22', qualification: 'B.Ed', specialization: 'English', designation: 'Teacher', department: 'Languages', experience: 5, salary: 42000 },
  { email: 'amit.patel@littlestars.edu', full_name: 'Amit Patel', first_name: 'Amit', last_name: 'Patel', phone: '9876543214', gender: 'Male', dob: '1988-11-08', qualification: 'M.Sc, B.Ed', specialization: 'Physics', designation: 'Senior Teacher', department: 'Science', experience: 8, salary: 48000 },
  { email: 'sunita.verma@littlestars.edu', full_name: 'Sunita Verma', first_name: 'Sunita', last_name: 'Verma', phone: '9876543216', gender: 'Female', dob: '1992-04-30', qualification: 'B.Ed', specialization: 'Hindi', designation: 'Teacher', department: 'Languages', experience: 4, salary: 38000 },
  { email: 'vikram.singh@littlestars.edu', full_name: 'Vikram Singh', first_name: 'Vikram', last_name: 'Singh', phone: '9876543218', gender: 'Male', dob: '1983-09-12', qualification: 'M.A, B.Ed', specialization: 'History', designation: 'Head of Department', department: 'Social Studies', experience: 15, salary: 62000 },
  { email: 'neha.gupta@littlestars.edu', full_name: 'Neha Gupta', first_name: 'Neha', last_name: 'Gupta', phone: '9876543220', gender: 'Female', dob: '1991-01-25', qualification: 'M.Sc, B.Ed', specialization: 'Chemistry', designation: 'Teacher', department: 'Science', experience: 6, salary: 44000 },
  { email: 'rahul.joshi@littlestars.edu', full_name: 'Rahul Joshi', first_name: 'Rahul', last_name: 'Joshi', phone: '9876543222', gender: 'Male', dob: '1987-06-18', qualification: 'B.P.Ed', specialization: 'Physical Education', designation: 'Sports Coach', department: 'Physical Education', experience: 10, salary: 40000 },
  { email: 'anjali.reddy@littlestars.edu', full_name: 'Anjali Reddy', first_name: 'Anjali', last_name: 'Reddy', phone: '9876543224', gender: 'Female', dob: '1989-12-03', qualification: 'M.Sc, B.Ed', specialization: 'Biology', designation: 'Senior Teacher', department: 'Science', experience: 9, salary: 50000 },
  { email: 'sanjay.mehta@littlestars.edu', full_name: 'Sanjay Mehta', first_name: 'Sanjay', last_name: 'Mehta', phone: '9876543226', gender: 'Male', dob: '1986-02-28', qualification: 'M.Com, B.Ed', specialization: 'Commerce', designation: 'Teacher', department: 'Commerce', experience: 11, salary: 46000 },
  { email: 'kavita.nair@littlestars.edu', full_name: 'Kavita Nair', first_name: 'Kavita', last_name: 'Nair', phone: '9876543228', gender: 'Female', dob: '1993-08-14', qualification: 'B.Ed', specialization: 'Art', designation: 'Teacher', department: 'Arts', experience: 3, salary: 35000 },
  { email: 'deepak.yadav@littlestars.edu', full_name: 'Deepak Yadav', first_name: 'Deepak', last_name: 'Yadav', phone: '9876543230', gender: 'Male', dob: '1984-05-20', qualification: 'MCA, B.Ed', specialization: 'Computer Science', designation: 'Senior Teacher', department: 'Technology', experience: 14, salary: 58000 },
  { email: 'meera.iyer@littlestars.edu', full_name: 'Meera Iyer', first_name: 'Meera', last_name: 'Iyer', phone: '9876543232', gender: 'Female', dob: '1994-10-07', qualification: 'B.A, B.Ed', specialization: 'Music', designation: 'Teacher', department: 'Arts', experience: 2, salary: 32000 },
]

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify request has proper API key (allows anon key)
  const authHeader = req.headers.get('authorization')
  const apiKey = req.headers.get('apikey')
  
  if (!authHeader && !apiKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { school_id } = await req.json()
    
    if (!school_id) {
      return new Response(
        JSON.stringify({ error: 'school_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const results = []
    let employeeCounter = 1

    for (const teacher of teachers) {
      try {
        // Create user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: teacher.email,
          password: 'Teacher@123',
          email_confirm: true,
          user_metadata: { full_name: teacher.full_name }
        })

        if (authError) {
          results.push({ email: teacher.email, success: false, error: authError.message })
          continue
        }

        // Assign role
        await supabaseAdmin.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'teacher',
          school_id: school_id
        })

        // Update profile
        await supabaseAdmin.from('profiles').update({
          email: teacher.email,
          phone: teacher.phone,
          school_id: school_id
        }).eq('id', authData.user.id)

        // Insert teacher record
        const { error: teacherError } = await supabaseAdmin.from('teachers').insert({
          user_id: authData.user.id,
          school_id: school_id,
          employee_id: `EMP${String(employeeCounter).padStart(3, '0')}`,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          gender: teacher.gender,
          date_of_birth: teacher.dob,
          phone: teacher.phone,
          address: '123 School Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          emergency_contact: '9999999999',
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          designation: teacher.designation,
          department: teacher.department,
          experience_years: teacher.experience,
          salary: teacher.salary,
          status: 'active'
        })

        if (teacherError) {
          results.push({ email: teacher.email, success: false, error: teacherError.message })
        } else {
          results.push({ email: teacher.email, success: true, user_id: authData.user.id })
          employeeCounter++
        }
      } catch (err: any) {
        results.push({ email: teacher.email, success: false, error: err.message })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
