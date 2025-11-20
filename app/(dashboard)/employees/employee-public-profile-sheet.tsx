"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { Employee } from "@/types/employee"
import { updateEmployee } from "@/services/employee-service"

interface EmployeePublicProfileSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employee: Employee | null
    onSuccess: () => void
}

export function EmployeePublicProfileSheet({
    open,
    onOpenChange,
    employee,
    onSuccess,
}: EmployeePublicProfileSheetProps) {
    const [isPublic, setIsPublic] = useState(false)
    const [subjects, setSubjects] = useState<string[]>([])
    const [subjectInput, setSubjectInput] = useState("")
    const [philosophy, setPhilosophy] = useState("")
    const [experience, setExperience] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (employee) {
            setIsPublic(employee.is_public || false)
            setSubjects(employee.subjects || [])
            setPhilosophy(employee.philosophy || "")
            setExperience(employee.experience || "")
        }
    }, [employee])

    const handleAddSubject = () => {
        if (subjectInput.trim() && !subjects.includes(subjectInput.trim())) {
            setSubjects([...subjects, subjectInput.trim()])
            setSubjectInput("")
        }
    }

    const handleRemoveSubject = (subjectToRemove: string) => {
        setSubjects(subjects.filter((s) => s !== subjectToRemove))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleAddSubject()
        }
    }

    const handleSave = async () => {
        if (!employee) return

        setIsSaving(true)
        try {
            const result = await updateEmployee(employee.id, {
                is_public: isPublic,
                subjects,
                philosophy,
                experience,
            })

            if (result.error) {
                throw result.error
            }

            toast({
                title: "프로필 저장 완료",
                description: "공개 프로필 정보가 성공적으로 저장되었습니다.",
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving profile:", error)
            toast({
                title: "저장 실패",
                description: "프로필 저장 중 오류가 발생했습니다.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>공개 프로필 설정</SheetTitle>
                    <SheetDescription>
                        홈페이지 '강사진 소개' 섹션에 표시될 정보를 설정합니다.
                    </SheetDescription>
                </SheetHeader>

                <div className="grid gap-6 py-6">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="public-mode" className="flex flex-col space-y-1">
                            <span>공개 설정</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                활성화하면 홈페이지에 이 직원의 프로필이 표시됩니다.
                            </span>
                        </Label>
                        <Switch id="public-mode" checked={isPublic} onCheckedChange={setIsPublic} />
                    </div>

                    <div className="space-y-2">
                        <Label>담당 과목</Label>
                        <div className="flex gap-2">
                            <Input
                                value={subjectInput}
                                onChange={(e) => setSubjectInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="과목 입력 (예: 고등수학, 수리논술)"
                            />
                            <Button type="button" onClick={handleAddSubject} variant="secondary">
                                추가
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {subjects.map((subject) => (
                                <Badge key={subject} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                    {subject}
                                    <button
                                        onClick={() => handleRemoveSubject(subject)}
                                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                        <span className="sr-only">삭제</span>
                                    </button>
                                </Badge>
                            ))}
                            {subjects.length === 0 && (
                                <span className="text-sm text-muted-foreground">등록된 과목이 없습니다.</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="experience">경력 요약</Label>
                        <Textarea
                            id="experience"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="주요 경력을 입력하세요. (예: 15년 경력, 전 OO고 교사)"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="philosophy">교육 철학 / 소개</Label>
                        <Textarea
                            id="philosophy"
                            value={philosophy}
                            onChange={(e) => setPhilosophy(e.target.value)}
                            placeholder="교육 철학이나 학생들에게 전하고 싶은 말을 입력하세요."
                            rows={5}
                        />
                    </div>
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "저장 중..." : "저장하기"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
