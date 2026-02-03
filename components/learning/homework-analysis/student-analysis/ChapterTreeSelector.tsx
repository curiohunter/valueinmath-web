"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Lock,
  Unlock,
  Check,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChapterSelection,
  ChapterNode,
  ConceptData,
  CURRICULUM_LIST,
} from "../types";

// 과목별 선택 상태 저장 타입
type CurriculumSelections = Record<string, Omit<ChapterSelection, "curriculum">>;

interface ChapterTreeSelectorProps {
  concepts: ConceptData[];
  selection: ChapterSelection;
  onSelectionChange: (selection: ChapterSelection) => void;
  isLocked: boolean;
  onLockToggle: () => void;
}

// 체크박스 상태 타입
type CheckState = "checked" | "unchecked" | "indeterminate";

// 커스텀 체크박스 (indeterminate 지원)
function TreeCheckbox({
  state,
  disabled,
}: {
  state: CheckState;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0",
        disabled && "opacity-50",
        state === "checked" && "bg-indigo-600 border-indigo-600 text-white",
        state === "indeterminate" && "bg-indigo-400 border-indigo-400 text-white",
        state === "unchecked" && "bg-white border-slate-300"
      )}
    >
      {state === "checked" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      {state === "indeterminate" && <Minus className="w-3.5 h-3.5" strokeWidth={3} />}
    </div>
  );
}

// 트리 노드 컴포넌트
function TreeNode({
  node,
  level,
  selection,
  onToggle,
  expandedNodes,
  onExpandToggle,
  disabled,
}: {
  node: ChapterNode;
  level: number;
  selection: ChapterSelection;
  onToggle: (node: ChapterNode) => void;
  expandedNodes: Set<string>;
  onExpandToggle: (nodeKey: string) => void;
  disabled?: boolean;
}) {
  const nodeKey = [...node.path, node.name].join("/");
  const isExpanded = expandedNodes.has(nodeKey);
  const hasChildren = node.children && node.children.length > 0;

  // 체크 상태 계산
  const checkState = useMemo((): CheckState => {
    if (node.level === "big") {
      const isSelected = selection.bigChapters.includes(node.name);
      if (!isSelected) return "unchecked";
      const childNames = node.children?.map((c) => c.name) || [];
      const selectedChildren = childNames.filter((name) =>
        selection.middleChapters.includes(name)
      );
      if (selectedChildren.length === 0) return "checked";
      if (selectedChildren.length === childNames.length) return "checked";
      return "indeterminate";
    }
    if (node.level === "middle") {
      const isSelected = selection.middleChapters.includes(node.name);
      if (!isSelected) return "unchecked";
      const childNames = node.children?.map((c) => c.name) || [];
      const selectedChildren = childNames.filter((name) =>
        selection.littleChapters.includes(name)
      );
      if (selectedChildren.length === 0) return "checked";
      if (selectedChildren.length === childNames.length) return "checked";
      return "indeterminate";
    }
    if (node.level === "little") {
      return selection.littleChapters.includes(node.name) ? "checked" : "unchecked";
    }
    if (node.level === "concept") {
      // 개념은 부모(소단원) 선택 여부에 따름
      const parentLittle = node.path[3];
      return parentLittle && selection.littleChapters.includes(parentLittle)
        ? "checked"
        : "unchecked";
    }
    return "unchecked";
  }, [node, selection]);

  // 레벨별 스타일
  const levelStyles = {
    big: "font-semibold text-slate-800",
    middle: "font-medium text-slate-700",
    little: "text-slate-600",
    concept: "text-slate-500 text-xs",
  };

  // 행 클릭 핸들러
  const handleRowClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();

    // 개념 레벨은 체크박스 토글 (부모 소단원 토글)
    if (node.level === "concept") {
      onToggle(node);
      return;
    }

    // 소단원(leaf)이거나 체크박스 영역 클릭 시 토글
    if (!hasChildren) {
      onToggle(node);
    } else {
      // 대/중/소단원은 확장/축소
      onExpandToggle(nodeKey);
    }
  };

  // 체크박스 영역 클릭 (별도 처리)
  const handleCheckClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    onToggle(node);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-lg transition-colors cursor-pointer",
          "hover:bg-indigo-50",
          checkState !== "unchecked" && "bg-indigo-50/50",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleRowClick}
      >
        {/* 확장 아이콘 */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )
          ) : (
            <div className="w-1 h-1" /> // 빈 공간 유지
          )}
        </div>

        {/* 체크박스 - 클릭 가능 영역 확대 */}
        <div
          className="p-0.5 -m-0.5 cursor-pointer"
          onClick={handleCheckClick}
        >
          <TreeCheckbox state={checkState} disabled={disabled} />
        </div>

        {/* 노드 이름 */}
        <span
          className={cn(
            "flex-1 text-sm",
            levelStyles[node.level as keyof typeof levelStyles]
          )}
        >
          {node.name}
        </span>

        {/* 개념 수 */}
        {node.conceptCount && node.conceptCount > 0 && (
          <span className="text-xs text-slate-400 tabular-nums">
            {node.conceptCount}개
          </span>
        )}
      </div>

      {/* 하위 노드 */}
      {hasChildren && isExpanded && (
        <div className="animate-in slide-in-from-top-1 duration-150">
          {node.children!.map((child) => (
            <TreeNode
              key={[...child.path, child.name].join("/")}
              node={child}
              level={level + 1}
              selection={selection}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              onExpandToggle={onExpandToggle}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChapterTreeSelector({
  concepts,
  selection,
  onSelectionChange,
  isLocked,
  onLockToggle,
}: ChapterTreeSelectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 과목별 선택 상태 캐시 (과목 전환 시에도 유지)
  const [curriculumSelections, setCurriculumSelections] = useState<CurriculumSelections>({});

  // 과목별 트리 구조 생성 (id 순 정렬, 개념까지 포함)
  const treeData = useMemo((): Map<string, ChapterNode[]> => {
    const result = new Map<string, ChapterNode[]>();

    CURRICULUM_LIST.forEach(({ key: curriculum }) => {
      const curriculumConcepts = concepts.filter(
        (c) => c.curriculum_key === curriculum
      );
      if (curriculumConcepts.length === 0) {
        result.set(curriculum, []);
        return;
      }

      // 대단원별 그룹화 + 최소 id 계산
      const bigChapterMap = new Map<string, { concepts: ConceptData[]; minId: number }>();
      curriculumConcepts.forEach((c) => {
        if (!c.big_chapter) return;
        const existing = bigChapterMap.get(c.big_chapter);
        if (existing) {
          existing.concepts.push(c);
          existing.minId = Math.min(existing.minId, c.id);
        } else {
          bigChapterMap.set(c.big_chapter, {
            concepts: [c],
            minId: c.id,
          });
        }
      });

      // id 순으로 정렬된 대단원 배열
      const sortedBigChapters = Array.from(bigChapterMap.entries())
        .sort((a, b) => a[1].minId - b[1].minId);

      const bigNodes: ChapterNode[] = [];
      sortedBigChapters.forEach(([bigChapter, { concepts: bigConcepts }]) => {
        // 중단원별 그룹화 + 최소 id 계산
        const middleChapterMap = new Map<string, { concepts: ConceptData[]; minId: number }>();
        bigConcepts.forEach((c) => {
          if (!c.middle_chapter) return;
          const existing = middleChapterMap.get(c.middle_chapter);
          if (existing) {
            existing.concepts.push(c);
            existing.minId = Math.min(existing.minId, c.id);
          } else {
            middleChapterMap.set(c.middle_chapter, {
              concepts: [c],
              minId: c.id,
            });
          }
        });

        const sortedMiddleChapters = Array.from(middleChapterMap.entries())
          .sort((a, b) => a[1].minId - b[1].minId);

        const middleNodes: ChapterNode[] = [];
        sortedMiddleChapters.forEach(([middleChapter, { concepts: middleConcepts }]) => {
          // 소단원별 그룹화 + 최소 id 계산
          const littleChapterMap = new Map<string, { concepts: ConceptData[]; minId: number }>();
          middleConcepts.forEach((c) => {
            if (!c.little_chapter) return;
            const existing = littleChapterMap.get(c.little_chapter);
            if (existing) {
              existing.concepts.push(c);
              existing.minId = Math.min(existing.minId, c.id);
            } else {
              littleChapterMap.set(c.little_chapter, {
                concepts: [c],
                minId: c.id,
              });
            }
          });

          const sortedLittleChapters = Array.from(littleChapterMap.entries())
            .sort((a, b) => a[1].minId - b[1].minId);

          const littleNodes: ChapterNode[] = sortedLittleChapters.map(
            ([littleChapter, { concepts: littleConcepts }]) => {
              // 개념 노드들 (id 순 정렬)
              const conceptNodes: ChapterNode[] = littleConcepts
                .sort((a, b) => a.id - b.id)
                .map((c) => ({
                  name: c.concept_name,
                  level: "concept" as const,
                  path: [curriculum, bigChapter, middleChapter, littleChapter],
                  conceptId: c.concept_id,
                }));

              return {
                name: littleChapter,
                level: "little" as const,
                path: [curriculum, bigChapter, middleChapter],
                children: conceptNodes,
                conceptCount: littleConcepts.length,
              };
            }
          );

          middleNodes.push({
            name: middleChapter,
            level: "middle",
            path: [curriculum, bigChapter],
            children: littleNodes,
            conceptCount: middleConcepts.length,
          });
        });

        bigNodes.push({
          name: bigChapter,
          level: "big",
          path: [curriculum],
          children: middleNodes,
          conceptCount: bigConcepts.length,
        });
      });

      result.set(curriculum, bigNodes);
    });

    return result;
  }, [concepts]);

  // 선택된 범위 요약
  const selectionSummary = useMemo(() => {
    if (!selection.curriculum) return null;

    const parts: string[] = [];

    if (selection.littleChapters.length > 0) {
      parts.push(`소단원 ${selection.littleChapters.length}개`);
    } else if (selection.middleChapters.length > 0) {
      parts.push(`중단원 ${selection.middleChapters.length}개`);
    } else if (selection.bigChapters.length > 0) {
      parts.push(`대단원 ${selection.bigChapters.length}개`);
    }

    const selectedConcepts = concepts.filter((c) => {
      if (c.curriculum_key !== selection.curriculum) return false;
      if (selection.littleChapters.length > 0) {
        return selection.littleChapters.includes(c.little_chapter || "");
      }
      if (selection.middleChapters.length > 0) {
        return selection.middleChapters.includes(c.middle_chapter || "");
      }
      if (selection.bigChapters.length > 0) {
        return selection.bigChapters.includes(c.big_chapter || "");
      }
      return false;
    });

    return {
      text: parts.join(", ") || "선택 없음",
      conceptCount: selectedConcepts.length,
    };
  }, [selection, concepts]);

  // 과목 선택
  const handleCurriculumSelect = useCallback(
    (curriculum: string) => {
      if (isLocked) return;

      // 현재 과목 선택 상태 저장
      if (selection.curriculum) {
        setCurriculumSelections((prev) => ({
          ...prev,
          [selection.curriculum!]: {
            bigChapters: selection.bigChapters,
            middleChapters: selection.middleChapters,
            littleChapters: selection.littleChapters,
          },
        }));
      }

      // 이전에 저장된 선택 상태 복원 또는 초기화
      const savedSelection = curriculumSelections[curriculum];

      onSelectionChange({
        curriculum,
        bigChapters: savedSelection?.bigChapters || [],
        middleChapters: savedSelection?.middleChapters || [],
        littleChapters: savedSelection?.littleChapters || [],
      });

      // 해당 과목의 첫 번째 대단원 자동 확장
      const nodes = treeData.get(curriculum);
      if (nodes && nodes.length > 0) {
        setExpandedNodes(new Set([`${curriculum}/${nodes[0].name}`]));
      }
    },
    [selection, isLocked, onSelectionChange, treeData, curriculumSelections]
  );

  // 노드 토글 (상위 선택 시 하위도 자동 선택)
  const handleNodeToggle = useCallback(
    (node: ChapterNode) => {
      if (isLocked) return;

      const newSelection = { ...selection };

      if (node.level === "big") {
        const isCurrentlySelected = selection.bigChapters.includes(node.name);
        if (isCurrentlySelected) {
          // 해제: 대단원 및 하위 전체 해제
          newSelection.bigChapters = selection.bigChapters.filter(
            (n) => n !== node.name
          );
          const childMiddles = node.children?.map((c) => c.name) || [];
          newSelection.middleChapters = selection.middleChapters.filter(
            (n) => !childMiddles.includes(n)
          );
          const childLittles =
            node.children?.flatMap((m) => m.children?.map((l) => l.name) || []) || [];
          newSelection.littleChapters = selection.littleChapters.filter(
            (n) => !childLittles.includes(n)
          );
        } else {
          // 선택: 대단원 + 하위 중단원/소단원 모두 선택
          newSelection.bigChapters = [...selection.bigChapters, node.name];
          const childMiddles = node.children?.map((c) => c.name) || [];
          const childLittles =
            node.children?.flatMap((m) => m.children?.map((l) => l.name) || []) || [];
          newSelection.middleChapters = [
            ...selection.middleChapters.filter((n) => !childMiddles.includes(n)),
            ...childMiddles,
          ];
          newSelection.littleChapters = [
            ...selection.littleChapters.filter((n) => !childLittles.includes(n)),
            ...childLittles,
          ];
        }
      } else if (node.level === "middle") {
        const isCurrentlySelected = selection.middleChapters.includes(node.name);
        if (isCurrentlySelected) {
          // 해제
          newSelection.middleChapters = selection.middleChapters.filter(
            (n) => n !== node.name
          );
          const childLittles = node.children?.map((c) => c.name) || [];
          newSelection.littleChapters = selection.littleChapters.filter(
            (n) => !childLittles.includes(n)
          );
        } else {
          // 선택: 중단원 + 하위 소단원 모두 선택
          newSelection.middleChapters = [...selection.middleChapters, node.name];
          const childLittles = node.children?.map((c) => c.name) || [];
          newSelection.littleChapters = [
            ...selection.littleChapters.filter((n) => !childLittles.includes(n)),
            ...childLittles,
          ];
          // 부모 대단원도 선택
          const parentBig = node.path[1];
          if (parentBig && !selection.bigChapters.includes(parentBig)) {
            newSelection.bigChapters = [...selection.bigChapters, parentBig];
          }
        }
      } else if (node.level === "little") {
        const isCurrentlySelected = selection.littleChapters.includes(node.name);
        if (isCurrentlySelected) {
          newSelection.littleChapters = selection.littleChapters.filter(
            (n) => n !== node.name
          );
        } else {
          newSelection.littleChapters = [...selection.littleChapters, node.name];
          // 부모 중단원, 대단원도 선택
          const parentMiddle = node.path[2];
          const parentBig = node.path[1];
          if (parentMiddle && !selection.middleChapters.includes(parentMiddle)) {
            newSelection.middleChapters = [...selection.middleChapters, parentMiddle];
          }
          if (parentBig && !selection.bigChapters.includes(parentBig)) {
            newSelection.bigChapters = [...selection.bigChapters, parentBig];
          }
        }
      } else if (node.level === "concept") {
        // 개념 클릭 시 부모 소단원을 토글
        const parentLittle = node.path[3];
        if (!parentLittle) return;

        const isParentSelected = selection.littleChapters.includes(parentLittle);
        if (isParentSelected) {
          newSelection.littleChapters = selection.littleChapters.filter(
            (n) => n !== parentLittle
          );
        } else {
          newSelection.littleChapters = [...selection.littleChapters, parentLittle];
          // 부모 중단원, 대단원도 선택
          const parentMiddle = node.path[2];
          const parentBig = node.path[1];
          if (parentMiddle && !selection.middleChapters.includes(parentMiddle)) {
            newSelection.middleChapters = [...selection.middleChapters, parentMiddle];
          }
          if (parentBig && !selection.bigChapters.includes(parentBig)) {
            newSelection.bigChapters = [...selection.bigChapters, parentBig];
          }
        }
      }

      onSelectionChange(newSelection);
    },
    [selection, isLocked, onSelectionChange]
  );

  // 노드 확장 토글
  const handleExpandToggle = useCallback((nodeKey: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  // 전체 선택/해제 (하위도 모두 선택)
  const handleSelectAll = useCallback(() => {
    if (isLocked || !selection.curriculum) return;
    const nodes = treeData.get(selection.curriculum);
    if (!nodes) return;

    const allBigNames = nodes.map((n) => n.name);
    const allMiddleNames = nodes.flatMap((n) => n.children?.map((m) => m.name) || []);
    const allLittleNames = nodes.flatMap(
      (n) => n.children?.flatMap((m) => m.children?.map((l) => l.name) || []) || []
    );

    const isAllSelected = allBigNames.every((name) =>
      selection.bigChapters.includes(name)
    );

    if (isAllSelected) {
      onSelectionChange({
        ...selection,
        bigChapters: [],
        middleChapters: [],
        littleChapters: [],
      });
    } else {
      // 전체 선택: 대/중/소단원 모두 선택
      onSelectionChange({
        ...selection,
        bigChapters: allBigNames,
        middleChapters: allMiddleNames,
        littleChapters: allLittleNames,
      });
    }
  }, [selection, isLocked, treeData, onSelectionChange]);

  return (
    <div className="space-y-3">
      {/* 과목 선택 탭 */}
      <div className="flex gap-2 flex-wrap">
        {CURRICULUM_LIST.map(({ key, label, color }) => {
          const isSelected = selection.curriculum === key;
          const hasSavedSelection =
            curriculumSelections[key]?.bigChapters?.length > 0;

          return (
            <button
              key={key}
              onClick={() => handleCurriculumSelect(key)}
              disabled={isLocked && !isSelected}
              className={cn(
                "relative px-4 py-2 rounded-xl text-sm font-medium transition-all",
                "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
                isSelected
                  ? `${color} text-white border-transparent shadow-lg`
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                isLocked && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              {label}
              {/* 저장된 선택 표시 */}
              {hasSavedSelection && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}

        {/* 잠금 토글 */}
        <button
          onClick={onLockToggle}
          className={cn(
            "ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all",
            isLocked
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          {isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              잠김
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" />
              잠금
            </>
          )}
        </button>
      </div>

      {/* 트리 영역 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {selection.curriculum ? (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">
                  {selection.curriculum}
                </span>
                {selectionSummary && selectionSummary.conceptCount > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-indigo-600 font-medium">
                      {selectionSummary.text}
                    </span>
                    <span className="text-slate-400">
                      ({selectionSummary.conceptCount}개 개념)
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={handleSelectAll}
                disabled={isLocked}
                className={cn(
                  "text-xs font-medium text-indigo-600 hover:text-indigo-700",
                  isLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                {selection.bigChapters.length ===
                treeData.get(selection.curriculum)?.length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
            </div>

            {/* 트리 */}
            <div className="max-h-64 overflow-y-auto p-2">
              {treeData.get(selection.curriculum)?.map((node) => (
                <TreeNode
                  key={[...node.path, node.name].join("/")}
                  node={node}
                  level={0}
                  selection={selection}
                  onToggle={handleNodeToggle}
                  expandedNodes={expandedNodes}
                  onExpandToggle={handleExpandToggle}
                  disabled={isLocked}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">과목을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
