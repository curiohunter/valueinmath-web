"use client";
import React, { useState, useEffect } from "react";
import LearningTabs from "@/components/LearningTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Calendar, Users, Search, RotateCcw, FileText, Plus, Trash2 } from "lucide-react";
import { ClassAccordion } from "@/components/ui/class-accordion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function TestLogsPage() {
  // 상태 선언 (학습관리와 동일하게)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [openClassIds, setOpenClassIds] = useState<string[]>([]);

  // 시험유형 옵션 및 색상 매핑
  const TEST_TYPE_OPTIONS = [
    { value: "과정총괄테스트", color: "bg-blue-100 text-blue-700" },
    { value: "내용암기테스트", color: "bg-yellow-100 text-yellow-700" },
    { value: "단원테스트", color: "bg-green-100 text-green-700" },
    { value: "모의고사", color: "bg-purple-100 text-purple-700" },
    { value: "서술형평가", color: "bg-pink-100 text-pink-700" },
    { value: "수학경시대회", color: "bg-orange-100 text-orange-700" },
    { value: "오답테스트", color: "bg-red-100 text-red-700" },
    { value: "내신기출유사", color: "bg-gray-100 text-gray-700" },
    { value: "내신기출", color: "bg-black text-white" },
    { value: "학교시험점수", color: "bg-cyan-100 text-cyan-700" },
  ];

  // 데이터 fetch (반/학생/반-학생 매핑)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data: classData } = await supabaseClient.from("classes").select("id, name");
        const { data: classStudentData } = await supabaseClient.from("class_students").select("class_id, student_id");
        const { data: studentData } = await supabaseClient.from("students").select("id, name, status");
        setClasses(classData || []);
        setClassStudents(classStudentData || []);
        setStudents(studentData || []);
        if (classData && classData.length > 0) setSelectedClassId(classData[0].id);
      } catch (e) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 반별 학생 목록 생성 함수
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
          test: "",
          test_type: "",
          test_score: "",
          note: "",
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
              test: "",
              test_type: "",
              test_score: "",
              note: "",
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

  // 일괄적용 함수 (key: "test" | "test_type" | "test_score")
  const handleBulkApply = (key: "test" | "test_type" | "test_score") => {
    setRows(prev => {
      if (prev.length === 0) return prev;
      const firstValue = prev[0][key];
      return prev.map((r, i) => i === 0 ? r : { ...r, [key]: firstValue });
    });
  };

  // 저장 버튼 클릭 (test_logs 테이블에 upsert)
  const handleSave = async () => {
    if (rows.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }
    try {
      const { error } = await supabaseClient
        .from("test_logs")
        .upsert(
          rows.map(r => ({
            class_id: r.classId || null,
            student_id: r.studentId,
            date: r.date,
            test: r.test,
            test_type: r.test_type,
            test_score: r.test_score !== '' ? Number(r.test_score) : null,
            note: r.note,
          })),
          { onConflict: "student_id,date,test" }
        );
      if (error) throw error;
      alert("저장되었습니다.");
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const toggleClassAccordion = (classId: string) => {
    setOpenClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400">로딩 중...</div>
  );
  if (error) return (
    <div className="p-8 text-center text-red-500">{error}</div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <LearningTabs />
        <div className="flex gap-6">
          {/* 왼쪽: 날짜/일괄적용 + 반별 아코디언 (학생 추가) */}
          <div className="w-52 max-h-[600px] flex-shrink-0 bg-white rounded-xl shadow p-2 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="date"
                className="input input-bordered w-full text-sm px-2 py-1"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-8 h-8 p-0 flex items-center justify-center"
                onClick={handleApplyAllDate}
              >
                <span className="text-lg text-blue-400">+</span>
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
          {/* 오른쪽: 시험 기록 테이블 */}
          <div className="flex-1">
            <div className="w-full max-w-[1200px] mx-auto">
              <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <colgroup>
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '30px' }} />
                      <col style={{ width: '210px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '45px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-3 py-3 text-left font-medium text-gray-700">반</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">학생</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">날짜</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">시험명
                          <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("test")}>↓</Button>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">시험유형
                          <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("test_type")}>↓</Button>
                        </th>
                        <th className="px-3 py-3 text-center font-medium text-gray-700">점수
                          <Button size="sm" variant="ghost" className="ml-1 w-5 h-5 p-0 text-gray-400" onClick={() => handleBulkApply("test_score")}>↓</Button>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">특이사항</th>
                        <th className="px-1 py-3 text-center font-medium text-gray-700">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                            <div className="text-gray-300 text-4xl mb-4">📊</div>
                            <div className="text-lg font-medium text-gray-500 mb-2">시험 기록이 없습니다</div>
                            <div className="text-sm text-gray-400">왼쪽에서 반과 학생을 추가해 주세요</div>
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => (
                          <tr key={row.classId + row.studentId} className="hover:bg-blue-50/30 transition-colors duration-150">
                            <td className="px-3 py-2 text-sm font-medium text-gray-800">
                              {classes.find(c => c.id === row.classId)?.name || row.classId}
                            </td>
                            <td className="px-3 py-2 pl-2 text-sm font-medium text-gray-800 flex items-center gap-1">
                              {row.name || students.find(s => s.id === row.studentId)?.name || row.studentId}
                              <button
                                className="ml-1 flex items-center justify-center w-7 h-7 bg-gray-100 border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 transition"
                                onClick={() => {
                                  setRows(prev => {
                                    const newRow = {
                                      classId: row.classId,
                                      studentId: row.studentId,
                                      name: row.name,
                                      date: row.date,
                                      test: "",
                                      test_type: "",
                                      test_score: "",
                                      note: ""
                                    };
                                    const newRows = [...prev];
                                    newRows.splice(idx + 1, 0, newRow);
                                    return newRows;
                                  });
                                }}
                                type="button"
                                tabIndex={0}
                                aria-label="시험 행 추가"
                              >
                                <Plus className="w-4 h-4 text-blue-500" />
                              </button>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600 font-mono">
                              <input
                                type="date"
                                className="w-full px-1 py-1 h-9 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={row.date}
                                onChange={e => handleChange(idx, "date", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800 font-medium">
                              <input
                                type="text"
                                className="w-full px-1 py-1 h-9 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={row.test}
                                onChange={e => handleChange(idx, "test", e.target.value)}
                                placeholder="시험명"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800 font-medium">
                              <Select value={row.test_type} onValueChange={v => handleChange(idx, "test_type", v)}>
                                <SelectTrigger className="w-full px-1 py-1 h-9 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                  <SelectValue placeholder="시험유형" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TEST_TYPE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold mr-2 ${opt.color}`}>{opt.value}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                className="w-full px-1 py-1 h-9 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={row.test_score}
                                onChange={e => handleChange(idx, "test_score", e.target.value)}
                                placeholder="점수"
                                min={0}
                                max={100}
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              <input
                                type="text"
                                className="w-full px-1 py-1 h-9 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={row.note}
                                onChange={e => handleChange(idx, "note", e.target.value)}
                                placeholder="특이사항"
                              />
                            </td>
                            <td className="px-1 py-2 text-center align-middle">
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* 하단 액션 버튼 */}
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      총 <span className="font-medium text-blue-600">{rows.length}</span>개의 시험 기록
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
        </div>
      </div>
    </TooltipProvider>
  );
}