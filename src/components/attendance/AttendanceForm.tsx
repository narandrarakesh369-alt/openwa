import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, AlertCircle, User } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "half_day";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
}

interface AttendanceRecord {
  status: AttendanceStatus;
  reason?: string;
}

interface AttendanceFormProps {
  students: Student[];
  classInfo: { name: string; section: string | null };
  isLocked: boolean;
  userRole: "teacher" | "school_admin";
  onSubmit: (attendance: Record<string, AttendanceRecord>) => Promise<void>;
  onModify?: () => void;
  initialAttendance?: Record<string, AttendanceRecord>;
}

export const AttendanceForm = ({ 
  students, 
  classInfo, 
  isLocked, 
  userRole,
  onSubmit,
  onModify,
  initialAttendance = {}
}: AttendanceFormProps) => {
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>(initialAttendance);
  const [isModifying, setIsModifying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reasonDialog, setReasonDialog] = useState<{ open: boolean; studentId: string; status: AttendanceStatus }>({
    open: false,
    studentId: "",
    status: "absent"
  });
  const [reasonText, setReasonText] = useState("");

  const today = new Date().toLocaleDateString("en-GB");
  
  const allStudentsMarked = students.every(student => attendance[student.id]);
  const canEdit = !isLocked || (isModifying && userRole === "school_admin");

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!canEdit) return;
    
    // For absent, late, or half_day, optionally ask for reason
    if (status === "absent" || status === "late" || status === "half_day") {
      setReasonDialog({ open: true, studentId, status });
      setReasonText(attendance[studentId]?.reason || "");
    } else {
      setAttendance(prev => ({ ...prev, [studentId]: { status } }));
    }
  };

  const handleReasonSubmit = () => {
    setAttendance(prev => ({
      ...prev,
      [reasonDialog.studentId]: {
        status: reasonDialog.status,
        reason: reasonText || undefined
      }
    }));
    setReasonDialog({ open: false, studentId: "", status: "absent" });
    setReasonText("");
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!canEdit) return;
    const newAttendance: Record<string, AttendanceRecord> = {};
    students.forEach(student => {
      newAttendance[student.id] = { status };
    });
    setAttendance(newAttendance);
  };

  const handleSubmitClick = () => {
    if (!allStudentsMarked) return;
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(attendance);
      setShowConfirm(false);
      if (isModifying) setIsModifying(false);
    } catch (error) {
      console.error("Error submitting attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModifyClick = () => {
    setIsModifying(true);
    if (onModify) onModify();
  };

  const handleCancelModify = () => {
    setIsModifying(false);
    setAttendance(initialAttendance);
  };

  const getStatusButton = (studentId: string, status: AttendanceStatus, icon: React.ReactNode, label: string, colorClass: string) => {
    const isSelected = attendance[studentId]?.status === status;
    return (
      <Button
        size="sm"
        onClick={() => handleStatusChange(studentId, status)}
        disabled={!canEdit || loading}
        className={`h-9 px-3 transition-all ${
          isSelected
            ? `${colorClass} border-2 shadow-sm`
            : `${colorClass}/70 hover:${colorClass}/90`
        } ${!canEdit ? "opacity-50" : ""}`}
      >
        {icon}
        <span className="ml-1 hidden sm:inline">{label}</span>
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {classInfo.name} {classInfo.section && `- ${classInfo.section}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Attendance • {today}</p>
        </div>
        {isModifying && (
          <Badge className="bg-warning text-warning-foreground">
            Modifying existing attendance
          </Badge>
        )}
      </div>

      {/* Mark All Buttons */}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleMarkAll("present")}
            className="bg-success text-success-foreground hover:bg-success/90"
            disabled={loading}
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            All Present
          </Button>
          <Button
            onClick={() => handleMarkAll("absent")}
            className="bg-danger text-danger-foreground hover:bg-danger/90"
            disabled={loading}
            size="sm"
          >
            <XCircle className="h-4 w-4 mr-1" />
            All Absent
          </Button>
        </div>
      )}

      {/* Students List */}
      <div className="space-y-2.5">
        {students.map((student) => (
          <Card 
            key={student.id} 
            className="p-3.5 border border-border glass-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.photo_url || undefined} alt={`${student.first_name} ${student.last_name}`} />
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {student.first_name} {student.last_name}
                  </span>
                  {attendance[student.id]?.reason && (
                    <Badge variant="outline" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {attendance[student.id].reason}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {getStatusButton(student.id, "present", <CheckCircle className="h-4 w-4" />, "Present", "bg-success text-success-foreground")}
                {getStatusButton(student.id, "absent", <XCircle className="h-4 w-4" />, "Absent", "bg-danger text-danger-foreground")}
                {getStatusButton(student.id, "late", <Clock className="h-4 w-4" />, "Late", "bg-warning text-warning-foreground")}
                {getStatusButton(student.id, "half_day", <AlertCircle className="h-4 w-4" />, "Half", "bg-accent text-accent-foreground")}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-background pt-4 pb-2">
        {!isLocked ? (
          <Button
            onClick={handleSubmitClick}
            disabled={!allStudentsMarked || loading}
            className={`w-full h-12 text-base ${
              allStudentsMarked 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                : "bg-disabled text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? "Submitting..." : "Submit Attendance"}
          </Button>
        ) : !isModifying ? (
          <div className="space-y-3">
            <Button
              disabled
              className="w-full h-12 text-base bg-disabled text-muted-foreground"
            >
              Attendance Submitted
            </Button>
            {userRole === "school_admin" && (
              <Button
                onClick={handleModifyClick}
                className="w-full h-12 text-base bg-warning text-warning-foreground hover:bg-warning/90"
              >
                Modify Attendance
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              onClick={handleCancelModify}
              variant="outline"
              className="flex-1 h-12 text-base"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={!allStudentsMarked || loading}
              className={`flex-1 h-12 text-base ${
                allStudentsMarked 
                  ? "bg-warning text-warning-foreground hover:bg-warning/90" 
                  : "bg-disabled text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Reason Dialog */}
      <Dialog open={reasonDialog.open} onOpenChange={(open) => !open && setReasonDialog({ open: false, studentId: "", status: "absent" })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Add Reason (Optional)</DialogTitle>
            <DialogDescription>
              Provide a reason for marking as {reasonDialog.status.replace("_", " ")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="e.g., Medical leave, Family emergency..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAttendance(prev => ({
                ...prev,
                [reasonDialog.studentId]: { status: reasonDialog.status }
              }));
              setReasonDialog({ open: false, studentId: "", status: "absent" });
              setReasonText("");
            }}>
              Skip
            </Button>
            <Button onClick={handleReasonSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isModifying ? "Confirm Update" : "Confirm Submission"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isModifying 
                ? "Are you sure you want to save changes? This will update the attendance and send WhatsApp notifications to newly absent students."
                : "Once submitted, attendance cannot be changed by teachers. School Admin can modify with proper authorization. Proceed?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSubmit}
              disabled={loading}
              className={isModifying ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
            >
              {loading ? "Processing..." : isModifying ? "Yes, Save" : "Submit and Notify Parents"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
