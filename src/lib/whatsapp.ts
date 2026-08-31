import { supabase } from "@/integrations/supabase/client";

export interface SendWhatsAppParams {
  schoolId: string;
  phone: string;
  message: string;
  messageType?: "Absence" | "Fee" | "Notice" | "Custom";
  studentId?: string;
  parentId?: string;
}

export interface BulkWhatsAppRecipient {
  phone: string;
  studentId?: string;
  parentId?: string;
  message?: string;
}

/**
 * Sends a single WhatsApp message via the OpenWA edge function
 */
export async function sendWhatsAppMessage({
  schoolId,
  phone,
  message,
  messageType = "Notice",
  studentId,
  parentId,
}: SendWhatsAppParams) {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        phone_number: phone,
        message,
        message_type: messageType,
        school_id: schoolId,
        student_id: studentId,
        parent_id: parentId,
      },
    });

    if (error) throw error;
    return { success: data?.success ?? true, data };
  } catch (err: any) {
    console.error("sendWhatsAppMessage error:", err);
    return { success: false, error: err.message || "Failed to send WhatsApp message" };
  }
}

/**
 * Dispatches a Student Report Card / Exam Marks notification to parent
 */
export async function sendMarksNotificationWhatsApp({
  schoolId,
  studentId,
  examId,
  subjectId,
  examName,
  subjectName,
  marksObtained,
  totalMarks = 100,
  grade,
  remarks,
}: {
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
}) {
  try {
    const { data, error } = await supabase.functions.invoke("marks-notification", {
      body: {
        schoolId,
        studentId,
        examId,
        subjectId,
        examName,
        subjectName,
        marksObtained,
        totalMarks,
        grade,
        remarks,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("sendMarksNotificationWhatsApp error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches a Fee Due Reminder or Fee Payment Receipt to parent
 */
export async function sendFeeNotificationWhatsApp({
  schoolId,
  studentId,
  type,
  amount,
  feeType,
  dueDate,
  receiptNo,
}: {
  schoolId: string;
  studentId: string;
  type: "reminder" | "receipt";
  amount: number | string;
  feeType: string;
  dueDate?: string;
  receiptNo?: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("fee-notification", {
      body: {
        schoolId,
        studentId,
        type,
        amount,
        feeType,
        dueDate,
        receiptNo,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("sendFeeNotificationWhatsApp error:", err);
    return { success: false, error: err.message };
  }
}
