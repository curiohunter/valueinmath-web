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

  const lines = logs.map(log =>
    `${log.date} | ${log.testType} | ${log.testName} | ${log.score}점`
  )

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

## 작성 지침
1. 위 학습 데이터와 키워드를 자연스럽게 연결하여 작성하세요.
2. 날짜별 데이터를 분석하여 패턴을 파악하고 언급하세요:
   - 출석 패턴 (예: "월초에 지각이 있었지만 후반부터 개선")
   - 숙제 수행 추세 (예: "꾸준히 100% 마무리")
   - 집중도 변화 (예: "점점 적극적으로 참여")
   - 테스트 점수 추이 (예: "70점 → 85점 → 92점으로 꾸준히 상승")
3. 수업 내용과 숙제 내용을 언급하여 구체적인 학습 진도를 보여주세요.
4. 이전 달과의 비교를 통해 발전 또는 개선 필요 부분을 언급하세요.
5. 구조: 인사말 → 현재 진도 및 수업 내용 → 학습 태도 분석 → 테스트 성과 → 향후 계획 → 마무리
6. 800~1200자 내외로 작성하세요.
7. 학부모님 입장에서 읽기 편한 따뜻한 문체로 작성하세요.
8. 학생 이름은 존칭 없이 사용하고, 호칭이 필요할 때는 "[이름]이는" 또는 "[이름]는" 형태로 자연스럽게 사용하세요.

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
