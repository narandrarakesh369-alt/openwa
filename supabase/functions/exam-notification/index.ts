import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExamNotificationRequest {
  schoolId?: string;
  daysAhead?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { schoolId, daysAhead = 3 }: ExamNotificationRequest = await req.json().catch(() => ({}));

    console.log(`Checking for exams starting within ${daysAhead} days for school: ${schoolId || 'all'}`);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Fetch upcoming exams
    let examsQuery = supabase
      .from('exams')
      .select(`
        id,
        exam_name,
        exam_type,
        start_date,
        end_date,
        class_id,
        school_id,
        schools:school_id (
          name,
          whatsapp_enabled
        ),
        classes (
          id,
          name,
          section
        )
      `)
      .gte('start_date', todayStr)
      .lte('start_date', futureDateStr);

    if (schoolId) {
      examsQuery = examsQuery.eq('school_id', schoolId);
    }

    const { data: exams, error: examsError } = await examsQuery;

    if (examsError) {
      console.error('Error fetching exams:', examsError);
      throw examsError;
    }

    if (!exams || exams.length === 0) {
      console.log('No upcoming exams found');
      return new Response(JSON.stringify({ message: 'No upcoming exams', notificationsCreated: 0, whatsappSent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalNotifications = 0;
    let totalWhatsAppSent = 0;

    for (const exam of exams) {
      // Get students enrolled in this class
      const { data: classStudents, error: enrollError } = await supabase
        .from('class_students')
        .select(`
          student_id,
          students!inner (
            id,
            user_id,
            first_name,
            last_name,
            father_name,
            father_phone,
            mother_phone,
            phone,
            school_id
          )
        `)
        .eq('class_id', exam.class_id);

      if (enrollError) {
        console.error('Error fetching class students:', enrollError);
        continue;
      }

      const students = classStudents?.map((item: any) => item.students).filter(Boolean) || [];
      if (students.length === 0) continue;

      const examDate = new Date(exam.start_date);
      const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysText = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days (${exam.start_date})`;

      const classData: any = Array.isArray(exam.classes) ? exam.classes[0] : exam.classes;
      const className = classData ? `${classData.name}${classData.section ? ' - ' + classData.section : ''}` : 'Class';
      const schoolObj: any = Array.isArray(exam.schools) ? exam.schools[0] : exam.schools;
      const schoolName = schoolObj?.name || 'School';
      const isWhatsAppEnabled = schoolObj?.whatsapp_enabled;

      // Create in-app notifications
      const notifications = students.map((student: any) => ({
        school_id: student.school_id,
        notification_type: 'exam',
        channel: 'in_app',
        recipient_id: student.id,
        subject: `Exam Alert: ${exam.exam_name}`,
        message: `${exam.exam_name} (${exam.exam_type}) for ${className} starts ${daysText}. Good luck, ${student.first_name}!`,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }));

      if (notifications.length > 0) {
        await supabase.from('notification_logs').insert(notifications);
        totalNotifications += notifications.length;
      }

      // Send WhatsApp Exam Alerts to Parents
      if (isWhatsAppEnabled) {
        for (const student of students) {
          const parentPhone = student.father_phone || student.mother_phone || student.phone;
          if (!parentPhone) continue;

          const msg = `📝 *${schoolName} - Upcoming Exam Alert*\n\nDear ${student.father_name || 'Parent'},\n\nThis is to notify you that *${exam.exam_name} (${exam.exam_type})* for *${student.first_name} ${student.last_name}* (${className}) starts *${daysText}*.\n\nPlease ensure your child is prepared.\n\n— *${schoolName}*`;

          try {
            const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
              body: {
                phone_number: parentPhone,
                message: msg,
                message_type: 'Notice',
                school_id: student.school_id,
                student_id: student.id,
              },
            });

            if (!waError) {
              totalWhatsAppSent++;
            }
          } catch (e) {
            console.error(`Failed to send WhatsApp exam alert to ${student.first_name}:`, e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      examsProcessed: exams.length,
      notificationsCreated: totalNotifications,
      whatsappSent: totalWhatsAppSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in exam-notification function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
