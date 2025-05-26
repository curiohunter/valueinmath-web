import * as React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Student {
  id: string;
  name: string;
}

interface ClassAccordionProps {
  className: string;
  students: Student[];
  onAddStudent: (student: Student) => void;
  onAddAll: () => void;
  addedStudentIds: string[];
}

export function ClassAccordion({ className, students, onAddStudent, onAddAll, addedStudentIds }: ClassAccordionProps) {
  return (
    <Accordion type="single" collapsible className="mb-2">
      <AccordionItem value={className}>
        <div className="flex items-center gap-2">
          <AccordionTrigger className="flex-1 text-lg font-semibold">{className}</AccordionTrigger>
          <Button size="sm" variant="outline" onClick={onAddAll}>
            <Plus className="w-4 h-4 mr-1" /> 전체추가
          </Button>
        </div>
        <AccordionContent>
          <Card className="mt-2">
            <CardHeader className="font-medium text-base">반 구성원</CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {students.map(s => (
                <div key={s.id} className="flex items-center gap-2 border rounded px-3 py-1 bg-gray-50">
                  <span>{s.name}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onAddStudent(s)}
                    disabled={addedStudentIds.includes(s.id)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
} 