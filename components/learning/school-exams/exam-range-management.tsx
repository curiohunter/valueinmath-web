"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  BookOpen,
  Loader2,
  Calendar,
  School as SchoolIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ChapterTreeSelector } from "../homework-analysis/student-analysis";
import { ConceptData, ChapterSelection, CURRICULUM_LIST } from "../homework-analysis/types";

interface School {
  id: string;
  name: string;
  school_type: string;
  short_name: string | null;
}

interface ExamRange {
  id: string;
  school_id: string;
  school: School;
  grade: number;
  exam_year: number;
  semester: number;
  exam_type: string;
  exam_start_date: string | null;
  exam_end_date: string | null;
  curriculum_key: string;
  big_chapters: string[];
  middle_chapters: string[];
  little_chapters: string[];
  notes: string | null;
  created_at: string;
}

interface ExamRangeFilters {
  search: string;
  school_type: string;
  grade: string;
  exam_year: string;
  semester: string;
  exam_type: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function ExamRangeManagement() {
  const supabase = createClient();

  const [ranges, setRanges] = useState<ExamRange[]>([]);
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConceptsLoading, setIsConceptsLoading] = useState(true);
  const [schoolSearch, setSchoolSearch] = useState("");

  const [filters, setFilters] = useState<ExamRangeFilters>({
    search: "",
    school_type: "all",
    grade: "all",
    exam_year: CURRENT_YEAR.toString(),
    semester: "all",
    exam_type: "all",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<ExamRange | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    school_id: "",
    grade: 1,
    exam_year: CURRENT_YEAR,
    semester: 1,
    exam_type: "중간고사",
    exam_start_date: "",
    exam_end_date: "",
    notes: "",
  });
  const [chapterSelection, setChapterSelection] = useState<ChapterSelection>({
    curriculum: null,
    bigChapters: [],
    middleChapters: [],
    littleChapters: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load schools (중학교, 고등학교만)
  useEffect(() => {
    async function loadSchools() {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name, school_type, short_name")
          .in("school_type", ["중학교", "고등학교"])
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        setSchools((data as School[]) || []);
      } catch (err) {
        console.error("학교 목록 로드 실패:", err);
      }
    }
    loadSchools();
  }, [supabase]);

  // Load concepts
  useEffect(() => {
    async function loadConcepts() {
      setIsConceptsLoading(true);
      try {
        const { data, error } = await supabase
          .from("mathflat_concepts")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        setConcepts((data as ConceptData[]) || []);
      } catch (err) {
        console.error("개념 로드 실패:", err);
      } finally {
        setIsConceptsLoading(false);
      }
    }
    loadConcepts();
  }, [supabase]);

  // Load exam ranges
  const loadRanges = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("school_exam_ranges")
        .select(`
          *,
          school:schools!inner(id, name, school_type, short_name)
        `)
        .order("exam_year", { ascending: false })
        .order("semester", { ascending: true });

      if (filters.search) {
        query = query.ilike("school.name", `%${filters.search}%`);
      }
      if (filters.school_type !== "all") {
        query = query.eq("school.school_type", filters.school_type);
      }
      if (filters.grade !== "all") {
        query = query.eq("grade", parseInt(filters.grade));
      }
      if (filters.exam_year !== "all") {
        query = query.eq("exam_year", parseInt(filters.exam_year));
      }
      if (filters.semester !== "all") {
        query = query.eq("semester", parseInt(filters.semester));
      }
      if (filters.exam_type !== "all") {
        query = query.eq("exam_type", filters.exam_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRanges((data as ExamRange[]) || []);
    } catch (err) {
      console.error("시험 범위 로드 실패:", err);
      toast.error("시험 범위를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    loadRanges();
  }, [loadRanges]);

  // Open modal for create
  const handleCreate = () => {
    setEditingRange(null);
    setFormData({
      school_id: "",
      grade: 1,
      exam_year: CURRENT_YEAR,
      semester: 1,
      exam_type: "중간고사",
      exam_start_date: "",
      exam_end_date: "",
      notes: "",
    });
    setChapterSelection({
      curriculum: null,
      bigChapters: [],
      middleChapters: [],
      littleChapters: [],
    });
    setSchoolSearch("");
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (range: ExamRange) => {
    setEditingRange(range);
    setFormData({
      school_id: range.school_id,
      grade: range.grade,
      exam_year: range.exam_year,
      semester: range.semester,
      exam_type: range.exam_type,
      exam_start_date: range.exam_start_date || "",
      exam_end_date: range.exam_end_date || "",
      notes: range.notes || "",
    });
    setChapterSelection({
      curriculum: range.curriculum_key,
      bigChapters: range.big_chapters,
      middleChapters: range.middle_chapters,
      littleChapters: range.little_chapters,
    });
    setSchoolSearch(range.school?.name || "");
    setIsModalOpen(true);
  };

  // Delete range
  const handleDelete = async (id: string) => {
    if (!confirm("이 시험 범위를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("school_exam_ranges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("시험 범위가 삭제되었습니다");
      loadRanges();
    } catch (err) {
      console.error("삭제 실패:", err);
      toast.error("삭제에 실패했습니다");
    }
  };

  // Save range
  const handleSave = async () => {
    if (!formData.school_id) {
      toast.error("학교를 선택해주세요");
      return;
    }
    if (!chapterSelection.curriculum || chapterSelection.bigChapters.length === 0) {
      toast.error("시험 범위(단원)를 선택해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        school_id: formData.school_id,
        grade: formData.grade,
        exam_year: formData.exam_year,
        semester: formData.semester,
        exam_type: formData.exam_type,
        exam_start_date: formData.exam_start_date || null,
        exam_end_date: formData.exam_end_date || null,
        curriculum_key: chapterSelection.curriculum,
        big_chapters: chapterSelection.bigChapters,
        middle_chapters: chapterSelection.middleChapters,
        little_chapters: chapterSelection.littleChapters,
        notes: formData.notes || null,
      };

      if (editingRange) {
        const { error } = await supabase
          .from("school_exam_ranges")
          .update(payload)
          .eq("id", editingRange.id);

        if (error) throw error;
        toast.success("시험 범위가 수정되었습니다");
      } else {
        const { error } = await supabase
          .from("school_exam_ranges")
          .insert(payload);

        if (error) {
          if (error.code === "23505") {
            toast.error("이미 동일한 시험 범위가 등록되어 있습니다");
            return;
          }
          throw error;
        }
        toast.success("시험 범위가 등록되었습니다");
      }

      setIsModalOpen(false);
      loadRanges();
    } catch (err) {
      console.error("저장 실패:", err);
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // Grouped ranges by school
  const groupedRanges = useMemo(() => {
    const groups = new Map<string, ExamRange[]>();
    ranges.forEach((r) => {
      const key = `${r.school_id}_${r.grade}`;
      const existing = groups.get(key) || [];
      existing.push(r);
      groups.set(key, existing);
    });
    return groups;
  }, [ranges]);

  // Filtered schools for autocomplete
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools.slice(0, 20);
    const search = schoolSearch.toLowerCase();
    return schools
      .filter((s) =>
        s.name.toLowerCase().includes(search) ||
        (s.short_name && s.short_name.toLowerCase().includes(search))
      )
      .slice(0, 20);
  }, [schools, schoolSearch]);

  // Selected school info
  const selectedSchool = useMemo(() => {
    return schools.find((s) => s.id === formData.school_id);
  }, [schools, formData.school_id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">시험 범위 관리</h2>
          <p className="text-slate-500 text-sm mt-1">
            학교별 시험 범위를 등록하고 학생 분석에 활용하세요
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          시험 범위 등록
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="학교명 검색..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.exam_year}
            onValueChange={(v) => setFilters({ ...filters, exam_year: v })}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.semester}
            onValueChange={(v) => setFilters({ ...filters, semester: v })}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="학기" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="1">1학기</SelectItem>
              <SelectItem value="2">2학기</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.exam_type}
            onValueChange={(v) => setFilters({ ...filters, exam_type: v })}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="시험" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="중간고사">중간고사</SelectItem>
              <SelectItem value="기말고사">기말고사</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.school_type}
            onValueChange={(v) => setFilters({ ...filters, school_type: v })}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="학교" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="고등학교">고등학교</SelectItem>
              <SelectItem value="중학교">중학교</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.grade}
            onValueChange={(v) => setFilters({ ...filters, grade: v })}
          >
            <SelectTrigger className="w-[90px]">
              <SelectValue placeholder="학년" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="1">1학년</SelectItem>
              <SelectItem value="2">2학년</SelectItem>
              <SelectItem value="3">3학년</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          <p className="text-slate-500 mt-2">로딩 중...</p>
        </div>
      ) : ranges.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            등록된 시험 범위가 없습니다
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            시험 범위를 등록하면 학생 분석에서 쉽게 불러올 수 있습니다
          </p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            첫 시험 범위 등록하기
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedRanges.entries()).map(([key, groupRanges]) => {
            const first = groupRanges[0];
            return (
              <Card key={key} className="overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b flex items-center gap-3">
                  <SchoolIcon className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    {first.school?.name || "알 수 없는 학교"}
                  </span>
                  <span className="text-sm text-slate-500">
                    {first.school?.school_type} {first.grade}학년
                  </span>
                </div>
                <div className="divide-y">
                  {groupRanges.map((range) => (
                    <div
                      key={range.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                          {range.exam_year} {range.semester}학기 {range.exam_type}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">
                            {range.curriculum_key}
                          </span>
                          <span className="text-slate-400 ml-2">
                            {range.big_chapters.join(", ")}
                          </span>
                        </div>
                        {range.exam_start_date && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {range.exam_start_date}
                            {range.exam_end_date && ` ~ ${range.exam_end_date}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(range)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(range.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRange ? "시험 범위 수정" : "시험 범위 등록"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* School Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  학교 선택
                </label>
                <div className="relative">
                  <Input
                    placeholder="학교명 검색... (예: 분당고, 낙생고)"
                    value={schoolSearch}
                    onChange={(e) => {
                      setSchoolSearch(e.target.value);
                      // 검색어 변경 시 선택 해제
                      if (formData.school_id && e.target.value !== selectedSchool?.name) {
                        setFormData({ ...formData, school_id: "" });
                      }
                    }}
                  />
                  {schoolSearch && !formData.school_id && filteredSchools.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredSchools.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                          onClick={() => {
                            setFormData({ ...formData, school_id: school.id });
                            setSchoolSearch(school.name);
                          }}
                        >
                          <span className="text-sm">{school.name}</span>
                          <span className="text-xs text-slate-400">{school.school_type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSchool && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100">
                      {selectedSchool.school_type}
                    </span>
                    <span>{selectedSchool.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  학년
                </label>
                <Select
                  value={formData.grade.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, grade: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exam Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  시험 연도
                </label>
                <Select
                  value={formData.exam_year.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, exam_year: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  학기
                </label>
                <Select
                  value={formData.semester.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, semester: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1학기</SelectItem>
                    <SelectItem value="2">2학기</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  시험 종류
                </label>
                <Select
                  value={formData.exam_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, exam_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="중간고사">중간고사</SelectItem>
                    <SelectItem value="기말고사">기말고사</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exam Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  시험 시작일 (선택)
                </label>
                <Input
                  type="date"
                  value={formData.exam_start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, exam_start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  시험 종료일 (선택)
                </label>
                <Input
                  type="date"
                  value={formData.exam_end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, exam_end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Chapter Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                시험 범위 (단원)
              </label>
              {isConceptsLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  단원 정보 로딩 중...
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-slate-50">
                  <ChapterTreeSelector
                    concepts={concepts}
                    selection={chapterSelection}
                    onSelectionChange={setChapterSelection}
                    isLocked={false}
                    onLockToggle={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                메모 (선택)
              </label>
              <Input
                placeholder="추가 메모..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : editingRange ? (
                "수정"
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
