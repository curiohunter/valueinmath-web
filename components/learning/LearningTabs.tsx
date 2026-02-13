import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function LearningTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 border-b mb-2">
      <Link
        href="/learning"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/learning"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학습 관리
      </Link>
      <Link
        href="/learning/test-logs"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/test-logs")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        테스트 관리
      </Link>
      <Link
        href="/learning/makeup-classes"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/makeup-classes")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        보강 관리
      </Link>
      <Link
        href="/learning/school-exams"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/school-exams")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학교 시험지
      </Link>
      <Link
        href="/learning/school-exam-scores"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/school-exam-scores")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학교 시험 성적
      </Link>
      <Link
        href="/learning/learning-history"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/learning-history")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학습 이력
      </Link>
      <Link
        href="/learning/test-history"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/test-history")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        테스트 이력
      </Link>
      <Link
        href="/learning/homework-analysis"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/homework-analysis")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        숙제 분석
      </Link>
      <Link
        href="/learning/comments"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/learning/comments")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학습 코멘트
      </Link>
      <Link
        href="/learning/attendance"
        className={clsx(
          "px-4 py-2 font-semibold flex items-center gap-1.5 ml-auto",
          pathname.startsWith("/learning/attendance")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        출석부
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 leading-none">
          베타
        </span>
      </Link>
    </div>
  );
} 