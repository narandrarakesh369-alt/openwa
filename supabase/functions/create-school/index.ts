import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation
const validateSchoolInput = (data: any) => {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3 || data.name.trim().length > 200) {
    errors.push('School name must be between 3 and 200 characters');
  }
  
  if (!data.code || typeof data.code !== 'string' || !/^[A-Z0-9]{2,20}$/.test(data.code.trim())) {
    errors.push('School code must be 2-20 uppercase letters/numbers');
  }
  
  if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push('Invalid school email address');
  }
  
  if (data.phone && (typeof data.phone !== 'string' || !/^[\d\s\-\+\(\)]{0,20}$/.test(data.phone))) {
    errors.push('Invalid phone number format');
  }
  
  if (!data.admin_name || typeof data.admin_name !== 'string' || data.admin_name.trim().length < 2 || data.admin_name.trim().length > 100) {
    errors.push('Admin name must be between 2 and 100 characters');
  }
  
  if (!data.admin_email || typeof data.admin_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.admin_email.trim())) {
    errors.push('Invalid admin email address');
  }
  
  if (!data.admin_password || typeof data.admin_password !== 'string' || data.admin_password.length < 6 || data.admin_password.length > 72) {
    errors.push('Admin password must be between 6 and 72 characters');
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
    const validationErrors = validateSchoolInput(inputData);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: validationErrors.join(', ') }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const { name, code, email, phone, address, admin_email, admin_password, admin_name } = inputData

    // Create school admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email.trim(),
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        full_name: admin_name.trim()
      }
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
      throw new Error('Admin user creation failed')
    }

    // Create school
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        email: email.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null
      })
      .select()
      .single()

    if (schoolError) {
      // Cleanup: delete the user if school creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw schoolError
    }

    // Assign school_admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'school_admin',
        school_id: schoolData.id
      })

    if (roleError) {
      // Cleanup: delete the user and school if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id)
      throw roleError
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        school_id: schoolData.id 
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't throw - profile update is not critical
    }

    // Send notification to super admin about new school
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-super-admin-new-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          schoolName: name.trim(),
          schoolCode: code.trim().toUpperCase(),
          schoolEmail: email.trim(),
          adminEmail: admin_email.trim(),
          adminName: admin_name.trim()
        })
      });
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
      // Don't fail the whole operation if notification fails
    }

    return new Response(
      JSON.stringify({ success: true, school: schoolData, user: authData.user }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error creating school:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
