"use client";
import React, { useState, useEffect, useRef } from "react";
import LearningTabs from "@/components/LearningTabs";
import { BulkDatePicker } from "@/components/ui/bulk-date-picker";
import { ClassAccordion } from "@/components/ui/class-accordion";
import { ScoreDropdown } from "@/components/ui/score-dropdown";
import { ScoreLegendBox } from "@/components/ui/score-legend-box";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle, Trash2 } from "lucide-react";
import { ClassFormModal } from "@/app/(dashboard)/students/classes/class-form-modal";

const today = new Date().toISOString().slice(0, 10);

// 출결/숙제/집중도 string→숫자 매핑
const attendanceMap: Record<string, number> = {
  "결석": 1,
  "조퇴": 2,
  "30분내 등원": 3,
  "15분내 등원": 4,
  "수업시작전 등원": 5,
};
const homeworkMap: Record<string, number> = {
  "결석": 1,
  "보강필요": 2,
  "추가 추적 필요": 3,
  "90% 이상": 4,
  "100% 마무리": 5,
};
const focusMap: Record<string, number> = {
  "결석": 1,
  "조치필요": 2,
  "산만하나 진행가능": 3,
  "대체로 잘참여": 4,
  "매우 열의있음": 5,
};

export default function LearningPage() {
  // 입력 상태
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<
    Array<{
      classId: string;
      studentId: string;
      name: string;
      date: string;
      attendance: number;
      homework: number;
      focus: number;
      note: string;
      book1: string;
      book1log: string;
      book2: string;
      book2log: string;
    }>
  >([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [openClassIds, setOpenClassIds] = useState<string[]>([]);
  // 교재/진도 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIdx, setModalRowIdx] = useState<number | null>(null);
  const [modalField, setModalField] = useState<"book1" | "book1log" | "book2" | "book2log" | null>(null);
  const [modalValue, setModalValue] = useState("");
  const modalInputRef = useRef<HTMLInputElement>(null);
  
  // 반만들기 모달 상태
  const [classModalOpen, setClassModalOpen] = useState(false);
  
  // 반만들기 완료 후 데이터 새로고침
  const handleClassModalClose = () => {
    setClassModalOpen(false);
    // 데이터 새로고침
    fetchData();
  };
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: classData } = await supabaseClient.from("classes").select("id, name");
      const { data: classStudentData } = await supabaseClient.from("class_students").select("class_id, student_id");
      const { data: studentData } = await supabaseClient.from("students").select("id, name, status, grade, school_type");
      const { data: teacherData } = await supabaseClient.from("employees").select("id, name");
      setClasses(classData || []);
      setClassStudents(classStudentData || []);
      setStudents(studentData || []);
      setTeachers(teacherData || []);
      // 첫 반 자동 선택
      if (classData && classData.length > 0) setSelectedClassId(classData[0].id);
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (modalOpen && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [modalOpen]);

  // 반별 학생 목록 생성 함수 재사용
  const getClassStudents = (classId: string) => {
    const studentIds = classStudents.filter(cs => cs.class_id === classId).map(cs => cs.student_id);
    return students
      .filter(s => studentIds.includes(s.id) && s.status?.trim().includes("재원"))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  };

  // 반별 전체추가
  const handleAddAll = (classId: string) => {
    const classStudentList = getClassStudents(classId);
    setRows(prev => [
      ...prev,
      ...classStudentList
        .filter(s => !prev.some(r => r.studentId === s.id && r.classId === classId))
        .map(s => ({
          classId,
          studentId: s.id,
          name: s.name,
          date,
          attendance: 5,
          homework: 5,
          focus: 5,
          note: "",
          book1: "",
          book1log: "",
          book2: "",
          book2log: "",
        })),
    ]);
  };

  // 학생별 추가
  const handleAddStudent = (classId: string, student: { id: string; name: string }) => {
    setRows(prev =>
      prev.some(r => r.studentId === student.id && r.classId === classId)
        ? prev
        : [
            ...prev,
            {
              classId,
              studentId: student.id,
              name: student.name,
              date,
              attendance: 5,
              homework: 5,
              focus: 5,
              note: "",
              book1: "",
              book1log: "",
              book2: "",
              book2log: "",
            },
          ]
    );
  };

  // 날짜 일괄 적용
  const handleApplyAllDate = () => {
    setRows(prev => prev.map(r => ({ ...r, date })));
  };

  // 표 입력 변경
  const handleChange = (idx: number, key: keyof (typeof rows)[number], value: any) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  // 저장 버튼 클릭
  const handleSave = async () => {
    if (rows.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }
    try {
      const { error } = await supabaseClient
        .from("study_logs")
        .upsert(
          rows.map(r => ({
            class_id: r.classId || null,
            student_id: r.studentId,
            date: r.date,
            attendance_status: typeof r.attendance === "number" ? r.attendance : attendanceMap[r.attendance],
            homework: typeof r.homework === "number" ? r.homework : homeworkMap[r.homework],
            focus: typeof r.focus === "number" ? r.focus : focusMap[r.focus],
            book1: r.book1,
            book1log: r.book1log,
            book2: r.book2,
            book2log: r.book2log,
            note: r.note,
          })),
          { onConflict: "student_id,date" }
        );
      if (error) throw error;
      alert("저장되었습니다.");
      // setRows([]); // 저장 후 초기화 원할 경우 주석 해제
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const toggleClassAccordion = (classId: string) => {
    setOpenClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  // 교재/진도 일괄 적용 함수
  const handleBulkApply = (key: "book1" | "book1log" | "book2" | "book2log") => {
    setRows(prev => {
      if (prev.length === 0) return prev;
      const firstValue = prev[0][key];
      return prev.map((r, i) => i === 0 ? r : { ...r, [key]: firstValue });
    });
  };

  const openModal = (idx: number, field: "book1" | "book1log" | "book2" | "book2log", value: string) => {
    setModalOpen(true);
    setModalRowIdx(idx);
    setModalField(field);
    setModalValue(value);
  };
  const handleModalSave = () => {
    if (modalRowIdx !== null && modalField) {
      setRows(prev => prev.map((r, i) =>
        i === modalRowIdx ? { ...r, [modalField]: modalValue } : r
      ));
    }
    setModalOpen(false);
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );
  if (error) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">⚠️</div>
      <div className="text-red-500">{error}</div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <LearningTabs />
        <div className="flex gap-6">
          {/* 왼쪽: 날짜/일괄적용 + 반별 아코디언 (축소, 스타일 통일) */}
          <div className="w-52 max-h-[600px] flex-shrink-0 bg-white rounded-xl shadow p-2 overflow-y-auto">
            <div className="space-y-2 mb-2">
              <input
                type="date"
                className="input input-bordered w-full text-sm px-2 py-1"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <Button
                size="sm"
                variant="default"
                className="w-full text-sm"
                onClick={() => setClassModalOpen(true)}
              >
                반 만들기
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {classes.map(cls => {
                const classStudentList = getClassStudents(cls.id);
                const addedStudentIds = rows.filter(r => r.classId === cls.id).map(r => r.studentId);
                const isOpen = openClassIds.includes(cls.id);
                return (
                  <div key={cls.id} className="bg-gray-50 rounded-lg border px-2 py-2">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleClassAccordion(cls.id)}>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{cls.name}</span>
                        <span className="text-gray-400 text-xs">{classStudentList.length}명</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-6 h-6 p-0 flex items-center justify-center"
                          onClick={e => { e.stopPropagation(); handleAddAll(cls.id); }}
                        >
                          <span className="text-lg text-blue-400">+</span>
                        </Button>
                        <span className="text-base">{isOpen ? "▾" : "▸"}</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="pl-1 mt-2 space-y-1">
                        {classStudentList
                          .filter(s => !addedStudentIds.includes(s.id))
                          .map(s => (
                            <div key={s.id} className="flex items-center justify-between py-0.5">
                              <span className="text-sm">{s.name}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-6 h-6 p-0 flex items-center justify-center"
                                onClick={() => handleAddStudent(cls.id, s)}
                              >
                                <span className="text-lg text-blue-400">+</span>
                              </Button>
                            </div>
                          ))}
                        {classStudentList.filter(s => !addedStudentIds.includes(s.id)).length === 0 && (
                          <span className="text-xs text-gray-400">추가할 학생 없음</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* 오른쪽: 표 + 저장 버튼 */}
          <div className="flex-1">
            <div className="w-full max-w-[1200px] mx-auto">
              <div className="bg-white rounded-lg shadow border overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="min-w-[80px] w-[8%] px-2 py-2 text-left font-medium text-gray-700">반</th>
                      <th className="min-w-[80px] w-[8%] px-2 py-2 text-left font-medium text-gray-700">학생</th>
                      <th className="min-w-[100px] w-[10%] px-2 py-2 text-left font-medium text-gray-700">날짜</th>
                      <th className="min-w-[60px] w-[7%] px-1 py-2 text-center font-medium text-gray-700">
                        <div className="flex items-center justify-center gap-1">
                          출결
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="center">
                              <ScoreLegendBox type="attendance" />
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="min-w-[60px] w-[7%] px-1 py-2 text-center font-medium text-gray-700">
                        <div className="flex items-center justify-center gap-1">
                          숙제
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="center">
                              <ScoreLegendBox type="homework" />
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="min-w-[60px] w-[7%] px-1 py-2 text-center font-medium text-gray-700">
                        <div className="flex items-center justify-center gap-1">
                          집중도
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="center">
                              <ScoreLegendBox type="focus" />
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="min-w-[110px] w-[10%] px-2 py-2 text-left font-medium text-gray-700">교재1
                        <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("book1")}>↓</Button>
                      </th>
                      <th className="min-w-[110px] w-[10%] px-2 py-2 text-left font-medium text-gray-700">진도1
                        <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("book1log")}>↓</Button>
                      </th>
                      <th className="min-w-[110px] w-[10%] px-2 py-2 text-left font-medium text-gray-700">교재2
                        <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("book2")}>↓</Button>
                      </th>
                      <th className="min-w-[110px] w-[10%] px-2 py-2 text-left font-medium text-gray-700">진도2
                        <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("book2log")}>↓</Button>
                      </th>
                      <th className="min-w-[120px] w-[13%] px-2 py-2 text-left font-medium text-gray-700">특이사항</th>
                      <th className="min-w-[45px] w-[5%] px-1 py-2 text-center font-medium text-gray-700">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, idx) => (
                      <tr key={row.classId + row.studentId} className="hover:bg-blue-50/30">
                        <td className="min-w-[80px] w-[8%] px-2 py-1 text-xs font-medium text-gray-800">{classes.find(c => c.id === row.classId)?.name || row.classId}</td>
                        <td className="min-w-[80px] w-[8%] px-2 py-1 text-xs font-medium text-gray-800">{row.name || students.find(s => s.id === row.studentId)?.name || row.studentId}</td>
                        <td className="min-w-[100px] w-[10%] px-2 py-1">
                          <input
                            type="date"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={row.date}
                            onChange={e => handleChange(idx, "date", e.target.value)}
                          />
                        </td>
                        <td className="min-w-[60px] w-[7%] px-1 py-1 text-center">
                          <select
                            className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={row.attendance}
                            onChange={e => handleChange(idx, "attendance", parseInt(e.target.value))}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="min-w-[60px] w-[7%] px-1 py-1 text-center">
                          <select
                            className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={row.homework}
                            onChange={e => handleChange(idx, "homework", parseInt(e.target.value))}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="min-w-[60px] w-[7%] px-1 py-1 text-center">
                          <select
                            className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={row.focus}
                            onChange={e => handleChange(idx, "focus", parseInt(e.target.value))}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="min-w-[110px] w-[10%] px-2 py-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-50 focus:outline-none truncate"
                            value={row.book1}
                            readOnly
                            onClick={() => openModal(idx, "book1", row.book1)}
                            placeholder="교재1"
                            title={row.book1}
                          />
                        </td>
                        <td className="min-w-[110px] w-[10%] px-2 py-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-50 focus:outline-none truncate"
                            value={row.book1log}
                            readOnly
                            onClick={() => openModal(idx, "book1log", row.book1log)}
                            placeholder="진도1"
                            title={row.book1log}
                          />
                        </td>
                        <td className="min-w-[110px] w-[10%] px-2 py-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-50 focus:outline-none truncate"
                            value={row.book2}
                            readOnly
                            onClick={() => openModal(idx, "book2", row.book2)}
                            placeholder="교재2"
                            title={row.book2}
                          />
                        </td>
                        <td className="min-w-[110px] w-[10%] px-2 py-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-gray-50 focus:outline-none truncate"
                            value={row.book2log}
                            readOnly
                            onClick={() => openModal(idx, "book2log", row.book2log)}
                            placeholder="진도2"
                            title={row.book2log}
                          />
                        </td>
                        <td className="min-w-[120px] w-[13%] px-2 py-1">
                          <input
                            type="text"
                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={row.note}
                            onChange={e => handleChange(idx, "note", e.target.value)}
                            placeholder="특이사항"
                          />
                        </td>
                        <td className="min-w-[45px] w-[5%] px-1 py-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-6 h-6 p-0 text-red-500 hover:bg-red-100"
                                onClick={() => setRows(rows => rows.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="center">
                              이 행 삭제
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-12 text-center text-gray-400">
                          <div className="text-gray-300 text-4xl mb-4">📊</div>
                          <div className="text-lg font-medium text-gray-500 mb-2">학습 관리 기록이 없습니다</div>
                          <div className="text-sm text-gray-400">왼쪽에서 반과 학생을 추가해 주세요</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* 하단 액션 버튼: 테스트 로그와 동일하게 */}
              <div className="bg-gray-50 px-4 py-3 border-t">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    총 <span className="font-medium text-blue-600">{rows.length}</span>개의 학습 기록
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setRows([])} size="sm">
                      일괄 삭제
                    </Button>
                    <Button onClick={handleSave} size="sm">
                      저장
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 모달: 교재/진도 입력 확대 */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[400px] max-w-full">
              <div className="mb-4 font-semibold text-lg">교재/진도 입력</div>
              <input
                ref={modalInputRef}
                className="input input-bordered w-full text-lg h-12 px-4 py-3"
                value={modalValue}
                onChange={e => setModalValue(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
                <Button variant="default" onClick={handleModalSave}>저장</Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 반만들기 모달 */}
        <ClassFormModal
          open={classModalOpen}
          onClose={handleClassModalClose}
          teachers={teachers}
          students={students}
          mode="create"
        />
      </div>
    </TooltipProvider>
  );
} 