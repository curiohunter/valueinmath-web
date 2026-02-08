'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Pencil, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AcademyClosure, ClosureType } from '@/types/closure'
import {
  CLOSURE_TYPE_LABELS,
  CLOSURE_TYPE_COLORS,
  CLOSURE_TYPE_DOT_COLORS,
} from '@/types/closure'
import {
  getClosures,
  createClosures,
  updateClosure,
  deleteClosure,
} from '@/services/closure-service'

interface ClassItem {
  id: string
  name: string
  teacher_id: string | null
}

interface EmployeeItem {
  id: string
  name: string
}

interface ClosureSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosuresChanged?: () => void
}

export default function ClosureSheet({
  open,
  onOpenChange,
  onClosuresChanged,
}: ClosureSheetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [closures, setClosures] = useState<AcademyClosure[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [closureType, setClosureType] = useState<ClosureType>('global')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState('')
  const [editIsEmergency, setEditIsEmergency] = useState(false)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  const loadClosures = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getClosures(year, month)
      setClosures(data)
    } catch (error) {
      console.error('Failed to load closures:', error)
      toast.error('휴원일 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  const loadMasterData = useCallback(async () => {
    const supabase = createClient()
    const [classesRes, employeesRes] = await Promise.all([
      supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('employees')
        .select('id, name')
        .eq('status', '재직')
        .order('name'),
    ])
    if (classesRes.data) setClasses(classesRes.data)
    if (employeesRes.data) setEmployees(employeesRes.data)
  }, [])

  useEffect(() => {
    if (open) {
      loadClosures()
      loadMasterData()
    }
  }, [open, loadClosures, loadMasterData])

  const resetForm = () => {
    setSelectedDates([])
    setClosureType('global')
    setSelectedClassIds([])
    setSelectedTeacherId('')
    setReason('')
    setIsEmergency(false)
  }

  const handleSubmit = async () => {
    if (selectedDates.length === 0) {
      toast.error('날짜를 선택해주세요.')
      return
    }
    if (closureType === 'class' && selectedClassIds.length === 0) {
      toast.error('반을 선택해주세요.')
      return
    }
    if (closureType === 'teacher' && !selectedTeacherId) {
      toast.error('선생님을 선택해주세요.')
      return
    }

    try {
      setSubmitting(true)
      const dates = selectedDates.map((d) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      })

      const classNames: Record<string, string> = {}
      for (const cls of classes) {
        classNames[cls.id] = cls.name
      }
      const teacherName = employees.find(
        (e) => e.id === selectedTeacherId
      )?.name

      await createClosures(
        {
          closure_type: closureType,
          dates,
          class_ids:
            closureType === 'class' ? selectedClassIds : undefined,
          teacher_id:
            closureType === 'teacher' ? selectedTeacherId : undefined,
          reason: reason || undefined,
          is_emergency: isEmergency,
        },
        classNames,
        teacherName
      )

      toast.success(`${dates.length}개 휴원일이 추가되었습니다.`)
      resetForm()
      await loadClosures()
      onClosuresChanged?.()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '휴원일 추가에 실패했습니다.'
      if (message.includes('unique') || message.includes('duplicate')) {
        toast.error('이미 등록된 휴원일이 있습니다.')
      } else {
        toast.error(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteClosure(id)
      toast.success('휴원일이 삭제되었습니다.')
      await loadClosures()
      onClosuresChanged?.()
    } catch (error) {
      console.error('Failed to delete closure:', error)
      toast.error('휴원일 삭제에 실패했습니다.')
    }
  }

  const handleEditSave = async (id: string) => {
    try {
      await updateClosure(id, {
        reason: editReason || undefined,
        is_emergency: editIsEmergency,
      })
      toast.success('휴원일이 수정되었습니다.')
      setEditingId(null)
      await loadClosures()
      onClosuresChanged?.()
    } catch (error) {
      console.error('Failed to update closure:', error)
      toast.error('휴원일 수정에 실패했습니다.')
    }
  }

  const startEdit = (closure: AcademyClosure) => {
    setEditingId(closure.id)
    setEditReason(closure.reason || '')
    setEditIsEmergency(closure.is_emergency)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00+09:00')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`
  }

  const closureDateSet = new Set(closures.map((c) => c.closure_date))

  const getClosureTypesForDate = (dateStr: string) => {
    return closures
      .filter((c) => c.closure_date === dateStr)
      .map((c) => c.closure_type)
  }

  const handleToggleClassId = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    )
  }

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>휴원일 관리</SheetTitle>
          <SheetDescription>
            날짜를 선택하고 휴원 유형을 지정하세요.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Calendar with custom month nav */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {year}년 {month}월
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{
                closure: (date) => {
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                  return closureDateSet.has(dateStr)
                },
              }}
              modifiersStyles={{
                closure: {
                  backgroundColor: 'rgb(254 226 226)',
                  borderRadius: '50%',
                },
              }}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                전체
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
                반별
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                선생님
              </span>
            </div>
          </div>

          {/* Add Form - shows when dates are selected */}
          {selectedDates.length > 0 && (
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">선택된 날짜</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date) => {
                      const days = ['일', '월', '화', '수', '목', '금', '토']
                      return (
                        <Badge key={date.toISOString()} variant="secondary">
                          {date.getMonth() + 1}/{date.getDate()}(
                          {days[date.getDay()]})
                        </Badge>
                      )
                    })}
                </div>
              </div>

              {/* Closure Type */}
              <div>
                <Label className="text-sm font-medium">유형</Label>
                <RadioGroup
                  value={closureType}
                  onValueChange={(v) => setClosureType(v as ClosureType)}
                  className="flex gap-4 mt-1"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="global" id="type-global" />
                    <Label htmlFor="type-global" className="text-sm cursor-pointer">
                      전체
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="class" id="type-class" />
                    <Label htmlFor="type-class" className="text-sm cursor-pointer">
                      반별
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="teacher" id="type-teacher" />
                    <Label htmlFor="type-teacher" className="text-sm cursor-pointer">
                      선생님
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Class selection (for class type) */}
              {closureType === 'class' && (
                <div>
                  <Label className="text-sm font-medium">반 선택</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto">
                    {classes.map((cls) => (
                      <label
                        key={cls.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedClassIds.includes(cls.id)}
                          onCheckedChange={() => handleToggleClassId(cls.id)}
                        />
                        {cls.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher selection (for teacher type) */}
              {closureType === 'teacher' && (
                <div>
                  <Label className="text-sm font-medium">선생님</Label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="선생님 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reason */}
              <div>
                <Label className="text-sm font-medium">사유</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 설날, 병결, 보강 없음"
                  className="mt-1"
                />
              </div>

              {/* Emergency */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={isEmergency}
                  onCheckedChange={(v) => setIsEmergency(v === true)}
                />
                긴급 휴원
              </label>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? '추가 중...' : '추가'}
              </Button>
            </div>
          )}

          {/* Closure list for current month */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              {month}월 휴원일 목록
              {loading && (
                <span className="ml-2 text-muted-foreground">불러오는 중...</span>
              )}
            </h3>

            {closures.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                등록된 휴원일이 없습니다.
              </p>
            )}

            <div className="space-y-2">
              {closures.map((closure) => {
                const isEditing = editingId === closure.id

                return (
                  <div
                    key={closure.id}
                    className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span
                      className={`mt-1.5 inline-block w-2 h-2 rounded-full shrink-0 ${CLOSURE_TYPE_DOT_COLORS[closure.closure_type]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatDate(closure.closure_date)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${CLOSURE_TYPE_COLORS[closure.closure_type]}`}
                        >
                          {CLOSURE_TYPE_LABELS[closure.closure_type]}
                        </Badge>
                        {closure.is_emergency && (
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {closure.closure_type === 'class' &&
                          closure.classes?.name && (
                            <span>{closure.classes.name}</span>
                          )}
                        {closure.closure_type === 'teacher' &&
                          closure.employees?.name && (
                            <span>{closure.employees.name} 선생님</span>
                          )}
                        {closure.reason && (
                          <span>
                            {(closure.closure_type === 'class' ||
                              closure.closure_type === 'teacher') &&
                              ' - '}
                            {closure.reason}
                          </span>
                        )}
                      </div>

                      {/* Edit form inline */}
                      {isEditing && (
                        <div className="mt-2 space-y-2">
                          <Input
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="사유"
                            className="h-8 text-sm"
                          />
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox
                                checked={editIsEmergency}
                                onCheckedChange={(v) =>
                                  setEditIsEmergency(v === true)
                                }
                              />
                              긴급 휴원
                            </label>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                className="h-7 text-xs"
                              >
                                취소
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditSave(closure.id)}
                                className="h-7 text-xs"
                              >
                                저장
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(closure)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(closure.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
