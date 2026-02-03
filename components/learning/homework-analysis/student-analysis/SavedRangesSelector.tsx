"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bookmark, Plus, Trash2, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChapterSelection } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SavedRange {
  id: string;
  name: string;
  curriculum_key: string;
  big_chapters: string[];
  middle_chapters: string[];
  little_chapters: string[];
  created_at: string;
}

interface SavedRangesSelectorProps {
  selection: ChapterSelection;
  onSelectionChange: (selection: ChapterSelection) => void;
  disabled?: boolean;
}

export default function SavedRangesSelector({
  selection,
  onSelectionChange,
  disabled,
}: SavedRangesSelectorProps) {
  const supabase = createClient();

  const [savedRanges, setSavedRanges] = useState<SavedRange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveMode, setIsSaveMode] = useState(false);
  const [newRangeName, setNewRangeName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 저장된 범위 로드
  const loadSavedRanges = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_exam_ranges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedRanges(data || []);
    } catch (err) {
      console.error("저장된 범위 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadSavedRanges();
  }, [loadSavedRanges]);

  // 범위 저장
  const handleSave = async () => {
    if (!newRangeName.trim() || !selection.curriculum) {
      toast.error("범위 이름과 과목을 선택해주세요");
      return;
    }

    if (selection.bigChapters.length === 0) {
      toast.error("최소 1개 이상의 대단원을 선택해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("saved_exam_ranges").insert({
        name: newRangeName.trim(),
        curriculum_key: selection.curriculum,
        big_chapters: selection.bigChapters,
        middle_chapters: selection.middleChapters,
        little_chapters: selection.littleChapters,
      });

      if (error) throw error;

      toast.success("범위가 저장되었습니다");
      setNewRangeName("");
      setIsSaveMode(false);
      loadSavedRanges();
    } catch (err) {
      console.error("범위 저장 실패:", err);
      toast.error("범위 저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // 범위 삭제
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("이 범위를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("saved_exam_ranges")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("범위가 삭제되었습니다");
      loadSavedRanges();
    } catch (err) {
      console.error("범위 삭제 실패:", err);
      toast.error("범위 삭제에 실패했습니다");
    }
  };

  // 범위 불러오기
  const handleLoad = (range: SavedRange) => {
    onSelectionChange({
      curriculum: range.curriculum_key,
      bigChapters: range.big_chapters,
      middleChapters: range.middle_chapters,
      littleChapters: range.little_chapters,
    });
    setIsOpen(false);
    toast.success(`"${range.name}" 범위를 불러왔습니다`);
  };

  // 현재 선택 가능 여부
  const canSave =
    selection.curriculum !== null && selection.bigChapters.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "gap-1.5 text-xs",
            savedRanges.length > 0 && "border-indigo-200 text-indigo-600"
          )}
        >
          <Bookmark className="w-3.5 h-3.5" />
          저장된 범위
          {savedRanges.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
              {savedRanges.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800 text-sm">저장된 범위</h4>
            {!isSaveMode && canSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSaveMode(true)}
                className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                저장
              </Button>
            )}
          </div>

          {/* 저장 모드 */}
          {isSaveMode && (
            <div className="mt-3 space-y-2">
              <Input
                placeholder="범위 이름 (예: 1차 지필)"
                value={newRangeName}
                onChange={(e) => setNewRangeName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsSaveMode(false);
                }}
              />
              <div className="text-xs text-slate-500">
                {selection.curriculum} • {selection.bigChapters.length}개 대단원
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !newRangeName.trim()}
                  className="flex-1 h-7 text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      저장
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsSaveMode(false);
                    setNewRangeName("");
                  }}
                  className="h-7 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 저장된 범위 목록 */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              로드 중...
            </div>
          ) : savedRanges.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              저장된 범위가 없습니다
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {savedRanges.map((range) => (
                <div
                  key={range.id}
                  onClick={() => handleLoad(range)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-indigo-50 group"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-800 truncate">
                      {range.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {range.curriculum_key} • {range.big_chapters.length}개 대단원
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(range.id, e)}
                    className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
