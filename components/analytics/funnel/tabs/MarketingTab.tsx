"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Loader2, Users, Plus, Pencil, Trash2, CalendarIcon, Target, Megaphone, XCircle } from "lucide-react"
import {
  getChannelLabel,
  type MarketingActivity,
  type MarketingStatus,
  type MarketingActivityParticipant,
} from "@/services/marketing-service"

interface StudentOption {
  id: string
  name: string
  school_type: string | null
  grade: number | null
  status: string
}

interface MarketingTabProps {
  // 마케팅 활동 데이터
  marketingActivities: MarketingActivity[]
  filteredActivities: MarketingActivity[]
  selectedActivityId: string | null
  selectedActivity: MarketingActivity | undefined
  activityStatusFilter: MarketingStatus | "all"
  activityCountByStatus: {
    all: number
    planned: number
    in_progress: number
    completed: number
    cancelled: number
  }

  // 참가자 데이터
  participants: MarketingActivityParticipant[]
  loadingParticipants: boolean
  filteredStudents: StudentOption[]

  // 입력 상태
  studentSearchQuery: string
  selectedStudentIds: string[]
  participatedDate: Date
  savingParticipants: boolean

  // 핸들러들
  onStatusFilterChange: (status: MarketingStatus | "all") => void
  onSelectActivity: (activityId: string) => void
  onOpenCreateModal: () => void
  onOpenEditModal: (activity: MarketingActivity) => void
  onDeleteActivity: (activityId: string) => void
  onStudentSearchChange: (query: string) => void
  onSelectedStudentIdsChange: (ids: string[]) => void
  onParticipatedDateChange: (date: Date) => void
  onAddParticipants: () => void
  onRemoveParticipant: (participantId: string) => void
}

export function MarketingTab({
  marketingActivities,
  filteredActivities,
  selectedActivityId,
  selectedActivity,
  activityStatusFilter,
  activityCountByStatus,
  participants,
  loadingParticipants,
  filteredStudents,
  studentSearchQuery,
  selectedStudentIds,
  participatedDate,
  savingParticipants,
  onStatusFilterChange,
  onSelectActivity,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteActivity,
  onStudentSearchChange,
  onSelectedStudentIdsChange,
  onParticipatedDateChange,
  onAddParticipants,
  onRemoveParticipant,
}: MarketingTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 왼쪽: 마케팅 활동 목록 */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            마케팅 활동
          </h3>
          <Button onClick={onOpenCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            등록
          </Button>
        </div>

        {/* 상태 필터 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {(["all", "in_progress", "planned", "completed", "cancelled"] as const).map((status) => (
            <Button
              key={status}
              variant={activityStatusFilter === status ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatusFilterChange(status)}
            >
              {status === "all" ? "전체" : status === "in_progress" ? "진행중" : status === "planned" ? "예정" : status === "completed" ? "완료" : "취소"}
              <span className="ml-1 text-[10px] opacity-70">
                ({activityCountByStatus[status]})
              </span>
            </Button>
          ))}
        </div>

        {filteredActivities.length > 0 ? (
          <ScrollArea className="h-[360px]">
            <div className="space-y-2">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedActivityId === activity.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelectActivity(activity.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {getChannelLabel(activity.channel)}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-[10px]",
                            activity.status === "in_progress"
                              ? "bg-green-100 text-green-700"
                              : activity.status === "planned"
                              ? "bg-blue-100 text-blue-700"
                              : activity.status === "completed"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {activity.status === "in_progress" ? "진행중" : activity.status === "planned" ? "예정" : activity.status === "completed" ? "완료" : "취소"}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(activity.activity_date), "yyyy-MM-dd")}</span>
                        {activity.cost_amount && (
                          <span>{activity.cost_amount.toLocaleString()}원</span>
                        )}
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {activity.reach_count || 0}명
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenEditModal(activity)
                        }}
                        title="수정"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteActivity(activity.id)
                        }}
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Megaphone className="w-10 h-10 mb-3 opacity-50" />
            {marketingActivities.length === 0 ? (
              <>
                <p className="text-sm">등록된 마케팅 활동이 없습니다.</p>
                <Button onClick={onOpenCreateModal} variant="outline" size="sm" className="mt-3">
                  <Plus className="w-4 h-4 mr-1" />
                  첫 활동 등록하기
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm">해당 상태의 활동이 없습니다.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onStatusFilterChange("all")}
                >
                  전체 보기
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 참가자 관리 */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            참가자 관리
          </h3>
          {selectedActivity && (
            <Badge variant="secondary">{selectedActivity.title}</Badge>
          )}
        </div>

        {selectedActivityId ? (
          loadingParticipants ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 참가자 추가 영역 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">학생 추가</Label>

                {/* 참가 일자 선택 */}
                <div className="flex gap-2 items-center">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">참가일:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-sm justify-start"
                      >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {format(participatedDate, "yyyy-MM-dd", { locale: ko })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={participatedDate}
                        onSelect={(date) => date && onParticipatedDateChange(date)}
                        locale={ko}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="학생 이름 검색..."
                    value={studentSearchQuery}
                    onChange={(e) => onStudentSearchChange(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={onAddParticipants}
                    disabled={selectedStudentIds.length === 0 || savingParticipants}
                    className="h-8"
                  >
                    {savingParticipants ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        추가 ({selectedStudentIds.length})
                      </>
                    )}
                  </Button>
                </div>

                {/* 학생 선택 목록 */}
                {studentSearchQuery && (
                  <ScrollArea className="h-[120px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.slice(0, 20).map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudentIds.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onSelectedStudentIdsChange([...selectedStudentIds, student.id])
                                } else {
                                  onSelectedStudentIdsChange(selectedStudentIds.filter(id => id !== student.id))
                                }
                              }}
                            />
                            <label
                              htmlFor={`student-${student.id}`}
                              className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                            >
                              <span>{student.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {student.school_type} {student.grade}학년
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-4",
                                  student.status === "재원" && "bg-green-50 text-green-700 border-green-200",
                                  student.status === "퇴원" && "bg-gray-50 text-gray-500 border-gray-200",
                                  student.status === "휴원" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                                  student.status === "신규상담" && "bg-blue-50 text-blue-700 border-blue-200"
                                )}
                              >
                                {student.status}
                              </Badge>
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          검색 결과가 없습니다.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* 현재 참가자 목록 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  현재 참가자 ({participants.length}명)
                </Label>
                <ScrollArea className="h-[200px] border rounded-md">
                  {participants.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {p.student?.name || "알 수 없음"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {p.student?.school_type} {p.student?.grade}학년
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-4",
                                  p.student?.status === "재원" && "bg-green-50 text-green-700 border-green-200",
                                  p.student?.status === "퇴원" && "bg-gray-50 text-gray-500 border-gray-200",
                                  p.student?.status === "휴원" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                                  p.student?.status === "신규상담" && "bg-blue-50 text-blue-700 border-blue-200"
                                )}
                              >
                                {p.student?.status}
                              </Badge>
                            </div>
                            {p.participated_at && (
                              <span className="text-[10px] text-muted-foreground ml-5">
                                참가일: {p.participated_at}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onRemoveParticipant(p.id)}
                            title="삭제"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">등록된 참가자가 없습니다.</p>
                      <p className="text-xs mt-1">위에서 학생을 검색하여 추가하세요.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Target className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">왼쪽에서 마케팅 활동을 선택하세요.</p>
            <p className="text-xs mt-1">선택한 활동의 참가자를 관리할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
