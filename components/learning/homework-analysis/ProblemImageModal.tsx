"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, ExternalLink } from "lucide-react";

interface ProblemImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  problemImageUrl: string | null;
  solutionImageUrl?: string | null;
  problemInfo: {
    bookTitle: string | null;
    page: string | null;
    problemNumber: string | null;
  };
}

export default function ProblemImageModal({
  isOpen,
  onClose,
  problemImageUrl,
  solutionImageUrl,
  problemInfo,
}: ProblemImageModalProps) {
  const [showSolution, setShowSolution] = React.useState(false);

  const currentImageUrl = showSolution && solutionImageUrl ? solutionImageUrl : problemImageUrl;
  const title = [
    problemInfo.bookTitle,
    problemInfo.page ? `p.${problemInfo.page}` : null,
    problemInfo.problemNumber,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {title || "문제 미리보기"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {solutionImageUrl && (
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setShowSolution(false)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      !showSolution
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    문제
                  </button>
                  <button
                    onClick={() => setShowSolution(true)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      showSolution
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    해설
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {currentImageUrl ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={currentImageUrl}
                alt={showSolution ? "문제 해설" : "문제 이미지"}
                className="max-w-full h-auto rounded-lg border border-slate-200 shadow-sm"
              />
              <a
                href={currentImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                새 탭에서 열기
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-slate-100 rounded-lg">
              <p className="text-slate-500">이미지를 불러올 수 없습니다</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
