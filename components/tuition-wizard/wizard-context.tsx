"use client"

import { createContext, useContext, useReducer, type ReactNode } from "react"
import type { AppliedDiscount, AppliedTextbook } from "@/types/tuition"
import type { Campaign, CampaignParticipant } from "@/services/campaign-service"
import type { TextbookAssignment } from "@/types/textbook"

// --- 타입 ---

export type WizardStep = 1 | 2 | 3 | 4

export interface WizardState {
  currentStep: WizardStep
  isWizardActive: boolean

  // Step 2: 할인 (로컬 상태, Step 4에서 DB 반영)
  discountsByEntry: Record<string, AppliedDiscount[]> // key: `${classId}:${studentId}`
  policiesByStudent: Record<string, Campaign[]>
  pendingRewardsByStudent: Record<string, CampaignParticipant[]>

  // Step 3: 교재비 (로컬 상태)
  textbooksByEntry: Record<string, AppliedTextbook[]> // key: `${classId}:${studentId}`
  pendingTextbooksByStudent: Record<string, TextbookAssignment[]>
}

export type WizardAction =
  | { type: "ACTIVATE_WIZARD" }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_POLICIES"; data: Record<string, Campaign[]> }
  | { type: "SET_PENDING_REWARDS"; data: Record<string, CampaignParticipant[]> }
  | { type: "APPLY_DISCOUNT"; entryKey: string; discount: AppliedDiscount }
  | { type: "REMOVE_DISCOUNT"; entryKey: string; discountId: string }
  | { type: "SET_PENDING_TEXTBOOKS"; data: Record<string, TextbookAssignment[]> }
  | { type: "APPLY_TEXTBOOK"; entryKey: string; textbook: AppliedTextbook }
  | { type: "REMOVE_TEXTBOOK"; entryKey: string; assignmentId: string }
  | { type: "RESET" }

// --- 초기 상태 ---

const initialState: WizardState = {
  currentStep: 1,
  isWizardActive: false,
  discountsByEntry: {},
  policiesByStudent: {},
  pendingRewardsByStudent: {},
  textbooksByEntry: {},
  pendingTextbooksByStudent: {},
}

// --- Reducer ---

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "ACTIVATE_WIZARD":
      return { ...state, isWizardActive: true, currentStep: 2 }

    case "GO_TO_STEP":
      return { ...state, currentStep: action.step }

    case "NEXT_STEP": {
      const next = Math.min(state.currentStep + 1, 4) as WizardStep
      return { ...state, currentStep: next }
    }

    case "PREV_STEP": {
      const prev = Math.max(state.currentStep - 1, 1) as WizardStep
      return { ...state, currentStep: prev }
    }

    case "SET_POLICIES":
      return { ...state, policiesByStudent: action.data }

    case "SET_PENDING_REWARDS":
      return { ...state, pendingRewardsByStudent: action.data }

    case "APPLY_DISCOUNT": {
      const existing = state.discountsByEntry[action.entryKey] ?? []
      // 중복 방지
      if (existing.some((d) => d.id === action.discount.id)) return state
      return {
        ...state,
        discountsByEntry: {
          ...state.discountsByEntry,
          [action.entryKey]: [...existing, action.discount],
        },
      }
    }

    case "REMOVE_DISCOUNT": {
      const list = state.discountsByEntry[action.entryKey] ?? []
      return {
        ...state,
        discountsByEntry: {
          ...state.discountsByEntry,
          [action.entryKey]: list.filter((d) => d.id !== action.discountId),
        },
      }
    }

    case "SET_PENDING_TEXTBOOKS":
      return { ...state, pendingTextbooksByStudent: action.data }

    case "APPLY_TEXTBOOK": {
      const existing = state.textbooksByEntry[action.entryKey] ?? []
      if (existing.some((t) => t.assignmentId === action.textbook.assignmentId)) return state
      return {
        ...state,
        textbooksByEntry: {
          ...state.textbooksByEntry,
          [action.entryKey]: [...existing, action.textbook],
        },
      }
    }

    case "REMOVE_TEXTBOOK": {
      const list = state.textbooksByEntry[action.entryKey] ?? []
      return {
        ...state,
        textbooksByEntry: {
          ...state.textbooksByEntry,
          [action.entryKey]: list.filter((t) => t.assignmentId !== action.assignmentId),
        },
      }
    }

    case "RESET":
      return { ...initialState }

    default:
      return state
  }
}

// --- Context ---

interface WizardContextValue {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error("useWizard must be used within WizardProvider")
  return ctx
}
