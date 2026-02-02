"use client";

import React from "react";
import { SelfStudyCategory, SELF_STUDY_CATEGORY_CONFIG } from "./types";

interface SelfStudyBadgeProps {
  category: SelfStudyCategory;
  count: number;
  correctRate?: number;
}

export default function SelfStudyBadge({
  category,
  count,
  correctRate,
}: SelfStudyBadgeProps) {
  const config = SELF_STUDY_CATEGORY_CONFIG[category];

  if (count === 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      <span className="font-bold">{count}문제</span>
      {correctRate !== undefined && (
        <span className="opacity-80">({correctRate}%)</span>
      )}
    </div>
  );
}
