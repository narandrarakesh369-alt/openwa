export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          announcement_type: string
          created_at: string
          created_by: string
          id: string
          message: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          created_at?: string
          created_by: string
          id?: string
          message: string
          target_audience: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_url: string | null
          id: string
          marks_obtained: number | null
          student_id: string
          submission_text: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_url?: string | null
          id?: string
          marks_obtained?: number | null
          student_id: string
          submission_text?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_url?: string | null
          id?: string
          marks_obtained?: number | null
          student_id?: string
          submission_text?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_id: string
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          subject_id: string
          teacher_id: string
          title: string
          total_marks: number
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          subject_id: string
          teacher_id: string
          title: string
          total_marks?: number
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          subject_id?: string
          teacher_id?: string
          title?: string
          total_marks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          id: string
          locked: boolean | null
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date?: string
          id?: string
          locked?: boolean | null
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          id?: string
          locked?: boolean | null
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_details: {
        Row: {
          absence_reason: string | null
          attendance_id: string
          created_at: string | null
          id: string
          status: string
          student_id: string
        }
        Insert: {
          absence_reason?: string | null
          attendance_id: string
          created_at?: string | null
          id?: string
          status: string
          student_id: string
        }
        Update: {
          absence_reason?: string | null
          attendance_id?: string
          created_at?: string | null
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_details_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          created_at: string | null
          id: string
          name: string
          text_positions_json: Json | null
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string | null
          id?: string
          name: string
          text_positions_json?: Json | null
        }
        Update: {
          background_image_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          text_positions_json?: Json | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          class_id: string | null
          created_at: string | null
          description: string | null
          file_url: string | null
          id: string
          issue_date: string
          issued_by: string
          student_id: string
          teacher_id: string | null
          template_id: string | null
          title: string
        }
        Insert: {
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string
          issued_by: string
          student_id: string
          teacher_id?: string | null
          template_id?: string | null
          title: string
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string
          issued_by?: string
          student_id?: string
          teacher_id?: string | null
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          enrolled_at: string | null
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string
          section: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id: string
          section?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
          section?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          academic_year: string
          class_id: string
          enrolled_at: string | null
          id: string
          school_id: string
          status: string | null
          student_id: string
        }
        Insert: {
          academic_year: string
          class_id: string
          enrolled_at?: string | null
          id?: string
          school_id: string
          status?: string | null
          student_id: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          enrolled_at?: string | null
          id?: string
          school_id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_subjects: {
        Row: {
          created_at: string | null
          exam_date: string
          exam_id: string
          id: string
          max_marks: number
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          exam_date: string
          exam_id: string
          id?: string
          max_marks?: number
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          exam_date?: string
          exam_id?: string
          id?: string
          max_marks?: number
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          exam_name: string
          exam_type: string
          id: string
          school_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          exam_name: string
          exam_type: string
          id?: string
          school_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          exam_name?: string
          exam_type?: string
          id?: string
          school_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          academic_year: string
          amount: number
          created_at: string | null
          discount_amount: number | null
          discount_reason: string | null
          due_date: string
          fee_type: string
          fine_amount: number | null
          fine_reason: string | null
          id: string
          installment_number: number | null
          paid_amount: number | null
          payment_method: string | null
          receipt_url: string | null
          school_id: string
          status: string
          student_id: string
          total_installments: number | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          amount: number
          created_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date: string
          fee_type: string
          fine_amount?: number | null
          fine_reason?: string | null
          id?: string
          installment_number?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          receipt_url?: string | null
          school_id: string
          status?: string
          student_id: string
          total_installments?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          amount?: number
          created_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string
          fee_type?: string
          fine_amount?: number | null
          fine_reason?: string | null
          id?: string
          installment_number?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          receipt_url?: string | null
          school_id?: string
          status?: string
          student_id?: string
          total_installments?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          amount: number
          class_id: string | null
          created_at: string | null
          due_date: string
          fee_type: string
          id: string
          school_id: string
        }
        Insert: {
          academic_year: string
          amount: number
          class_id?: string | null
          created_at?: string | null
          due_date: string
          fee_type: string
          id?: string
          school_id: string
        }
        Update: {
          academic_year?: string
          amount?: number
          class_id?: string | null
          created_at?: string | null
          due_date?: string
          fee_type?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string | null
          exam_name: string
          grade: string | null
          id: string
          marks_obtained: number
          student_id: string
          subject_id: string
          term: string
          total_marks: number
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string | null
          exam_name: string
          grade?: string | null
          id?: string
          marks_obtained: number
          student_id: string
          subject_id: string
          term: string
          total_marks: number
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string | null
          exam_name?: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          student_id?: string
          subject_id?: string
          term?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachment_url: string | null
          class_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          subject_id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          subject_id: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          subject_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          created_at: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          homework_id: string
          id: string
          student_id: string
          submission_text: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          homework_id: string
          id?: string
          student_id: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          homework_id?: string
          id?: string
          student_id?: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          created_at: string | null
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number
          remarks: string | null
          student_id: string
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained: number
          remarks?: string | null
          student_id: string
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          remarks?: string | null
          student_id?: string
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message_text: string
          read_status: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          read_status?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          read_status?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          school_id: string
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          school_id: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          school_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          announcement_notification: boolean | null
          attendance_notification: boolean | null
          created_at: string
          email_enabled: boolean | null
          email_from_address: string | null
          email_from_name: string | null
          exam_notification: boolean | null
          fee_reminder: boolean | null
          id: string
          school_id: string
          sms_api_key: string | null
          sms_enabled: boolean | null
          sms_sender_id: string | null
          updated_at: string
        }
        Insert: {
          announcement_notification?: boolean | null
          attendance_notification?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          exam_notification?: boolean | null
          fee_reminder?: boolean | null
          id?: string
          school_id: string
          sms_api_key?: string | null
          sms_enabled?: boolean | null
          sms_sender_id?: string | null
          updated_at?: string
        }
        Update: {
          announcement_notification?: boolean | null
          attendance_notification?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          exam_notification?: boolean | null
          fee_reminder?: boolean | null
          id?: string
          school_id?: string
          sms_api_key?: string | null
          sms_enabled?: boolean | null
          sms_sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      official_documents: {
        Row: {
          conduct: string | null
          created_at: string
          document_data: Json | null
          document_number: string
          document_type: string
          id: string
          issue_date: string
          issued_by: string
          leaving_date: string | null
          reason: string | null
          remarks: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          conduct?: string | null
          created_at?: string
          document_data?: Json | null
          document_number: string
          document_type: string
          id?: string
          issue_date?: string
          issued_by: string
          leaving_date?: string | null
          reason?: string | null
          remarks?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          conduct?: string | null
          created_at?: string
          document_data?: Json | null
          document_number?: string
          document_type?: string
          id?: string
          issue_date?: string
          issued_by?: string
          leaving_date?: string | null
          reason?: string | null
          remarks?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_payments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          expiry_date: string
          id: string
          parent_id: string
          payment_date: string | null
          payment_method: string | null
          school_id: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          expiry_date: string
          id?: string
          parent_id: string
          payment_date?: string | null
          payment_method?: string | null
          school_id: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          expiry_date?: string
          id?: string
          parent_id?: string
          payment_date?: string | null
          payment_method?: string | null
          school_id?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          relationship: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
        }
        Relationships: []
      }
      plan_change_requests: {
        Row: {
          id: string
          notes: string | null
          requested_at: string | null
          requested_by: string
          requested_plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          requested_at?: string | null
          requested_by: string
          requested_plan: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          requested_at?: string | null
          requested_by?: string
          requested_plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          class_id: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          generated_by: string
          id: string
          report_type: Database["public"]["Enums"]["report_type"]
          student_id: string | null
          summary_json: Json
          title: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          generated_by: string
          id?: string
          report_type: Database["public"]["Enums"]["report_type"]
          student_id?: string | null
          summary_json?: Json
          title: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          generated_by?: string
          id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          student_id?: string | null
          summary_json?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string | null
          deductions: number | null
          id: string
          month: number
          net_salary: number
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          payslip_url: string | null
          staff_id: string
          year: number
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string | null
          deductions?: number | null
          id?: string
          month: number
          net_salary: number
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payslip_url?: string | null
          staff_id: string
          year: number
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          deductions?: number | null
          id?: string
          month?: number
          net_salary?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payslip_url?: string | null
          staff_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structure: {
        Row: {
          base_salary: number
          created_at: string | null
          da: number | null
          deductions: number | null
          designation: string
          hra: number | null
          id: string
          other_allowances: number | null
          school_id: string
        }
        Insert: {
          base_salary: number
          created_at?: string | null
          da?: number | null
          deductions?: number | null
          designation: string
          hra?: number | null
          id?: string
          other_allowances?: number | null
          school_id: string
        }
        Update: {
          base_salary?: number
          created_at?: string | null
          da?: number | null
          deductions?: number | null
          designation?: string
          hra?: number | null
          id?: string
          other_allowances?: number | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_structure_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subscriptions: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          payment_status: string | null
          plan_name: string
          school_id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          payment_status?: string | null
          plan_name: string
          school_id: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          payment_status?: string | null
          plan_name?: string
          school_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          membership_expires_at: string | null
          name: string
          phone: string | null
          plan_expiry: string | null
          plan_type: string
          school_status: string | null
          tagline: string | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          membership_expires_at?: string | null
          name: string
          phone?: string | null
          plan_expiry?: string | null
          plan_type?: string
          school_status?: string | null
          tagline?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          membership_expires_at?: string | null
          name?: string
          phone?: string | null
          plan_expiry?: string | null
          plan_type?: string
          school_status?: string | null
          tagline?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          account_no: string | null
          allowances: number | null
          created_at: string | null
          deductions: number | null
          designation: string
          email: string
          id: string
          join_date: string
          name: string
          salary_base: number
          school_id: string
          user_id: string | null
        }
        Insert: {
          account_no?: string | null
          allowances?: number | null
          created_at?: string | null
          deductions?: number | null
          designation: string
          email: string
          id?: string
          join_date?: string
          name: string
          salary_base: number
          school_id: string
          user_id?: string | null
        }
        Update: {
          account_no?: string | null
          allowances?: number | null
          created_at?: string | null
          deductions?: number | null
          designation?: string
          email?: string
          id?: string
          join_date?: string
          name?: string
          salary_base?: number
          school_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_transport: {
        Row: {
          created_at: string
          id: string
          pickup_type: string | null
          route_id: string
          stop_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pickup_type?: string | null
          route_id: string
          stop_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pickup_type?: string | null
          route_id?: string
          stop_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transport_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "transport_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string
          admission_number: string
          blood_group: string | null
          city: string
          created_at: string | null
          date_of_birth: string
          emergency_contact: string
          father_name: string
          father_occupation: string | null
          father_phone: string
          first_name: string
          gender: string
          id: string
          last_name: string
          mother_name: string | null
          mother_occupation: string | null
          mother_phone: string | null
          phone: string
          photo_url: string | null
          pincode: string
          previous_school: string | null
          school_id: string
          state: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          admission_number: string
          blood_group?: string | null
          city: string
          created_at?: string | null
          date_of_birth: string
          emergency_contact: string
          father_name: string
          father_occupation?: string | null
          father_phone: string
          first_name: string
          gender: string
          id?: string
          last_name: string
          mother_name?: string | null
          mother_occupation?: string | null
          mother_phone?: string | null
          phone: string
          photo_url?: string | null
          pincode: string
          previous_school?: string | null
          school_id: string
          state: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          admission_number?: string
          blood_group?: string | null
          city?: string
          created_at?: string | null
          date_of_birth?: string
          emergency_contact?: string
          father_name?: string
          father_occupation?: string | null
          father_phone?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          mother_name?: string | null
          mother_occupation?: string | null
          mother_phone?: string | null
          phone?: string
          photo_url?: string | null
          pincode?: string
          previous_school?: string | null
          school_id?: string
          state?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          school_id: string
          subject_code: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          school_id: string
          subject_code?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          subject_code?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_leaves: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string
          rejection_reason: string | null
          school_id: string
          start_date: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason: string
          rejection_reason?: string | null
          school_id: string
          start_date: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          rejection_reason?: string | null
          school_id?: string
          start_date?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_leaves_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string
          blood_group: string | null
          city: string
          created_at: string | null
          date_of_birth: string
          department: string | null
          designation: string
          emergency_contact: string
          employee_id: string
          experience_years: number | null
          first_name: string
          gender: string
          id: string
          last_name: string
          phone: string
          pincode: string
          qualification: string
          salary: number | null
          school_id: string
          specialization: string | null
          state: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          blood_group?: string | null
          city: string
          created_at?: string | null
          date_of_birth: string
          department?: string | null
          designation: string
          emergency_contact: string
          employee_id: string
          experience_years?: number | null
          first_name: string
          gender: string
          id?: string
          last_name: string
          phone: string
          pincode: string
          qualification: string
          salary?: number | null
          school_id: string
          specialization?: string | null
          state: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          blood_group?: string | null
          city?: string
          created_at?: string | null
          date_of_birth?: string
          department?: string | null
          designation?: string
          emergency_contact?: string
          employee_id?: string
          experience_years?: number | null
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          phone?: string
          pincode?: string
          qualification?: string
          salary?: number | null
          school_id?: string
          specialization?: string | null
          state?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          room_number: string | null
          start_time: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          room_number?: string | null
          start_time: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          room_number?: string | null
          start_time?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          created_at: string
          distance_km: number | null
          end_point: string
          estimated_time_minutes: number | null
          id: string
          is_active: boolean | null
          monthly_fee: number | null
          route_name: string
          route_number: string
          school_id: string
          start_point: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          end_point: string
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          route_name: string
          route_number: string
          school_id: string
          start_point: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          end_point?: string
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          route_name?: string
          route_number?: string
          school_id?: string
          start_point?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_stops: {
        Row: {
          created_at: string
          drop_time: string | null
          id: string
          latitude: number | null
          longitude: number | null
          pickup_time: string | null
          route_id: string
          stop_name: string
          stop_order: number
        }
        Insert: {
          created_at?: string
          drop_time?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pickup_time?: string | null
          route_id: string
          stop_name: string
          stop_order: number
        }
        Update: {
          created_at?: string
          drop_time?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pickup_time?: string | null
          route_id?: string
          stop_name?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "transport_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_vehicles: {
        Row: {
          capacity: number
          conductor_name: string | null
          conductor_phone: string | null
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          is_active: boolean | null
          route_id: string | null
          school_id: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number
          conductor_name?: string | null
          conductor_phone?: string | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean | null
          route_id?: string | null
          school_id: string
          updated_at?: string
          vehicle_number: string
          vehicle_type?: string
        }
        Update: {
          capacity?: number
          conductor_name?: string | null
          conductor_phone?: string | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean | null
          route_id?: string | null
          school_id?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_vehicles_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_vehicles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          id: string
          message_text: string
          message_type: string
          parent_id: string | null
          phone_number: string | null
          school_id: string
          status: string
          student_id: string | null
          timestamp: string | null
          wa_message_id: string | null
        }
        Insert: {
          id?: string
          message_text: string
          message_type: string
          parent_id?: string | null
          phone_number?: string | null
          school_id: string
          status?: string
          student_id?: string | null
          timestamp?: string | null
          wa_message_id?: string | null
        }
        Update: {
          id?: string
          message_text?: string
          message_type?: string
          parent_id?: string | null
          phone_number?: string | null
          school_id?: string
          status?: string
          student_id?: string | null
          timestamp?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          active_status: boolean | null
          api_key: string | null
          api_provider: string
          created_at: string | null
          id: string
          phone_number_id: string | null
          school_id: string
          server_url: string | null
          session_id: string | null
          template_ids_json: Json | null
        }
        Insert: {
          active_status?: boolean | null
          api_key?: string | null
          api_provider: string
          created_at?: string | null
          id?: string
          phone_number_id?: string | null
          school_id: string
          server_url?: string | null
          session_id?: string | null
          template_ids_json?: Json | null
        }
        Update: {
          active_status?: boolean | null
          api_key?: string | null
          api_provider?: string
          created_at?: string | null
          id?: string
          phone_number_id?: string | null
          school_id?: string
          server_url?: string | null
          session_id?: string | null
          template_ids_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_usage: {
        Row: {
          created_at: string | null
          id: string
          message_limit: number | null
          messages_sent: number | null
          month_year: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_limit?: number | null
          messages_sent?: number | null
          month_year: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_limit?: number | null
          messages_sent?: number | null
          month_year?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_usage_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_demo_role: {
        Args: {
          user_email: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      can_send_whatsapp: {
        Args: { p_message_type: string; p_school_id: string }
        Returns: boolean
      }
      get_plan_message_limit: { Args: { plan_type: string }; Returns: number }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["user_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["user_role"]
              _user_id: string
            }
            Returns: boolean
          }
      increment_whatsapp_count: {
        Args: { p_school_id: string }
        Returns: undefined
      }
    }
    Enums: {
      certificate_type:
        | "academic"
        | "participation"
        | "attendance"
        | "excellence"
        | "performance"
        | "other"
      report_type: "attendance" | "academic" | "homework" | "comprehensive"
      user_role:
        | "super_admin"
        | "school_admin"
        | "teacher"
        | "student"
        | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      certificate_type: [
        "academic",
        "participation",
        "attendance",
        "excellence",
        "performance",
        "other",
      ],
      report_type: ["attendance", "academic", "homework", "comprehensive"],
      user_role: [
        "super_admin",
        "school_admin",
        "teacher",
        "student",
        "parent",
      ],
    },
  },
} as const
