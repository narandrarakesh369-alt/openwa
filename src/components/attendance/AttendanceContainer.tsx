import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClassesList } from "./ClassesList";
import { AttendanceForm } from "./AttendanceForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "half_day";

interface AttendanceRecord {
  status: AttendanceStatus;
  reason?: string;
}

interface AttendanceContainerProps {
  userRole: "teacher" | "school_admin";
}

export const AttendanceContainer = ({ userRole }: AttendanceContainerProps) => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchClassInfo();
      checkExistingAttendance();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching classes:", error);
      return;
    }

    // Fetch student counts and today's attendance status
    const classesWithInfo = await Promise.all(
      (data || []).map(async (cls) => {
        const { count } = await supabase
          .from("class_students")
          .select("*", { count: "exact", head: true })
          .eq("class_id", cls.id);

        const today = new Date().toISOString().split("T")[0];
        const { data: attData } = await supabase
          .from("attendance")
          .select("id")
          .eq("class_id", cls.id)
          .eq("date", today)
          .single();

        return {
          ...cls,
          student_count: count || 0,
          attendance_status: attData ? "completed" : "pending"
        };
      })
    );

    setClasses(classesWithInfo);
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;

    // Fetch class_students for the selected class
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", selectedClass);

    if (enrollmentError) {
      console.error("Error fetching class students:", enrollmentError);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
      return;
    }

    if (!enrollmentData || enrollmentData.length === 0) {
      setStudents([]);
      return;
    }

    // Get the student user IDs
    const studentUserIds = enrollmentData.map(e => e.student_id);

    // Fetch student details including photo
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("user_id, first_name, last_name, photo_url")
      .in("user_id", studentUserIds);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      toast({
        title: "Error",
        description: "Failed to load student details",
        variant: "destructive"
      });
      return;
    }

    const studentsList = studentsData?.map((student: any) => ({
      id: student.user_id,
      first_name: student.first_name,
      last_name: student.last_name,
      photo_url: student.photo_url
    })) || [];

    setStudents(studentsList);
  };

  const fetchClassInfo = async () => {
    if (!selectedClass) return;

    const { data, error } = await supabase
      .from("classes")
      .select("name, section")
      .eq("id", selectedClass)
      .single();

    if (!error && data) {
      setClassInfo(data);
    }
  };

  const checkExistingAttendance = async () => {
    if (!selectedClass) return;

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        attendance_details (
          student_id,
          status,
          absence_reason
        )
      `)
      .eq("class_id", selectedClass)
      .eq("date", today)
      .single();

    if (data) {
      setAttendanceRecord(data);
    } else {
      setAttendanceRecord(null);
    }
  };

  const handleSubmitAttendance = async (attendanceData: Record<string, AttendanceRecord>) => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      // Check if modifying existing
      if (attendanceRecord) {
        // Delete existing details
        await supabase
          .from("attendance_details")
          .delete()
          .eq("attendance_id", attendanceRecord.id);

        // Insert new details
        const details = Object.entries(attendanceData).map(([studentId, record]) => ({
          attendance_id: attendanceRecord.id,
          student_id: studentId,
          status: record.status,
          absence_reason: record.reason || null
        }));

        await supabase.from("attendance_details").insert(details);

        // Send WhatsApp for newly absent students
        const absentStudents = Object.entries(attendanceData)
          .filter(([_, record]) => record.status === "absent")
          .map(([studentId]) => studentId);

        if (absentStudents.length > 0) {
          await sendAttendanceNotifications(absentStudents, attendanceRecord.id);
        }

        toast({
          title: "Attendance updated",
          description: "Attendance has been successfully updated and notifications sent.",
        });
      } else {
        // Create new attendance record
        const { data: newAttendance, error: attError } = await supabase
          .from("attendance")
          .insert({
            class_id: selectedClass,
            date: today,
            submitted_by: user.id,
            locked: true
          })
          .select()
          .single();

        if (attError) throw attError;

        // Insert attendance details
        const details = Object.entries(attendanceData).map(([studentId, record]) => ({
          attendance_id: newAttendance.id,
          student_id: studentId,
          status: record.status,
          absence_reason: record.reason || null
        }));

        await supabase.from("attendance_details").insert(details);

        // Send WhatsApp for absent students
        const absentStudents = Object.entries(attendanceData)
          .filter(([_, record]) => record.status === "absent")
          .map(([studentId]) => studentId);

        if (absentStudents.length > 0) {
          await sendAttendanceNotifications(absentStudents, newAttendance.id);
        }

        toast({
          title: "Attendance submitted",
          description: "Attendance has been successfully submitted and parents notified.",
        });
      }

      // Refresh data
      await checkExistingAttendance();
      await fetchClasses();
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to submit attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendAttendanceNotifications = async (absentStudentIds: string[], attendanceId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Call edge function to create notification logs
      const { error } = await supabase.functions.invoke('attendance-notification', {
        body: {
          attendanceId,
          absentStudentIds,
          classId: selectedClass,
          date: today
        }
      });

      if (error) {
        console.error('Error sending notifications:', error);
      }
    } catch (err) {
      console.error('Failed to send attendance notifications:', err);
    }
  };

  const getInitialAttendance = (): Record<string, AttendanceRecord> => {
    if (!attendanceRecord?.attendance_details) return {};
    
    const initial: Record<string, AttendanceRecord> = {};
    attendanceRecord.attendance_details.forEach((detail: any) => {
      initial[detail.student_id] = {
        status: detail.status as AttendanceStatus,
        reason: detail.absence_reason || undefined
      };
    });
    return initial;
  };

  if (!selectedClass) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground font-poppins">Attendance Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {userRole === "school_admin" ? "Admin" : "Teacher"}
          </p>
        </div>
        <ClassesList 
          classes={classes} 
          onClassSelect={setSelectedClass}
          userRole={userRole}
        />
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => setSelectedClass(null)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Classes
      </Button>

      {classInfo && (
        <AttendanceForm
          students={students}
          classInfo={classInfo}
          isLocked={!!attendanceRecord?.locked}
          userRole={userRole}
          onSubmit={handleSubmitAttendance}
          initialAttendance={getInitialAttendance()}
        />
      )}
    </div>
  );
};
