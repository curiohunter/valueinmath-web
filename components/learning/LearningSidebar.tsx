import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Users, ChevronRight, ChevronDown } from "lucide-react";
import type { Database } from "@/types/database";

type Class = Database["public"]["Tables"]["classes"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type AttendanceStatus = Database["public"]["Enums"]["attendance_status_enum"];

interface LearningSidebarProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  classes: Class[];
  students: Student[];
  classList: Array<{
    id: string;
    name: string;
    category: string;
    schedule: string | null;
    teacher: string | null;
    students: Array<{
      id: string;
      name: string;
      hasAttendance: boolean;
      status?: AttendanceStatus;
    }>;
  }>;
  expandedClasses: Set<string>;
  toggleClassExpansion: (classId: string) => void;
  selectedStudent: { studentId: string; classId: string } | null;
  setSelectedStudent: (student: { studentId: string; classId: string } | null) => void;
  onCreateClass: () => void;
}

export function LearningSidebar({
  date,
  setDate,
  classes,
  students,
  classList,
  expandedClasses,
  toggleClassExpansion,
  selectedStudent,
  setSelectedStudent,
  onCreateClass,
}: LearningSidebarProps) {
  const getAttendanceStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "출석":
        return "text-green-600";
      case "결석":
        return "text-red-600";
      case "지각":
        return "text-yellow-600";
      case "조퇴":
        return "text-orange-600";
      case "보강":
        return "text-blue-600";
      default:
        return "text-gray-400";
    }
  };

  const getAttendanceStatusEmoji = (status: AttendanceStatus) => {
    switch (status) {
      case "출석":
        return "✅";
      case "결석":
        return "❌";
      case "지각":
        return "⏰";
      case "조퇴":
        return "🚶";
      case "보강":
        return "📚";
      default:
        return "⭕";
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Picker Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">날짜 선택</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md"
          />
        </CardContent>
      </Card>

      {/* Create Class Button */}
      <Card>
        <CardContent className="p-3">
          <Button 
            className="w-full" 
            size="sm"
            onClick={onCreateClass}
          >
            <Plus className="h-4 w-4 mr-2" />
            수업 생성
          </Button>
        </CardContent>
      </Card>

      {/* Classes List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>반 목록</span>
            <span className="text-xs text-muted-foreground">
              {classList.length}개 반
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1">
          {classList.map((cls) => (
            <div key={cls.id} className="rounded-lg border bg-card">
              <button
                onClick={() => toggleClassExpansion(cls.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent rounded-t-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedClasses.has(cls.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">{cls.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({cls.students.length}명)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {cls.teacher && <span>{cls.teacher}</span>}
                  {cls.schedule && <span>{cls.schedule}</span>}
                </div>
              </button>
              
              {expandedClasses.has(cls.id) && (
                <div className="px-3 py-1 space-y-0.5 border-t">
                  {cls.students.length === 0 ? (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      등록된 학생이 없습니다
                    </div>
                  ) : (
                    cls.students.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent({ studentId: student.id, classId: cls.id })}
                        className={`w-full px-2 py-1.5 flex items-center justify-between rounded text-sm transition-colors ${
                          selectedStudent?.studentId === student.id && selectedStudent?.classId === cls.id
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {student.name}
                        </span>
                        {student.hasAttendance && student.status && (
                          <span className={`text-xs ${getAttendanceStatusColor(student.status)}`}>
                            {getAttendanceStatusEmoji(student.status)}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}