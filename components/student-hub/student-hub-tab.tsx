"use client"

import { useStudentHub } from "./hooks/use-student-hub"
import { StudentListPanel } from "./student-list-panel"
import { StudentDetailPanel } from "./student-detail-panel"
import { EmptyState } from "./empty-state"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"

export function StudentHubTab() {
  const isMobile = useIsMobile()
  const {
    selectedStudentId,
    activeTab,
    activeSubTab,
    showDetailOnMobile,
    selectStudent,
    clearStudent,
    switchTab,
    switchSubTab,
    goBackToList,
  } = useStudentHub()

  const handleStudentDeleted = () => {
    clearStudent()
  }

  // Mobile: stack layout
  if (isMobile) {
    if (showDetailOnMobile && selectedStudentId) {
      return (
        <div className="h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
          <StudentDetailPanel
            studentId={selectedStudentId}
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onSwitchTab={switchTab}
            onSwitchSubTab={switchSubTab}
            onBack={goBackToList}
            showBackButton
            onStudentDeleted={handleStudentDeleted}
          />
        </div>
      )
    }

    return (
      <div className="h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
        <StudentListPanel
          selectedStudentId={selectedStudentId}
          onSelectStudent={selectStudent}
        />
      </div>
    )
  }

  // Desktop: resizable split view
  return (
    <div className="h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={18} maxSize={40}>
          <StudentListPanel
            selectedStudentId={selectedStudentId}
            onSelectStudent={selectStudent}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
          {selectedStudentId ? (
            <StudentDetailPanel
              studentId={selectedStudentId}
              activeTab={activeTab}
              activeSubTab={activeSubTab}
              onSwitchTab={switchTab}
              onSwitchSubTab={switchSubTab}
              onStudentDeleted={handleStudentDeleted}
            />
          ) : (
            <EmptyState />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
