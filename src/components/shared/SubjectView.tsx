import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User } from "lucide-react";

interface SubjectViewProps {
  subjects: any[];
  showTeacher?: boolean;
  showClass?: boolean;
}

const subjectColors = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-green-100 text-green-800 border-green-300",
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "bg-orange-100 text-orange-800 border-orange-300",
  "bg-pink-100 text-pink-800 border-pink-300",
  "bg-indigo-100 text-indigo-800 border-indigo-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
];

export const SubjectView = ({ subjects, showTeacher = true, showClass = false }: SubjectViewProps) => {
  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No subjects found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((subject, index) => (
        <Card key={subject.id} className={`border-2 ${subjectColors[index % subjectColors.length]}`}>
          <CardHeader>
            <CardTitle className="text-lg">{subject.name}</CardTitle>
            {subject.subject_code && (
              <Badge variant="outline" className="w-fit">
                {subject.subject_code}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {subject.description && (
              <p className="text-sm text-muted-foreground">{subject.description}</p>
            )}
            {showClass && subject.class && (
              <div className="text-sm">
                <strong>Class:</strong> {subject.class.name} {subject.class.section || ""}
              </div>
            )}
            {showTeacher && subject.teacher && (
              <div className="text-sm flex items-center gap-1">
                <User className="h-3 w-3" />
                <strong>Teacher:</strong> {subject.teacher.full_name}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
