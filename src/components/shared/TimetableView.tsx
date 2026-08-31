import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const TimetableView = ({ studentId }: { studentId?: string }) => {
  const [timetable, setTimetable] = useState<any[]>([]);

  useEffect(() => {
    fetchTimetable();
  }, [studentId]);

  const fetchTimetable = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let classId: string | null = null;

    if (studentId) {
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", studentId);
      if (!enrollments || enrollments.length === 0) return;
      classId = enrollments[0].class_id;
    } else {
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", user.id);
      if (!enrollments || enrollments.length === 0) return;
      classId = enrollments[0].class_id;
    }

    // Fetch timetable without embedded joins
    const { data: ttData } = await supabase
      .from("timetable")
      .select("*, subjects(name)")
      .eq("class_id", classId)
      .order("day_of_week")
      .order("start_time");

    if (ttData && ttData.length > 0) {
      // Fetch teacher profiles separately
      const teacherIds = [...new Set(ttData.map(t => t.teacher_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds);
        profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }
      // Merge
      const enriched = ttData.map(t => ({
        ...t,
        profiles: profilesMap[t.teacher_id] || null,
      }));
      setTimetable(enriched);
    } else {
      setTimetable([]);
    }
  };

  const groupedByDay = timetable.reduce((acc, entry) => {
    if (!acc[entry.day_of_week]) {
      acc[entry.day_of_week] = [];
    }
    acc[entry.day_of_week].push(entry);
    return acc;
  }, {} as Record<number, any[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Timetable</CardTitle>
        <CardDescription>Class schedule for the week</CardDescription>
      </CardHeader>
      <CardContent>
        {[1, 2, 3, 4, 5].map(day => (
          <div key={day} className="mb-6">
            <h3 className="text-lg font-semibold mb-3">{DAYS[day]}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByDay[day]?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.start_time} - {entry.end_time}</TableCell>
                    <TableCell className="font-medium">{entry.subjects?.name}</TableCell>
                    <TableCell>{entry.profiles?.full_name}</TableCell>
                    <TableCell>{entry.room_number || "-"}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No classes scheduled
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
