"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Trophy, BookOpen } from "lucide-react"
import { WorksheetImportTab } from "./WorksheetImportTab"
import { KmmImportTab } from "./KmmImportTab"
import { SchoolExamImportTab } from "./SchoolExamImportTab"

interface SmartImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classes: Array<{ id: string; name: string; teacher_id?: string }>
  teachers: Array<{ id: string; name: string }>
  onImportComplete: () => void
}

export function SmartImportDialog({
  open,
  onOpenChange,
  classes,
  teachers,
  onImportComplete,
}: SmartImportDialogProps) {
  const handleImported = () => {
    onImportComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">스마트 가져오기</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="worksheet" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="worksheet" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              학습지 결과
            </TabsTrigger>
            <TabsTrigger value="kmm" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              KMM 경시대회
            </TabsTrigger>
            <TabsTrigger value="school-exam" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              기출문제 테스트
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="worksheet" className="mt-0">
              <WorksheetImportTab
                classes={classes}
                teachers={teachers}
                onImported={handleImported}
              />
            </TabsContent>
            <TabsContent value="kmm" className="mt-0">
              <KmmImportTab
                classes={classes}
                teachers={teachers}
                onImported={handleImported}
              />
            </TabsContent>
            <TabsContent value="school-exam" className="mt-0">
              <SchoolExamImportTab
                classes={classes}
                teachers={teachers}
                onImported={handleImported}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
