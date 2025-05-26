import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const scoreOptions = {
  attendance: [
    { value: 1, label: "❌ 결석" },
    { value: 2, label: "🏃 조퇴" },
    { value: 3, label: "🚶 30분내 등원" },
    { value: 4, label: "⏰ 15분내 등원" },
    { value: 5, label: "🟢 수업시작전 등원" },
  ],
  homework: [
    { value: 1, label: "❌ 결석" },
    { value: 2, label: "📝 보강필요" },
    { value: 3, label: "🔍 추가 추적 필요" },
    { value: 4, label: "✅ 90% 이상" },
    { value: 5, label: "🏅 100% 마무리" },
  ],
  focus: [
    { value: 1, label: "❌ 결석" },
    { value: 2, label: "⚠️ 조치필요" },
    { value: 3, label: "😐 산만하나 진행가능" },
    { value: 4, label: "👍 대체로 잘참여" },
    { value: 5, label: "🔥 매우 열의있음" },
  ],
};

type ScoreType = keyof typeof scoreOptions;

interface ScoreDropdownProps {
  value: number;
  onChange: (value: number) => void;
  type: ScoreType;
}

export function ScoreDropdown({ value, onChange, type }: ScoreDropdownProps) {
  return (
    <Select value={String(value)} onValueChange={v => onChange(Number(v))}>
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {scoreOptions[type].map(opt => (
          <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 