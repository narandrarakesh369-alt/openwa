import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceNotificationRequest {
  attendanceId: string;
  absentStudentIds: string[];
  classId: string;
  date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { attendanceId, absentStudentIds, classId, date }: AttendanceNotificationRequest = await req.json();

    console.log(`Processing attendance notifications for ${absentStudentIds?.length || 0} absent students`);

    if (!absentStudentIds || absentStudentIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No absent students to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch student details - match by id or user_id
    const idList = absentStudentIds.map(id => `"${id}"`).join(',');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, user_id, first_name, last_name, father_name, father_phone, mother_phone, phone, school_id')
      .or(`id.in.(${idList}),user_id.in.(${idList})`);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw studentsError;
    }

    // Fetch class info
    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('name, section')
      .eq('id', classId)
      .single();

    if (classError) {
      console.error('Error fetching class:', classError);
    }

    const className = classInfo ? `${classInfo.name}${classInfo.section ? ' - ' + classInfo.section : ''}` : 'Class';

    // Create notification logs for each absent student (in-app)
    const notifications = students?.map(student => ({
      school_id: student.school_id,
      notification_type: 'attendance',
      channel: 'in_app',
      recipient_id: student.id,
      recipient_phone: student.father_phone || student.mother_phone || student.phone,
      subject: 'Attendance Alert',
      message: `${student.first_name} ${student.last_name} was marked absent from ${className} on ${date}.`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })) || [];

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notification_logs')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting in_app notifications:', insertError);
      }
    }

    // Send WhatsApp notifications for absent students via OpenWA
    let whatsappSent = 0;
    let whatsappFailed = 0;

    if (students && students.length > 0) {
      const schoolId = students[0].school_id;

      // Check if WhatsApp is enabled for this school
      const { data: school } = await supabase
        .from('schools')
        .select('name, whatsapp_enabled, school_status')
        .eq('id', schoolId)
        .single();

      if (school?.whatsapp_enabled && school.school_status !== 'Frozen') {
        for (const student of students) {
          const parentPhone = student.father_phone || student.mother_phone || student.phone;
          if (!parentPhone) {
            console.log(`No phone number for student ${student.first_name} ${student.last_name}, skipping WhatsApp`);
            continue;
          }

          const whatsappMessage = `⚠️ *${school.name || 'School'} - Attendance Alert*\n\nDear ${student.father_name || 'Parent'},\n\nYour child *${student.first_name} ${student.last_name}* was marked *ABSENT* from *${className}* on *${date}*.\n\nIf this was unplanned or in error, please contact the school office.\n\n— *${school.name || 'School Administration'}*`;

          try {
            const { data, error } = await supabase.functions.invoke('send-whatsapp', {
              body: {
                phone_number: parentPhone,
                message: whatsappMessage,
                message_type: 'Absence',
                school_id: schoolId,
                student_id: student.id,
              },
            });

            if (error) {
              console.error(`WhatsApp failed for ${student.first_name}:`, error);
              whatsappFailed++;
            } else {
              console.log(`WhatsApp sent for ${student.first_name}:`, data);
              whatsappSent++;
            }
          } catch (waError) {
            console.error(`WhatsApp error for ${student.first_name}:`, waError);
            whatsappFailed++;
          }
        }
      } else {
        console.log('WhatsApp is not enabled for this school, skipping WhatsApp notifications');
      }
    }

    console.log(`WhatsApp summary: ${whatsappSent} sent, ${whatsappFailed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      notificationsCreated: notifications.length,
      whatsappSent,
      whatsappFailed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in attendance-notification function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
