import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Find schools deleted more than 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: schoolsToDelete, error: fetchError } = await supabaseAdmin
      .from('schools')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo.toISOString())

    if (fetchError) throw fetchError

    let deletedCount = 0

    // For each school, delete users then delete the school
    if (schoolsToDelete && schoolsToDelete.length > 0) {
      for (const school of schoolsToDelete) {
        // Get all users for this school
        const { data: userRoles } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('school_id', school.id)

        // Delete auth users
        if (userRoles && userRoles.length > 0) {
          for (const { user_id } of userRoles) {
            await supabaseAdmin.auth.admin.deleteUser(user_id)
          }
        }

        // Delete the school (cascade will handle related data)
        const { error: deleteError } = await supabaseAdmin
          .from('schools')
          .delete()
          .eq('id', school.id)

        if (!deleteError) {
          deletedCount++
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_schools: deletedCount,
        message: `Cleaned up ${deletedCount} schools deleted more than 30 days ago`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
