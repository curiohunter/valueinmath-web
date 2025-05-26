import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BulkDatePickerProps {
  date: string;
  onChange: (date: string) => void;
  onApplyAll: () => void;
}

export function BulkDatePicker({ date, onChange, onApplyAll }: BulkDatePickerProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Input
        type="date"
        value={date}
        onChange={e => onChange(e.target.value)}
        className="w-40"
      />
      <Button type="button" variant="outline" onClick={onApplyAll}>
        일괄 적용
      </Button>
    </div>
  );
} 