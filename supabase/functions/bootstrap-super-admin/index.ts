import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get credentials from request body - never hardcode credentials
    const { email, password } = await req.json()
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

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

    // Check if super admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const superAdminUser = existingUsers.users.find(u => u.email === email);

    let userId: string;

    if (!superAdminUser) {
      // Create super admin user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Super Administrator'
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create super admin user');
      
      userId = authData.user.id;
    } else {
      userId = superAdminUser.id;
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      });
    }

    // Delete any existing role for this user
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Insert super admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'super_admin',
        school_id: null
      });

    if (roleError) throw roleError;

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: 'Super Administrator',
        account_status: 'Active',
        email: email
      })
      .eq('id', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Super admin account created/updated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error bootstrapping super admin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})
