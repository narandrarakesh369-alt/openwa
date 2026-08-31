import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementNotificationRequest {
  announcementId: string;
  title: string;
  message: string;
  announcementType: string;
  targetAudience: string;
  schoolId: string;
}

// Convert phone number to WhatsApp chat ID format (country code + number + @c.us)
function formatPhoneToWAId(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length <= 10) {
    cleaned = '91' + cleaned;
  }
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
      announcementId,
      title,
      message,
      announcementType,
      targetAudience,
      schoolId
    }: AnnouncementNotificationRequest = await req.json();

    if (!schoolId) {
      return new Response(JSON.stringify({ error: 'School ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing announcement notification for school ${schoolId}, audience: ${targetAudience}`);

    // Fetch school info
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('name, plan_type, whatsapp_enabled, school_status')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      console.error('School not found:', schoolError);
      return new Response(JSON.stringify({ error: 'School not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (school.school_status === 'Frozen' || !school.whatsapp_enabled) {
      console.log('WhatsApp is disabled or school is frozen');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'WhatsApp is not enabled or school is frozen',
        whatsappSent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch school's WhatsApp configuration
    const { data: settings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('school_id', schoolId)
      .eq('active_status', true)
      .single();

    if (settingsError || !settings) {
      console.error('Active WhatsApp settings not found for school:', settingsError);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'WhatsApp settings not configured or inactive',
        whatsappSent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine target recipient students strictly within this school
    let students: Array<{
      id: string;
      first_name: string;
      last_name: string;
      father_phone?: string | null;
      mother_phone?: string | null;
      phone?: string | null;
      father_name?: string | null;
    }> = [];

    if (targetAudience.startsWith('class:')) {
      const classId = targetAudience.split(':')[1];
      console.log(`Targeting class: ${classId} for school: ${schoolId}`);

      // Query students enrolled in the class strictly for this school
      const { data: enrolled, error: enrollError } = await supabase
        .from('class_students')
        .select(`
          student_id,
          students!inner (
            id,
            first_name,
            last_name,
            father_phone,
            mother_phone,
            phone,
            father_name,
            school_id
          )
        `)
        .eq('class_id', classId)
        .eq('students.school_id', schoolId);

      if (enrollError) {
        console.error('Error fetching class students:', enrollError);
      } else if (enrolled) {
        students = enrolled.map((item: any) => item.students).filter(Boolean);
      }
    } else {
      // Entire school or general student/parent role target
      console.log(`Targeting all students in school: ${schoolId}`);
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, father_phone, mother_phone, phone, father_name')
        .eq('school_id', schoolId);

      if (studentsError) {
        console.error('Error fetching school students:', studentsError);
      } else if (allStudents) {
        students = allStudents;
      }
    }

    console.log(`Found ${students.length} students to notify in school ${school.name}`);

    // Build the announcement message
    const formattedAnnouncement = `📢 *${school.name} Announcement*\n\n*${title.trim()}*\n\n${message.trim()}\n\n📌 *Category:* ${announcementType.toUpperCase()}\n📅 *Date:* ${new Date().toLocaleDateString('en-GB')}\n\n— *${school.name}*`;

    // Deduplicate phone numbers so parents with multiple children only receive 1 message
    const phoneToStudentMap = new Map<string, { studentId: string; studentName: string }>();

    for (const student of students) {
      const primaryPhone = student.father_phone || student.mother_phone || student.phone;
      if (primaryPhone && primaryPhone.trim().length >= 7) {
        const cleaned = primaryPhone.replace(/\D/g, '');
        if (!phoneToStudentMap.has(cleaned)) {
          phoneToStudentMap.set(cleaned, {
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
          });
        }
      }
    }

    const uniqueRecipients = Array.from(phoneToStudentMap.entries());
    console.log(`Prepared ${uniqueRecipients.length} unique parent phone numbers for broadcast`);

    const serverUrl = (settings.server_url || 'http://localhost:2785').replace(/\/+$/, '');
    const sessionId = settings.session_id || 'default';
    const apiKey = settings.api_key || '';

    let sentCount = 0;
    let failedCount = 0;

    // Send messages in batches to avoid overwhelming the gateway
    for (const [phone, info] of uniqueRecipients) {
      const chatId = formatPhoneToWAId(phone);
      let waMessageId: string | null = null;
      let status = 'Sent';

      try {
        const response = await fetch(`${serverUrl}/api/sessions/${sessionId}/messages/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({
            chatId,
            text: formattedAnnouncement,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          waMessageId = resData.messageId || null;
          sentCount++;
        } else {
          status = 'Failed';
          failedCount++;
          console.error(`Failed to send announcement to ${chatId}: HTTP ${response.status}`);
        }
      } catch (err) {
        status = 'Failed';
        failedCount++;
        console.error(`Error sending announcement to ${chatId}:`, err);
      }

      // Log the message into whatsapp_logs table with school isolation
      try {
        await supabase.from('whatsapp_logs').insert({
          school_id: schoolId,
          student_id: info.studentId,
          message_type: 'Notice',
          message_text: `[${title}] ${message.slice(0, 100)}...`,
          phone_number: phone,
          status,
          wa_message_id: waMessageId,
        });
      } catch (logErr) {
        console.error('Failed to write whatsapp log:', logErr);
      }
    }

    // Also record in notification_logs table for in-app notification tracking
    try {
      const inAppLogs = students.map(st => ({
        school_id: schoolId,
        notification_type: 'announcement',
        channel: 'whatsapp',
        recipient_id: st.id,
        recipient_phone: st.father_phone || st.mother_phone || st.phone,
        subject: title,
        message: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }));

      if (inAppLogs.length > 0) {
        await supabase.from('notification_logs').insert(inAppLogs);
      }
    } catch (inAppErr) {
      console.error('Failed to insert in_app notification logs:', inAppErr);
    }

    console.log(`Broadcast summary: ${sentCount} sent, ${failedCount} failed out of ${uniqueRecipients.length} recipients.`);

    return new Response(JSON.stringify({
      success: true,
      totalRecipients: uniqueRecipients.length,
      whatsappSent: sentCount,
      whatsappFailed: failedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in announcement-notification function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
