import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  schoolName: string;
  schoolCode: string;
  schoolEmail: string;
  adminEmail: string;
  adminName: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { schoolName, schoolCode, schoolEmail, adminEmail, adminName }: EmailPayload = await req.json()

    // Send notification to super admin
    const superAdminEmail = 'narandra.rakesh369@gmail.com';
    
    // Here you would integrate with an email service like Resend
    // For now, we'll log the notification
    console.log('New School Created - Notification:', {
      to: superAdminEmail,
      subject: `New School Added: ${schoolName}`,
      body: `
        A new school has been added to the platform:
        
        School Name: ${schoolName}
        School Code: ${schoolCode}
        School Email: ${schoolEmail}
        
        Admin Details:
        Name: ${adminName}
        Email: ${adminEmail}
        
        Created at: ${new Date().toLocaleString()}
      `
    });

    // Store notification in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get super admin user ID
    const { data: superAdminData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', superAdminEmail)
      .single();

    if (superAdminData) {
      await supabase.from('messages').insert({
        sender_id: superAdminData.id,
        receiver_id: superAdminData.id,
        message_text: `New School Added: ${schoolName} (${schoolCode}). Admin: ${adminName} <${adminEmail}>`,
        read_status: false
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error sending notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})