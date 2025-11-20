"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GraduationCap, BookOpen, Lightbulb, Award, Users, Star, ChevronRight } from "lucide-react"
import { TeachersAnimation } from "./teachers-animation"
import type { Database } from "@/types/database"

type Teacher = Database["public"]["Tables"]["employees"]["Row"]

interface TeacherCardProps {
    teacher: Teacher
    index: number
}

function getIcon(index: number) {
    const icons = [GraduationCap, Award, BookOpen, Users, Lightbulb, Star]
    return icons[index % icons.length]
}

function getColor(index: number) {
    const colors = [
        "from-blue-500 to-indigo-600",
        "from-green-500 to-emerald-600",
        "from-purple-500 to-pink-600",
        "from-orange-500 to-red-600",
        "from-pink-500 to-rose-600",
        "from-indigo-500 to-purple-600",
    ]
    return colors[index % colors.length]
}

export function TeacherCard({ teacher, index }: TeacherCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const Icon = getIcon(index)
    const color = getColor(index)

    return (
        <TeachersAnimation delay={index * 0.1}>
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg group flex flex-col">
                <div className={`bg-gradient-to-r ${color} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
                        <Icon className="w-full h-full" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-2">
                            <Icon className="w-6 h-6" />
                            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                                {teacher.department || "수학관"}
                            </Badge>
                        </div>
                        <h3 className="text-xl font-bold mb-1">
                            {teacher.name} {teacher.position}
                        </h3>
                        <p className="text-white/80 text-sm">{teacher.experience || "수학 교육 전문가"}</p>
                    </div>
                </div>

                <CardContent className="p-6 space-y-4 flex-grow flex flex-col">
                    {/* 담당 과목 */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">담당 과목</h4>
                        <div className="flex flex-wrap gap-1">
                            {teacher.subjects?.map((subject: string) => (
                                <Badge key={subject} variant="outline" className="text-xs py-0.5 px-2">
                                    {subject}
                                </Badge>
                            )) || (
                                    <Badge variant="outline" className="text-xs py-0.5 px-2">
                                        수학 전 과정
                                    </Badge>
                                )}
                        </div>
                    </div>

                    {/* 교육 철학 (요약) */}
                    <div className="flex-grow">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">교육 철학</h4>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                            {teacher.philosophy || "학생 중심의 맞춤형 교육을 지향합니다."}
                        </p>
                    </div>

                    {/* 더보기 버튼 (모달 트리거) */}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 group/btn">
                                자세히 보기 <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-full bg-gradient-to-r ${color} text-white`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl">
                                            {teacher.name} {teacher.position}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {teacher.department} | {teacher.experience}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <ScrollArea className="flex-grow pr-4 mt-4">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-blue-500" /> 담당 과목
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {teacher.subjects?.map((subject: string) => (
                                                <Badge key={subject} variant="secondary">
                                                    {subject}
                                                </Badge>
                                            )) || "수학 전 과정"}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-500" /> 교육 철학 및 소개
                                        </h4>
                                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                                            {teacher.philosophy || "등록된 교육 철학이 없습니다."}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </TeachersAnimation>
    )
}
