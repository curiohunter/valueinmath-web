"use client"

import { cn } from "@/lib/utils"
import { useWizard, type WizardStep } from "./wizard-context"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "수업료 계산" },
  { step: 2, label: "할인 적용" },
  { step: 3, label: "교재비" },
  { step: 4, label: "확인/저장" },
]

interface WizardStepsProps {
  onPrev?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  nextLabel?: string
}

export function WizardStepIndicator() {
  const { state, dispatch } = useWizard()

  return (
    <div className="flex items-center justify-center gap-1 py-3 px-4 bg-white border-b border-slate-200">
      {STEPS.map(({ step, label }, i) => {
        const isActive = state.currentStep === step
        const isCompleted = state.currentStep > step
        const isClickable = step < state.currentStep

        return (
          <div key={step} className="flex items-center">
            {/* 스텝 원 + 라벨 */}
            <button
              type="button"
              onClick={() => isClickable && dispatch({ type: "GO_TO_STEP", step })}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                isActive && "text-indigo-700 font-semibold",
                isCompleted && "text-green-600 cursor-pointer hover:bg-green-50",
                !isActive && !isCompleted && "text-slate-400",
                isClickable && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border transition-colors",
                  isActive && "border-indigo-500 bg-indigo-500 text-white",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-slate-300 text-slate-400",
                )}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : step}
              </span>
              <span>{label}</span>
            </button>

            {/* 연결선 */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 h-px mx-1",
                  state.currentStep > step ? "bg-green-400" : "bg-slate-200",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function WizardNavigation({ onPrev, onNext, nextDisabled, nextLabel }: WizardStepsProps) {
  const { state } = useWizard()

  // Step 1에서는 네비게이션 숨김 (기존 UI에 "다음" 버튼이 별도로 있음)
  if (state.currentStep === 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        className="text-xs"
      >
        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
        이전
      </Button>

      {state.currentStep < 4 ? (
        <Button
          size="sm"
          onClick={onNext}
          disabled={nextDisabled}
          className="text-xs"
        >
          {nextLabel ?? "다음"}
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ) : (
        // Step 4 "저장" 버튼은 step-review.tsx에서 처리
        <div />
      )}
    </div>
  )
}
