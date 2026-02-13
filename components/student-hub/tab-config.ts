export interface SubTabConfig {
  id: string
  label: string
}

export interface TabGroupConfig {
  id: string
  label: string
  subTabs: SubTabConfig[]
}

export const TAB_GROUPS: TabGroupConfig[] = [
  {
    id: "basic",
    label: "기본정보",
    subTabs: [
      { id: "info", label: "학생 정보" },
      { id: "consultations", label: "상담 이력" },
      { id: "enrollment-history", label: "반 이력" },
    ],
  },
  {
    id: "tuition",
    label: "수업료",
    subTabs: [
      { id: "tuition-sessions", label: "수업료 계산" },
      { id: "tuition-history", label: "학원비 이력" },
    ],
  },
  {
    id: "learning",
    label: "학습",
    subTabs: [
      { id: "attendance", label: "출석" },
      { id: "makeup", label: "보강" },
      { id: "daily-work", label: "학습 데이터" },
      { id: "homework-analysis", label: "숙제 분석" },
    ],
  },
]

export const DEFAULT_TAB = TAB_GROUPS[0].id
export const DEFAULT_SUB_TAB = TAB_GROUPS[0].subTabs[0].id
