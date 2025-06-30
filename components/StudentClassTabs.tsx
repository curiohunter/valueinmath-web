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
          pathname.startsWith("/students")
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
    </div>
  );
} 