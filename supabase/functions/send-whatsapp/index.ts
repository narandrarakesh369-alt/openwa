import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  phone_number: string;
  message: string;
  message_type: 'Absence' | 'Fee' | 'Notice' | 'Custom';
  school_id: string;
  parent_id?: string;
  student_id?: string;
}

interface SchoolPlan {
  plan_type: string;
  whatsapp_enabled: boolean;
  school_status: string;
}

// Map message types to internal categories for plan checking
const MESSAGE_TYPE_MAP: Record<string, string> = {
  'Absence': 'absent_alert',
  'Fee': 'fee_reminder',
  'Notice': 'announcement',
  'Custom': 'announcement',
};

// Get message limit based on plan type
function getPlanMessageLimit(planType: string): number {
  switch (planType) {
    case 'BASIC': return 0;
    case 'STANDARD': return 1000;
    case 'PREMIUM': return 3000;
    default: return 0;
  }
}

// Check if message type is allowed for the plan
function isMessageTypeAllowed(planType: string, messageType: string): boolean {
  const category = MESSAGE_TYPE_MAP[messageType] || 'announcement';
  
  switch (category) {
    case 'absent_alert':
      return planType === 'STANDARD' || planType === 'PREMIUM';
    case 'fee_reminder':
    case 'announcement':
      return planType === 'PREMIUM';
    default:
      return false;
  }
}

// Convert phone number to WhatsApp chat ID format
// Input: "+919876543210", "919876543210", "09876543210"
// Output: "919876543210@c.us"
function formatPhoneToWAId(phone: string): string {
  // Remove all non-digit characters (+, spaces, dashes, parentheses)
  let cleaned = phone.replace(/\D/g, '');

  // Remove leading zero if present (national format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If the number doesn't look like it has a country code (less than 11 digits),
  // assume Indian country code (91)
  if (cleaned.length <= 10) {
    cleaned = '91' + cleaned;
  }

  return cleaned + '@c.us';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, message, message_type, school_id, parent_id, student_id }: WhatsAppMessage = await req.json();

    console.log('Sending WhatsApp message via OpenWA:', { phone_number, message_type, school_id });

    // Fetch school plan information
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('plan_type, whatsapp_enabled, school_status')
      .eq('id', school_id)
      .single();

    if (schoolError || !school) {
      console.error('School not found:', schoolError);
      return new Response(
        JSON.stringify({ error: 'School not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if school is frozen
    if (school.school_status === 'Frozen') {
      console.log('School is frozen, WhatsApp blocked');
      await logMessage(supabase, school_id, parent_id, student_id, message_type, message, phone_number, 'Blocked', null, 'School is frozen');
      return new Response(
        JSON.stringify({ error: 'School access is frozen' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if WhatsApp is enabled for this school
    if (!school.whatsapp_enabled) {
      console.log('WhatsApp is disabled for this school');
      await logMessage(supabase, school_id, parent_id, student_id, message_type, message, phone_number, 'Blocked', null, 'WhatsApp disabled');
      return new Response(
        JSON.stringify({ error: 'WhatsApp is not enabled for this school' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if message type is allowed for the plan
    if (!isMessageTypeAllowed(school.plan_type, message_type)) {
      console.log(`Message type ${message_type} not allowed for ${school.plan_type} plan`);
      await logMessage(supabase, school_id, parent_id, student_id, message_type, message, phone_number, 'Blocked', null, `Plan ${school.plan_type} does not include ${message_type}`);
      return new Response(
        JSON.stringify({ error: `${message_type} messages are not included in your ${school.plan_type} plan. Please upgrade to access this feature.` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check message limit
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: usage, error: usageError } = await supabase
      .from('whatsapp_usage')
      .select('messages_sent, message_limit')
      .eq('school_id', school_id)
      .eq('month_year', currentMonth)
      .single();

    const messageLimit = usage?.message_limit || getPlanMessageLimit(school.plan_type);
    const messagesSent = usage?.messages_sent || 0;

    if (messagesSent >= messageLimit) {
      console.log(`Message limit reached: ${messagesSent}/${messageLimit}`);
      await logMessage(supabase, school_id, parent_id, student_id, message_type, message, phone_number, 'Blocked', null, 'Monthly message limit reached');
      return new Response(
        JSON.stringify({ error: 'Monthly WhatsApp message limit reached. Contact Super Admin to increase limit.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch WhatsApp settings for the school (OpenWA configuration)
    const { data: settings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('school_id', school_id)
      .eq('active_status', true)
      .single();

    if (settingsError || !settings) {
      console.error('WhatsApp settings not found:', settingsError);
      await logMessage(supabase, school_id, parent_id, student_id, message_type, message, phone_number, 'Failed', null, 'WhatsApp not configured');
      return new Response(
        JSON.stringify({ error: 'WhatsApp not configured for this school' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sendStatus = 'Sent';
    let errorMessage: string | null = null;
    let waMessageId: string | null = null;

    // Build the OpenWA API URL
    const serverUrl = (settings.server_url || 'https://commissioner-accomplished-ppm-happens.trycloudflare.com').replace(/\/+$/, '');
    const sessionId = settings.session_id || 'default';
    const chatId = formatPhoneToWAId(phone_number);

    console.log(`Sending via OpenWA: ${serverUrl}/api/sessions/${sessionId}/messages/send-text to ${chatId}`);

    try {
      // Send message via OpenWA self-hosted API
      const openwaResponse = await fetch(
        `${serverUrl}/api/sessions/${sessionId}/messages/send-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': settings.api_key || '',
          },
          body: JSON.stringify({
            chatId: chatId,
            text: message,
          }),
        }
      );

      if (openwaResponse.ok) {
        // Success: OpenWA returns { messageId, timestamp } with 201
        const result = await openwaResponse.json();
        waMessageId = result.messageId || null;
        console.log('OpenWA message sent successfully:', result);
      } else {
        sendStatus = 'Failed';
        const errorBody = await openwaResponse.text();
        console.error('OpenWA error:', openwaResponse.status, errorBody);

        // Parse OpenWA error response
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = Array.isArray(errorJson.message)
            ? errorJson.message.join(', ')
            : errorJson.message || errorJson.error || errorBody;
        } catch {
          errorMessage = errorBody;
        }
      }
    } catch (fetchError) {
      sendStatus = 'Failed';
      errorMessage = fetchError instanceof Error
        ? `Connection failed: ${fetchError.message}`
        : 'Failed to connect to OpenWA server';
      console.error('OpenWA fetch error:', fetchError);
    }

    // Log the message
    await logMessage(supabase, school_id, parent_id, student_id, message_type, message, phone_number, sendStatus, waMessageId, errorMessage);

    // Increment message count if sent successfully
    if (sendStatus === 'Sent') {
      await supabase
        .from('whatsapp_usage')
        .upsert({
          school_id,
          month_year: currentMonth,
          messages_sent: messagesSent + 1,
          message_limit: messageLimit,
        }, { onConflict: 'school_id,month_year' });
    }

    return new Response(
      JSON.stringify({ 
        success: sendStatus === 'Sent',
        status: sendStatus,
        messageId: waMessageId,
        error: errorMessage,
        usage: {
          sent: messagesSent + (sendStatus === 'Sent' ? 1 : 0),
          limit: messageLimit
        }
      }),
      { status: sendStatus === 'Sent' ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to log messages
async function logMessage(
  supabase: any,
  school_id: string,
  parent_id: string | undefined,
  student_id: string | undefined,
  message_type: string,
  message_text: string,
  phone_number: string,
  status: string,
  wa_message_id?: string | null,
  error_message?: string | null
) {
  try {
    await supabase.from('whatsapp_logs').insert({
      school_id,
      parent_id,
      student_id,
      message_type,
      message_text,
      phone_number,
      status,
      wa_message_id,
    });
  } catch (e) {
    console.error('Error logging message:', e);
  }
}
