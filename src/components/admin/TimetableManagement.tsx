import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TimetableGrid } from "@/components/shared/TimetableGrid";
import { Plus, Trash2, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TimetableManagement = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    day_of_week: "1",
    subject_id: "",
    teacher_id: "",
    start_time: "09:00",
    end_time: "10:00",
    room_number: "",
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
      fetchTimetable();
      
      // Set up realtime subscription
      const channel = supabase
        .channel("timetable-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "timetable",
            filter: `class_id=eq.${selectedClass}`,
          },
          () => {
            fetchTimetable();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("name");

    if (data && data.length > 0) {
      setClasses(data);
      setSelectedClass(data[0].id);
    }
  };

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .order("name");

    if (data) {
      setSubjects(data);
    }
  };

  const fetchTeachers = async () => {
    // Fetch teacher user_ids first
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");

    if (roleData && roleData.length > 0) {
      const teacherIds = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teacherIds)
        .order("full_name");
      setTeachers(profiles || []);
    } else {
      setTeachers([]);
    }
  };

  const fetchTimetable = async () => {
    if (!selectedClass) return;

    const { data, error } = await supabase
      .from("timetable")
      .select("*")
      .eq("class_id", selectedClass)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      toast({
        title: "Error fetching timetable",
        description: error.message,
        variant: "destructive",
      });
    } else if (data && data.length > 0) {
      // Fetch subjects and teacher names separately
      const subjectIds = [...new Set(data.map(t => t.subject_id).filter(Boolean))];
      const teacherIds = [...new Set(data.map(t => t.teacher_id).filter(Boolean))];

      const [subjectsRes, profilesRes] = await Promise.all([
        subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : { data: [] },
        teacherIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", teacherIds) : { data: [] },
      ]);

      const subjectMap = Object.fromEntries(((subjectsRes as any).data || []).map((s: any) => [s.id, s]));
      const teacherMap = Object.fromEntries(((profilesRes as any).data || []).map((p: any) => [p.id, p]));

      const enriched = data.map(t => ({
        ...t,
        subject: subjectMap[t.subject_id] || null,
        teacher: teacherMap[t.teacher_id] || null,
      }));
      setTimetableEntries(enriched);
    } else {
      setTimetableEntries([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for overlapping periods for the same teacher
    const { data: overlapping } = await supabase
      .from("timetable")
      .select("*")
      .eq("teacher_id", formData.teacher_id)
      .eq("day_of_week", parseInt(formData.day_of_week))
      .or(`and(start_time.lte.${formData.end_time},end_time.gte.${formData.start_time})`);

    if (overlapping && overlapping.length > 0) {
      toast({
        title: "Overlapping period detected",
        description: "This teacher is already assigned to another class during this time.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("timetable")
      .insert({
        class_id: selectedClass,
        ...formData,
        day_of_week: parseInt(formData.day_of_week),
      });

    if (error) {
      toast({
        title: "Error creating timetable entry",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Timetable entry created successfully",
      });
      setDialogOpen(false);
      setFormData({
        day_of_week: "1",
        subject_id: "",
        teacher_id: "",
        start_time: "09:00",
        end_time: "10:00",
        room_number: "",
      });
      fetchTimetable();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("timetable")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Entry deleted successfully",
      });
      fetchTimetable();
    }
  };

  const handleCopyTimetable = async () => {
    if (!selectedClass || classes.length < 2) return;

    // Show dialog to select target class
    const targetClassId = prompt("Enter target class ID to copy timetable to:");
    if (!targetClassId) return;

    const entriesToCopy = timetableEntries.map((entry) => ({
      class_id: targetClassId,
      day_of_week: entry.day_of_week,
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      room_number: entry.room_number,
    }));

    const { error } = await supabase
      .from("timetable")
      .insert(entriesToCopy);

    if (error) {
      toast({
        title: "Error copying timetable",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Timetable copied successfully",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose a class to manage its timetable</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.section || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedClass}>
                <Plus className="h-4 w-4 mr-2" />
                Add Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timetable Entry</DialogTitle>
                <DialogDescription>Create a new period for this class</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="day">Day of Week</Label>
                  <Select
                    value={formData.day_of_week}
                    onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                  >
                    <SelectTrigger id="day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="teacher">Teacher</Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                  >
                    <SelectTrigger id="teacher">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start">Start Time</Label>
                    <Input
                      id="start"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end">End Time</Label>
                    <Input
                      id="end"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="room">Room Number</Label>
                  <Input
                    id="room"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="e.g., 101"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Entry</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleCopyTimetable} disabled={!selectedClass}>
            <Copy className="h-4 w-4 mr-2" />
            Copy to Another Class
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Timetable</CardTitle>
              <CardDescription>Visual grid view of the class schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {timetableEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No timetable entries. Add periods to get started.</p>
                </div>
              ) : (
                <TimetableGrid entries={timetableEntries} viewType="admin" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Entries</CardTitle>
              <CardDescription>List view with delete options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timetableEntries.map((entry) => {
                  const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{entry.subject?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {days[entry.day_of_week]} • {entry.start_time} - {entry.end_time} •{" "}
                          {entry.teacher?.full_name}
                          {entry.room_number && ` • Room ${entry.room_number}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
