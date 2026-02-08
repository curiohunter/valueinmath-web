import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function StudentClassTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 border-b mb-2">
      <Link
        href="/students"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/students"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학생 관리
      </Link>
      <Link
        href="/students/classes"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/students/classes")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        반 관리
      </Link>
      <Link
        href="/students/consultations"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/students/consultations")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        상담 관리
      </Link>
      <Link
        href="/students/tuition"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/students/tuition"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학원비
      </Link>
      <Link
        href="/students/tuition-history"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/students/tuition-history"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        학원비 이력
      </Link>
      <Link
        href="/students/entrance-tests"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/students/entrance-tests"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        입학테스트
      </Link>
      <Link
        href="/students/enrollment-history"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/students/enrollment-history"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        수강 이력
      </Link>
      <Link
        href="/students/tuition-sessions"
        className={clsx(
          "px-4 py-2 font-semibold flex items-center gap-1.5",
          pathname.startsWith("/students/tuition-sessions")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        수업료 계산
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 leading-none">
          베타
        </span>
      </Link>
    </div>
  );
} 