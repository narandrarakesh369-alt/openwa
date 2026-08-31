import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User } from "lucide-react";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  subject?: { name: string };
  teacher?: { full_name: string };
}

interface TimetableGridProps {
  entries: TimetableEntry[];
  viewType?: "student" | "teacher" | "parent" | "admin";
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const subjectColors: { [key: string]: string } = {
  math: "bg-blue-100 text-blue-800 border-blue-300",
  english: "bg-green-100 text-green-800 border-green-300",
  science: "bg-purple-100 text-purple-800 border-purple-300",
  history: "bg-yellow-100 text-yellow-800 border-yellow-300",
  geography: "bg-orange-100 text-orange-800 border-orange-300",
  physics: "bg-indigo-100 text-indigo-800 border-indigo-300",
  chemistry: "bg-pink-100 text-pink-800 border-pink-300",
  biology: "bg-emerald-100 text-emerald-800 border-emerald-300",
  computer: "bg-cyan-100 text-cyan-800 border-cyan-300",
  physical: "bg-red-100 text-red-800 border-red-300",
  default: "bg-gray-100 text-gray-800 border-gray-300",
};

const getSubjectColor = (subjectName: string) => {
  const subject = subjectName.toLowerCase();
  for (const [key, color] of Object.entries(subjectColors)) {
    if (subject.includes(key)) return color;
  }
  return subjectColors.default;
};

export const TimetableGrid = ({ entries, viewType = "student" }: TimetableGridProps) => {
  // Group entries by day and sort by start time
  const groupedByDay = days.map((_, dayIndex) => {
    return entries
      .filter((entry) => entry.day_of_week === dayIndex + 1)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // Get unique time slots
  const timeSlots = Array.from(
    new Set(entries.map((e) => `${e.start_time}-${e.end_time}`))
  ).sort();

  return (
    <div className="space-y-4">
      {/* Desktop Grid View */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-7 gap-2">
            {/* Header */}
            <div className="font-semibold text-sm p-2 bg-muted rounded-md">Time</div>
            {days.map((day) => (
              <div key={day} className="font-semibold text-sm p-2 bg-muted rounded-md text-center">
                {day}
              </div>
            ))}

            {/* Time slots */}
            {timeSlots.map((slot) => {
              const [start, end] = slot.split("-");
              return (
                <div key={slot} className="contents">
                  <div className="text-xs p-2 flex items-center justify-center bg-muted/50 rounded-md">
                    <Clock className="h-3 w-3 mr-1" />
                    {start} - {end}
                  </div>
                  {days.map((_, dayIndex) => {
                    const entry = groupedByDay[dayIndex].find(
                      (e) => `${e.start_time}-${e.end_time}` === slot
                    );

                    if (!entry) {
                      return <div key={dayIndex} className="border border-dashed border-muted rounded-md" />;
                    }

                    return (
                      <div
                        key={dayIndex}
                        className={`p-2 rounded-md border-2 ${getSubjectColor(
                          entry.subject?.name || ""
                        )}`}
                      >
                        <div className="text-xs font-semibold">{entry.subject?.name}</div>
                        {viewType !== "teacher" && entry.teacher && (
                          <div className="text-xs flex items-center gap-1 mt-1 opacity-80">
                            <User className="h-3 w-3" />
                            {entry.teacher.full_name}
                          </div>
                        )}
                        {entry.room_number && (
                          <div className="text-xs flex items-center gap-1 mt-1 opacity-80">
                            <MapPin className="h-3 w-3" />
                            {entry.room_number}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {days.map((day, dayIndex) => {
          const dayEntries = groupedByDay[dayIndex];
          if (dayEntries.length === 0) return null;

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-md border-2 ${getSubjectColor(
                      entry.subject?.name || ""
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{entry.subject?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.start_time} - {entry.end_time}
                      </Badge>
                    </div>
                    {viewType !== "teacher" && entry.teacher && (
                      <div className="text-sm flex items-center gap-1 opacity-80">
                        <User className="h-3 w-3" />
                        {entry.teacher.full_name}
                      </div>
                    )}
                    {entry.room_number && (
                      <div className="text-sm flex items-center gap-1 mt-1 opacity-80">
                        <MapPin className="h-3 w-3" />
                        Room {entry.room_number}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
