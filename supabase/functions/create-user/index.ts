import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation
const validateUserInput = (data: any) => {
  const errors: string[] = [];
  
  if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || data.email.length > 255) {
    errors.push('Invalid email address');
  }
  
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6 || data.password.length > 72) {
    errors.push('Password must be between 6 and 72 characters');
  }
  
  if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2 || data.full_name.trim().length > 100) {
    errors.push('Name must be between 2 and 100 characters');
  }
  
  if (data.phone && (typeof data.phone !== 'string' || !/^[\d\s\-\+\(\)]{0,20}$/.test(data.phone))) {
    errors.push('Invalid phone number format');
  }
  
  if (!data.role || !['teacher', 'student', 'parent', 'school_admin'].includes(data.role)) {
    errors.push('Invalid role');
  }
  
  if (!data.school_id || typeof data.school_id !== 'string') {
    errors.push('Invalid school ID');
  }
  
  return errors;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const inputData = await req.json()
    
    // Validate input
    const validationErrors = validateUserInput(inputData);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: validationErrors.join(', ') }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const { email, password, full_name, phone, role, school_id } = inputData

    // Create user using Admin API (doesn't affect current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim()
      }
    })

    if (authError) {
      console.error('Auth error:', authError);
      throw authError
    }

    if (!authData.user) {
      throw new Error('User creation failed')
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role,
        school_id: school_id
      })

    if (roleError) {
      console.error('Role error:', roleError);
      // Cleanup: delete the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw roleError
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        email: email.trim(),
        phone: phone?.trim() || null, 
        school_id: school_id 
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't throw - profile update is not critical
    }

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
