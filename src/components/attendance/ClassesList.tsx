import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

interface Class {
  id: string;
  name: string;
  section: string | null;
  student_count?: number;
  attendance_status?: "pending" | "completed";
}

interface ClassesListProps {
  classes: Class[];
  onClassSelect: (classId: string) => void;
  userRole: "teacher" | "school_admin";
}

export const ClassesList = ({ classes, onClassSelect, userRole }: ClassesListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((cls) => (
        <Card key={cls.id} className="p-5 hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {cls.name} {cls.section && `- ${cls.section}`}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{cls.student_count || 0} Students</span>
                </div>
              </div>
              {cls.attendance_status && (
                <Badge 
                  variant={cls.attendance_status === "completed" ? "default" : "destructive"}
                  className={cls.attendance_status === "completed" 
                    ? "bg-success text-success-foreground" 
                    : "bg-danger text-danger-foreground"
                  }
                >
                  {cls.attendance_status === "completed" ? "Completed" : "Pending"}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => onClassSelect(cls.id)}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Take Attendance
              </Button>
              
              {userRole === "school_admin" && cls.attendance_status === "completed" && (
                <Button 
                  variant="outline"
                  onClick={() => onClassSelect(cls.id)}
                  className="flex-1 border-warning text-warning hover:bg-warning/10"
                >
                  Modify
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
