"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Download,
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface ClassInfo {
  id: string;
  name: string;
  mathflat_class_id: string;
}

type CollectionStep = "select" | "collecting" | "success" | "error";

interface CollectionResult {
  success: boolean;
  totalHomeworkCount: number;
  processedClasses: Array<{
    className: string;
    studentCount: number;
    homeworkCount: number;
    error?: string;
  }>;
  errors?: string[];
}

export default function ManualHomeworkCollector() {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [homeworkDate, setHomeworkDate] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  });
  const [step, setStep] = useState<CollectionStep>("select");
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const supabase = createClient();

  // Load classes
  useEffect(() => {
    async function loadClasses() {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, mathflat_class_id")
        .eq("is_active", true)
        .not("mathflat_class_id", "is", null)
        .order("name");

      if (!error && data) {
        setClasses(data as ClassInfo[]);
      }
    }
    loadClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selected class info
  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = dayNames[date.getDay()];
    return { month, day, dayOfWeek, full: `${month}월 ${day}일 (${dayOfWeek})` };
  };

  // Quick date presets
  const setPresetDates = (preset: "today" | "yesterday" | "2days") => {
    const today = new Date();
    const target = new Date();
    const homework = new Date();

    if (preset === "today") {
      // 오늘 낸 숙제, 오늘 수업
      setTargetDate(today.toISOString().split("T")[0]);
      setHomeworkDate(today.toISOString().split("T")[0]);
    } else if (preset === "yesterday") {
      // 오늘 낸 숙제, 어제 수업
      setTargetDate(today.toISOString().split("T")[0]);
      homework.setDate(today.getDate() - 1);
      setHomeworkDate(homework.toISOString().split("T")[0]);
    } else if (preset === "2days") {
      // 어제 낸 숙제, 그저께 수업
      target.setDate(today.getDate() - 1);
      homework.setDate(today.getDate() - 2);
      setTargetDate(target.toISOString().split("T")[0]);
      setHomeworkDate(homework.toISOString().split("T")[0]);
    }
  };

  // Check if dates are same
  const isSameDate = targetDate === homeworkDate;

  // Collect homework
  const handleCollect = async () => {
    if (!selectedClass) return;

    setStep("collecting");
    setResult(null);
    setErrorMessage("");

    try {
      const response = await fetch("/api/cron/mathflat-homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
        body: JSON.stringify({
          collectionType: "first",
          classIds: [selectedClass.mathflat_class_id],
          targetDate,
          homeworkDate: isSameDate ? undefined : homeworkDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setStep("success");
        toast.success(`${data.data.totalHomeworkCount}개 숙제 수집 완료`);
      } else {
        setErrorMessage(data.message || data.error || "수집 실패");
        setStep("error");
      }
    } catch (error) {
      setErrorMessage(String(error));
      setStep("error");
    }
  };

  // Reset dialog state
  const handleReset = () => {
    setStep("select");
    setResult(null);
    setErrorMessage("");
  };

  // Close and reset
  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(handleReset, 200);
    }
  };

  const targetDateInfo = formatDateDisplay(targetDate);
  const homeworkDateInfo = formatDateDisplay(homeworkDate);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white",
            "transition-all duration-200"
          )}
        >
          <Download className="w-4 h-4" />
          수동 수집
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-gradient-to-b from-slate-50 to-white border-0 shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDMiIGN4PSIyMCIgY3k9IjIwIiByPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
          <DialogHeader className="relative">
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Download className="w-5 h-5" />
              </div>
              숙제 수동 수집
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1.5">
              {step === "select" && "수집할 반과 날짜를 선택하세요"}
              {step === "collecting" && "숙제를 수집하고 있습니다..."}
              {step === "success" && "수집이 완료되었습니다"}
              {step === "error" && "수집 중 오류가 발생했습니다"}
            </p>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "select" && (
            <div className="space-y-6">
              {/* Class Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  반 선택
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-12 text-base border-slate-200 focus:border-slate-400 focus:ring-slate-400/20">
                    <SelectValue placeholder="수집할 반을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="py-3">
                        <span className="font-medium">{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Quick Presets */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  빠른 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPresetDates("today")}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all duration-200",
                      "hover:border-slate-400 hover:bg-slate-50",
                      isSameDate && targetDate === new Date().toISOString().split("T")[0]
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white"
                    )}
                  >
                    <div className="text-xs font-medium opacity-70">오늘 수업</div>
                    <div className="text-sm font-bold mt-0.5">오늘 숙제</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDates("yesterday")}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all duration-200",
                      "hover:border-slate-400 hover:bg-slate-50",
                      !isSameDate &&
                        targetDate === new Date().toISOString().split("T")[0]
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white"
                    )}
                  >
                    <div className="text-xs font-medium opacity-70">어제 수업</div>
                    <div className="text-sm font-bold mt-0.5">오늘 숙제</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDates("2days")}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all duration-200",
                      "hover:border-slate-400 hover:bg-slate-50 border-slate-200 bg-white"
                    )}
                  >
                    <div className="text-xs font-medium opacity-70">그저께 수업</div>
                    <div className="text-sm font-bold mt-0.5">어제 숙제</div>
                  </button>
                </div>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4">
                {/* Target Date */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    숙제 낸 날
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 outline-none transition-all text-base"
                    />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    MathFlat에서 조회할 날짜
                  </p>
                </div>

                {/* Homework Date */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    수업일 (저장 날짜)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={homeworkDate}
                      onChange={(e) => setHomeworkDate(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all text-base"
                    />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    DB에 저장될 숙제 날짜
                  </p>
                </div>
              </div>

              {/* Preview */}
              {selectedClass && (
                <div className="mt-2 p-4 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm text-slate-500 mb-1">수집 미리보기</div>
                      <div className="flex items-center gap-2 text-slate-800">
                        <span className="font-bold text-lg">{selectedClass.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <span className="text-base">
                          {isSameDate ? (
                            <span className="font-medium">{targetDateInfo.full}</span>
                          ) : (
                            <>
                              <span className="text-blue-600 font-medium">{targetDateInfo.full}</span>
                              <span className="mx-1 text-slate-400">→</span>
                              <span className="text-emerald-600 font-medium">{homeworkDateInfo.full}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isSameDate && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800">
                        <strong>{targetDateInfo.full}</strong>에 낸 숙제가{" "}
                        <strong>{homeworkDateInfo.full}</strong> 숙제로 저장됩니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleCollect}
                disabled={!selectedClassId}
                className={cn(
                  "w-full h-14 text-base font-bold rounded-xl transition-all duration-300",
                  "bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600",
                  "disabled:from-slate-300 disabled:to-slate-200 disabled:cursor-not-allowed",
                  "shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                )}
              >
                <Download className="w-5 h-5 mr-2" />
                숙제 수집하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {step === "collecting" && (
            <div className="py-12 text-center">
              <div className="relative inline-flex">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-slate-600 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-slate-600 animate-spin" style={{ animationDuration: "1.5s" }} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-6">
                숙제를 수집하고 있습니다
              </h3>
              <p className="text-slate-500 mt-2">
                {selectedClass?.name}의 숙제를 MathFlat에서 가져오는 중...
              </p>
            </div>
          )}

          {step === "success" && result && (
            <div className="py-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mt-5">
                수집 완료!
              </h3>
              <p className="text-slate-500 mt-2">
                총 <span className="font-bold text-emerald-600">{result.totalHomeworkCount}개</span> 숙제가 수집되었습니다
              </p>

              {/* Results Detail */}
              {result.processedClasses.map((pc, idx) => (
                <div
                  key={idx}
                  className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{pc.className}</span>
                    <span className="text-sm text-slate-500">
                      {pc.studentCount}명 / {pc.homeworkCount}개 숙제
                    </span>
                  </div>
                </div>
              ))}

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 h-12 rounded-xl"
                >
                  다른 반 수집
                </Button>
                <Button
                  onClick={() => handleClose(false)}
                  className="flex-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-700"
                >
                  완료
                </Button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="py-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-5">
                수집 실패
              </h3>
              <p className="text-red-600 mt-2 text-sm px-4">
                {errorMessage}
              </p>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 h-12 rounded-xl"
                >
                  다시 시도
                </Button>
                <Button
                  onClick={() => handleClose(false)}
                  className="flex-1 h-12 rounded-xl"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
