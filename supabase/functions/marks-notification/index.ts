import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarksNotificationRequest {
  schoolId: string;
  studentId: string;
  examId?: string;
  subjectId?: string;
  examName: string;
  subjectName: string;
  marksObtained: number | string;
  totalMarks?: number | string;
  grade?: string;
  remarks?: string;
}

function formatPhoneToWAId(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length <= 10) cleaned = '91' + cleaned;
  return cleaned + '@c.us';
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
      examName,
      subjectName,
      marksObtained,
      totalMarks = 100,
      grade = '',
      remarks = ''
    }: MarksNotificationRequest = await req.json();

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

    // Fetch student info strictly by school_id and studentId
    const { data: student, error: stError } = await supabase
      .from('students')
      .select('id, first_name, last_name, father_name, father_phone, mother_phone, phone')
      .eq('school_id', schoolId)
      .or(`id.eq.${studentId},user_id.eq.${studentId}`)
      .maybeSingle();

    if (stError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found in this school' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parentPhone = student.father_phone || student.mother_phone || student.phone;
    if (!parentPhone) {
      return new Response(JSON.stringify({ success: false, message: 'No phone number for student parent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format WhatsApp report card message
    const formattedMessage = `📊 *${school.name} - Exam Result Report*\n\nDear ${student.father_name || 'Parent'},\n\nHere is the exam performance for *${student.first_name} ${student.last_name}*:\n\n📝 *Exam:* ${examName}\n📚 *Subject:* ${subjectName}\n🎯 *Score:* ${marksObtained} / ${totalMarks}\n🏆 *Grade:* ${grade || 'N/A'}${remarks ? `\n💬 *Remarks:* ${remarks}` : ''}\n\n— *${school.name}*`;

    // Invoke send-whatsapp
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        phone_number: parentPhone,
        message: formattedMessage,
        message_type: 'Notice',
        school_id: schoolId,
        student_id: student.id,
      },
    });

    if (sendError) throw sendError;

    return new Response(JSON.stringify({
      success: true,
      recipient: parentPhone,
      studentName: `${student.first_name} ${student.last_name}`,
      data: sendResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in marks-notification:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
