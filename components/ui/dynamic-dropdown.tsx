import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DynamicDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAddOption: (option: string) => void;
  placeholder?: string;
}

export function DynamicDropdown({ options, value, onChange, onAddOption, placeholder }: DynamicDropdownProps) {
  const [newOption, setNewOption] = React.useState("");
  const handleAdd = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      onAddOption(newOption.trim());
      setNewOption("");
    }
  };
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={placeholder || "선택"} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={newOption}
        onChange={e => setNewOption(e.target.value)}
        placeholder="새 옵션 입력"
        className="w-32"
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
      />
      <Button type="button" size="icon" variant="outline" onClick={handleAdd} disabled={!newOption.trim() || options.includes(newOption.trim())}>
        <Plus size={18} />
      </Button>
    </div>
  );
} 