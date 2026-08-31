import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeeNotificationRequest {
  schoolId: string;
  studentId: string;
  type: "reminder" | "receipt";
  amount: number | string;
  feeType: string;
  dueDate?: string;
  receiptNo?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      schoolId,
      studentId,
      type,
      amount,
      feeType,
      dueDate,
      receiptNo
    }: FeeNotificationRequest = await req.json();

    if (!schoolId || !studentId) {
      return new Response(JSON.stringify({ error: 'School ID and Student ID are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch school info
    const { data: school } = await supabase
      .from('schools')
      .select('name, whatsapp_enabled, school_status')
      .eq('id', schoolId)
      .single();

    if (!school || school.school_status === 'Frozen' || !school.whatsapp_enabled) {
      return new Response(JSON.stringify({ success: false, message: 'WhatsApp disabled for school' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch student info
    const { data: student, error: stError } = await supabase
      .from('students')
      .select('id, first_name, last_name, father_name, father_phone, mother_phone, phone')
      .eq('school_id', schoolId)
      .or(`id.eq.${studentId},user_id.eq.${studentId}`)
      .maybeSingle();

    if (stError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parentPhone = student.father_phone || student.mother_phone || student.phone;
    if (!parentPhone) {
      return new Response(JSON.stringify({ success: false, message: 'No parent phone number found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let messageText = '';
    if (type === 'receipt') {
      messageText = `💳 *${school.name} - Fee Payment Receipt*\n\nDear ${student.father_name || 'Parent'},\n\nWe have received the fee payment for *${student.first_name} ${student.last_name}*:\n\n💰 *Amount Paid:* ₹${amount}\n📋 *Fee Type:* ${feeType}\n🧾 *Receipt No:* ${receiptNo || 'REC-' + Date.now().toString().slice(-6)}\n📅 *Date:* ${new Date().toLocaleDateString('en-GB')}\n✅ *Status:* Paid in Full\n\nThank you for your prompt payment.\n\n— *${school.name}*`;
    } else {
      messageText = `⚠️ *${school.name} - Fee Due Reminder*\n\nDear ${student.father_name || 'Parent'},\n\nThis is a friendly reminder regarding the pending fee for *${student.first_name} ${student.last_name}*:\n\n💰 *Amount Due:* ₹${amount}\n📋 *Fee Category:* ${feeType}${dueDate ? `\n📅 *Due Date:* ${dueDate}` : ''}\n\nPlease ensure payment before the due date to avoid any late charges.\n\n— *${school.name}*`;
    }

    // Dispatch via send-whatsapp
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        phone_number: parentPhone,
        message: messageText,
        message_type: 'Fee',
        school_id: schoolId,
        student_id: student.id,
      },
    });

    if (sendError) throw sendError;

    return new Response(JSON.stringify({
      success: true,
      type,
      recipient: parentPhone,
      studentName: `${student.first_name} ${student.last_name}`,
      data: sendResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fee-notification:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
