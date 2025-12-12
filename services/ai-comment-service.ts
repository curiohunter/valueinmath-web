/**
 * AI 코멘트 생성 서비스
 * 개선된 버전: StudentLearningData 사용
 */

import { generateText, generatePromptHash } from '@/lib/llm-client'
import type {
  SelectedPhrases,
  StudentLearningData,
  CommentTone,
  StudyLogDetail,
  TestLogDetail,
  PrevMonthSummary,
} from '@/types/comment-assistant'

// ============================================
// 프로토콜 버전 (변경 시 업데이트)
// ============================================

export const PROTOCOL_VERSION = '2025-12-02'

// ============================================
// 프롬프트 생성 유틸리티
// ============================================

function formatSelectedPhrases(phrases: SelectedPhrases): string {
  const sections: string[] = []

  if (phrases.greeting.length > 0) {
    sections.push(`- 인사말: ${phrases.greeting.join(', ')}`)
  }
  if (phrases.progress.length > 0) {
    sections.push(`- 현재 진도: ${phrases.progress.join(', ')}`)
  }
  if (phrases.attitude_positive.length > 0) {
    sections.push(`- 긍정적 태도: ${phrases.attitude_positive.join(', ')}`)
  }
  if (phrases.attitude_needs_improvement.length > 0) {
    sections.push(`- 개선 필요 사항: ${phrases.attitude_needs_improvement.join(', ')}`)
  }
  if (phrases.attendance_issue.length > 0) {
    sections.push(`- 출결 이슈: ${phrases.attendance_issue.join(', ')}`)
  }
  if (phrases.homework_issue.length > 0) {
    sections.push(`- 과제 이슈: ${phrases.homework_issue.join(', ')}`)
  }
  if (phrases.methodology.length > 0) {
    sections.push(`- 학습 방법: ${phrases.methodology.join(', ')}`)
  }
  if (phrases.achievement.length > 0) {
    sections.push(`- 발전 사항: ${phrases.achievement.join(', ')}`)
  }
  if (phrases.future_plan.length > 0) {
    sections.push(`- 향후 계획: ${phrases.future_plan.join(', ')}`)
  }
  if (phrases.closing.length > 0) {
    sections.push(`- 마무리: ${phrases.closing.join(', ')}`)
  }

  return sections.join('\n')
}

function getToneInstruction(tone: CommentTone): string {
  switch (tone) {
    case 'praise':
      return '칭찬 위주로 작성하세요. 학생의 장점과 발전 사항을 강조하세요.'
    case 'feedback':
      return '개선점 중심으로 작성하세요. 건설적인 피드백을 제공하되, 격려의 말씀도 함께 넣어주세요.'
    default:
      return '균형잡힌 톤으로 작성하세요. 장점과 개선점을 적절히 조화롭게 표현하세요.'
  }
}

// ============================================
// 학습 데이터 포맷팅
// ============================================

function formatStudyLogs(logs: StudyLogDetail[]): string {
  if (logs.length === 0) return '(학습일지 데이터 없음)'

  const lines = logs.map(log => {
    const parts = [
      `${log.date}`,
      `출석:${log.attendanceLabel}(${log.attendance})`,
      `숙제:${log.homeworkLabel}(${log.homework})`,
      `집중:${log.focusLabel}(${log.focus})`,
    ]

    if (log.classContent) {
      parts.push(`수업:${log.classContent}`)
    }
    if (log.homeworkContent) {
      parts.push(`숙제내용:${log.homeworkContent}`)
    }

    return parts.join(' | ')
  })

  return lines.join('\n')
}

function formatTestLogs(logs: TestLogDetail[]): string {
  if (logs.length === 0) return '(테스트 데이터 없음)'

  const lines = logs.map(log => {
    let line = `${log.date} | ${log.testType} | ${log.testName} | ${log.score}점`

    // 반평균, 전체평균 추가 (있는 경우)
    if (log.classAvg !== undefined || log.overallAvg !== undefined) {
      const avgParts: string[] = []
      if (log.classAvg !== undefined) avgParts.push(`반평균:${log.classAvg}점`)
      if (log.overallAvg !== undefined) avgParts.push(`전체평균:${log.overallAvg}점`)
      line += ` (${avgParts.join(', ')})`
    }

    return line
  })

  return lines.join('\n')
}

function formatPrevMonthSummary(prev: PrevMonthSummary): string {
  return `- 수업일수: ${prev.totalDays}일
- 출석률: ${prev.attendanceRate}%
- 숙제 평균: ${prev.homeworkAvg}/5점
- 집중도 평균: ${prev.focusAvg}/5점
- 테스트: ${prev.testCount}회, 평균 ${prev.testAvgScore}점`
}

function calculateTrendFromData(
  currentLogs: StudyLogDetail[],
  currentTests: TestLogDetail[],
  prevMonth?: PrevMonthSummary
): { score: string; attendance: string; homework: string; focus: string } {
  // 현재 월 평균 계산
  const validAttendance = currentLogs.filter(l => l.attendance > 0)
  const currentAttendanceRate = validAttendance.length > 0
    ? (validAttendance.filter(l => [5, 4, 2].includes(l.attendance)).length / validAttendance.length) * 100
    : 0

  const validHomework = currentLogs.filter(l => l.homework > 0)
  const currentHomeworkAvg = validHomework.length > 0
    ? validHomework.reduce((sum, l) => sum + l.homework, 0) / validHomework.length
    : 0

  const validFocus = currentLogs.filter(l => l.focus > 0)
  const currentFocusAvg = validFocus.length > 0
    ? validFocus.reduce((sum, l) => sum + l.focus, 0) / validFocus.length
    : 0

  const validTests = currentTests.filter(t => t.score > 0)
  const currentTestAvg = validTests.length > 0
    ? validTests.reduce((sum, t) => sum + t.score, 0) / validTests.length
    : 0

  if (!prevMonth) {
    return { score: '데이터 없음', attendance: '데이터 없음', homework: '데이터 없음', focus: '데이터 없음' }
  }

  const getTrend = (current: number, prev: number, threshold: number): string => {
    const diff = current - prev
    if (diff > threshold) return '향상 ↑'
    if (diff < -threshold) return '하락 ↓'
    return '유지 →'
  }

  return {
    score: getTrend(currentTestAvg, prevMonth.testAvgScore, 5),
    attendance: getTrend(currentAttendanceRate, prevMonth.attendanceRate, 5),
    homework: getTrend(currentHomeworkAvg, prevMonth.homeworkAvg, 0.3), // 1-5 스케일이므로 0.3
    focus: getTrend(currentFocusAvg, prevMonth.focusAvg, 0.3),
  }
}

// ============================================
// 메인 프롬프트 빌더
// ============================================

export function buildPrompt(
  studentName: string,
  grade: string,
  school: string | undefined,
  className: string | undefined,
  month: number,
  selectedPhrases: SelectedPhrases,
  learningData?: StudentLearningData,
  tone: CommentTone = 'balanced'
): string {
  let prompt = `당신은 한국 수학학원의 베테랑 선생님입니다. 학부모님께 보내는 월별 학습 보고서를 작성해주세요.

## 학생 정보
- 이름: ${studentName}
- 학년: ${grade}
${school ? `- 학교: ${school}` : ''}
${className ? `- 담당 반: ${className}` : ''}
- 보고서 월: ${month}월

`

  // 학습 데이터 추가
  if (learningData) {
    const { currentMonth, prevMonth } = learningData
    const trend = calculateTrendFromData(currentMonth.studyLogs, currentMonth.testLogs, prevMonth)

    prompt += `## ${month}월 학습일지 (상세)
${formatStudyLogs(currentMonth.studyLogs)}

## ${month}월 테스트 기록 (상세)
${formatTestLogs(currentMonth.testLogs)}

`

    if (prevMonth) {
      prompt += `## ${prevMonth.month}월 (이전 달) 요약
${formatPrevMonthSummary(prevMonth)}

## 월별 추세 비교 (${prevMonth.month}월 → ${month}월)
- 테스트 점수: ${trend.score}
- 출석률: ${trend.attendance}
- 숙제 수행: ${trend.homework}
- 집중도: ${trend.focus}

`
    }
  }

  prompt += `## 선생님이 선택한 키워드
${formatSelectedPhrases(selectedPhrases)}

## 톤 설정
${getToneInstruction(tone)}

## 핵심 작성 원칙

### 1. 테스트 점수 해석 (매우 중요!)
- **절대 점수만으로 판단하지 마세요.** 반드시 반평균, 전체평균과 비교하여 해석하세요.
- 점수가 낮아도 평균보다 높으면: "어려운 시험이었지만 평균 이상의 성과를 보였습니다"
- 점수가 높아도 평균보다 낮으면: 개선 필요 영역으로 언급
- 점수 하락 시 반드시 난이도 맥락 제공: "이번 테스트는 상 난이도 문제가 많아 전체적으로 평균이 낮았습니다"
- 상대적 위치 언급: "같은 반에서 상위권 성적", "평균 수준의 성과" 등

### 2. 학생별 강점/약점 분석
- 데이터 패턴에서 학생 고유의 특성을 파악하세요:
  - 기본 문제 vs 심화 문제 수행 차이
  - 특정 단원/유형에서의 강점
  - 컨디션 변화 패턴 (월초 vs 월말)
- "중난이도는 잘하지만 상 난이도에서 어려움" 같은 구체적 분석 제공

### 3. 학부모 관점 고려
- 점수 하락 시 불안감 완화: 난이도, 상대평가, 개선 계획을 함께 제시
- 현실적 기대 설정: "꾸준히 학습하면 점차 향상될 것"
- 구체적 근거 제시: 날짜, 교재명, 단원명 등 명확하게 언급
- 긍정적 요소 먼저, 개선점은 건설적으로

### 4. 구체성 확보
- 교재명 정확히 언급 (수업 내용에서 추출)
- 날짜별 특이사항 언급 ("15일, 19일에 보강 진행")
- 추상적 표현 지양: "다양한 개념" → "원의 방정식, 도형의 이동 단원"
- 향후 계획도 구체적으로: "복습 예정" → "다음 주 1-2단원 재테스트 예정"

### 5. 문장 스타일
- 학생 이름: 존칭 없이 "[이름]이는" 또는 "[이름]는" 형태
- 학부모 호칭: "[이름] 어머니" (첫 인사에서)
- 따뜻하지만 전문적인 톤 유지
- 판에 박힌 마무리 지양: 학생별 맞춤 응원 메시지

## 구조 가이드
1. **인사말**: 간단한 인사 + 보고서 안내
2. **현재 진도**: 구체적 교재명, 단원, 학습 내용
3. **학습 태도**: 출석, 숙제, 집중도 패턴 분석 (날짜별 변화 포함)
4. **테스트 성과**: 점수 + 난이도 맥락 + 상대평가 + 강점/약점 분석
5. **향후 계획**: 구체적인 학습 방향 및 보완 계획
6. **마무리**: 학생 맞춤 응원 메시지

## 분량
800~1200자 내외

학습 보고서:`

  return prompt
}

// ============================================
// 부분 재생성 프롬프트
// ============================================

export function buildSectionPrompt(
  sectionType: 'greeting' | 'body' | 'plan',
  originalContent: string,
  selectedPhrases: SelectedPhrases,
  studentName: string,
  month: number,
  tone: CommentTone = 'balanced'
): string {
  const sectionNames: Record<string, string> = {
    greeting: '인사말',
    body: '본문 (학습 상황 및 태도)',
    plan: '향후 계획 및 마무리',
  }

  return `다음은 학생 "${studentName}"의 ${month}월 학습 보고서입니다.

## 기존 내용
${originalContent}

## 요청
위 보고서의 "${sectionNames[sectionType]}" 부분만 다시 작성해주세요.

## 참고할 키워드
${formatSelectedPhrases(selectedPhrases)}

## 톤 설정
${getToneInstruction(tone)}

수정된 ${sectionNames[sectionType]}:`
}

// ============================================
// 메인 생성 함수
// ============================================

export interface GenerateOptions {
  studentName: string
  grade: string
  school?: string
  className?: string
  month: number
  selectedPhrases: SelectedPhrases
  learningData?: StudentLearningData
  tone?: CommentTone
}

export async function generateComment(options: GenerateOptions): Promise<{
  content: string
  tokensInput: number
  tokensOutput: number
  model: string
  durationMs: number
  cost: number
  promptHash: string
}> {
  const prompt = buildPrompt(
    options.studentName,
    options.grade,
    options.school,
    options.className,
    options.month,
    options.selectedPhrases,
    options.learningData,
    options.tone
  )

  const result = await generateText({ prompt })

  return {
    content: result.text,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    model: result.model,
    durationMs: result.durationMs,
    cost: result.cost,
    promptHash: result.promptHash,
  }
}

// ============================================
// 부분 재생성 함수
// ============================================

export async function regenerateSection(
  sectionType: 'greeting' | 'body' | 'plan',
  originalContent: string,
  options: Omit<GenerateOptions, 'learningData'>
): Promise<{
  content: string
  tokensInput: number
  tokensOutput: number
  model: string
  durationMs: number
  cost: number
  promptHash: string
}> {
  const prompt = buildSectionPrompt(
    sectionType,
    originalContent,
    options.selectedPhrases,
    options.studentName,
    options.month,
    options.tone
  )

  const result = await generateText({
    prompt,
    maxTokens: 500, // 섹션별 재생성은 토큰 적게 사용
  })

  return {
    content: result.text,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    model: result.model,
    durationMs: result.durationMs,
    cost: result.cost,
    promptHash: result.promptHash,
  }
}
