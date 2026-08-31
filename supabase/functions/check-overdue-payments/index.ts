import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for overdue parent payments...');

    // Get all overdue payments (due_date < today AND status != 'Paid')
    const today = new Date().toISOString().split('T')[0];
    const { data: overduePayments, error: paymentsError } = await supabaseClient
      .from('parent_payments')
      .select('id, parent_id, status, due_date, amount')
      .lt('due_date', today)
      .neq('status', 'Paid');

    if (paymentsError) {
      console.error('Error fetching overdue payments:', paymentsError);
      throw paymentsError;
    }

    console.log(`Found ${overduePayments?.length || 0} overdue payments`);

    if (!overduePayments || overduePayments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No overdue payments found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Update payment status to Overdue
    const paymentIds = overduePayments.map(p => p.id);
    await supabaseClient
      .from('parent_payments')
      .update({ status: 'Overdue' })
      .in('id', paymentIds);

    // Get unique parent IDs and their associated students
    const parentIds = [...new Set(overduePayments.map(p => p.parent_id))];
    
    const accountsToFreeze: string[] = [];

    for (const parentId of parentIds) {
      // Freeze parent account
      accountsToFreeze.push(parentId);

      // Get all students linked to this parent
      const { data: studentLinks } = await supabaseClient
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', parentId);

      if (studentLinks) {
        accountsToFreeze.push(...studentLinks.map(s => s.student_id));
      }
    }

    // Update profile status to Frozen for all affected accounts
    if (accountsToFreeze.length > 0) {
      const { error: freezeError } = await supabaseClient
        .from('profiles')
        .update({ account_status: 'Frozen' })
        .in('id', accountsToFreeze);

      if (freezeError) {
        console.error('Error freezing accounts:', freezeError);
      } else {
        console.log(`Froze ${accountsToFreeze.length} accounts`);
      }
    }

    // Send notification to Super Admin
    const { data: superAdmins } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (superAdmins && superAdmins.length > 0) {
      const notifications = superAdmins.map(admin => ({
        sender_id: parentIds[0], // Use first parent as sender
        receiver_id: admin.user_id,
        message_text: `SYSTEM ALERT: ${overduePayments.length} overdue payments detected. ${accountsToFreeze.length} accounts have been frozen.`,
        read_status: false,
      }));

      await supabaseClient
        .from('messages')
        .insert(notifications);
    }

    return new Response(
      JSON.stringify({
        message: 'Overdue payments processed successfully',
        overduePaymentsCount: overduePayments.length,
        frozenAccountsCount: accountsToFreeze.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in check-overdue-payments function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});