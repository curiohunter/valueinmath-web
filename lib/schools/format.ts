/**
 * 학교명 포맷팅 유틸리티
 *
 * 학교명을 UI에 표시하기 위한 일관된 포맷 제공
 */

/**
 * School 객체 타입 (schools 테이블)
 */
export interface SchoolForDisplay {
  name: string
  short_name?: string | null
  school_type?: string | null
}

/**
 * 학교 표시명 가져오기 (short_name 우선, 없으면 formatSchoolName)
 *
 * 예시:
 * - { name: "동국대학교사범대학부속가람고등학교", short_name: "가람고" } → "가람고"
 * - { name: "대원고등학교", short_name: null } → "대원고"
 */
export function getSchoolDisplayName(school: SchoolForDisplay | null | undefined): string {
  if (!school) return ''
  return school.short_name || formatSchoolName(school.name)
}

/**
 * 학교 + 학년 조합 (School 객체용)
 *
 * 예시:
 * - ({ name: "가람고", short_name: "가람고" }, 1) → "가람고 1"
 */
export function formatSchoolObjectGrade(
  school: SchoolForDisplay | null | undefined,
  grade: number | null | undefined
): string {
  const schoolName = getSchoolDisplayName(school)

  if (!schoolName && !grade) return '-'
  if (!schoolName) return `${grade}학년`
  if (!grade) return schoolName

  return `${schoolName} ${grade}`
}

/**
 * 학교명에서 핵심 이름만 추출
 *
 * 예시:
 * - "대원고등학교" → "대원고"
 * - "동국대학교사범대학부속가람고등학교" → "가람고"
 * - "양진중학교" → "양진중"
 * - "서울광진초등학교" → "광진초"
 * - "가람고" → "가람고"
 * - null/undefined → ""
 */
export function formatSchoolName(schoolName: string | null | undefined): string {
  if (!schoolName) return ''

  // 1. 접미사 제거: 초등학교, 중학교, 고등학교, 학교
  let name = schoolName
    .replace(/초등학교$/, '초')
    .replace(/중학교$/, '중')
    .replace(/고등학교$/, '고')
    .replace(/학교$/, '')

  // 2. 긴 접두사 패턴 제거 (대학교 부속, 사범대학 등)
  // "동국대학교사범대학부속" 같은 패턴
  const prefixPatterns = [
    /^[가-힣]+대학교사범대학부속/,  // 동국대학교사범대학부속
    /^[가-힣]+대학교부속/,           // XX대학교부속
    /^[가-힣]+대학부속/,             // XX대학부속
    /^서울/,                         // 서울XX초 → XX초
  ]

  for (const pattern of prefixPatterns) {
    const match = name.match(pattern)
    if (match && name.length > match[0].length) {
      // 접두사를 제거해도 의미있는 이름이 남는 경우에만
      const remaining = name.replace(pattern, '')
      if (remaining.length >= 2) {
        name = remaining
        break
      }
    }
  }

  return name
}

/**
 * 학교명 + 학년 조합 포맷
 *
 * 예시:
 * - ("대원고등학교", 2) → "대원고 2"
 * - ("양진중학교", 3) → "양진중 3"
 * - (null, 2) → "2학년"
 * - ("대원고등학교", null) → "대원고"
 */
export function formatSchoolGrade(
  school: string | null | undefined,
  grade: number | null | undefined
): string {
  const schoolName = formatSchoolName(school)

  if (!schoolName && !grade) return '-'
  if (!schoolName) return `${grade}학년`
  if (!grade) return schoolName

  return `${schoolName} ${grade}`
}

/**
 * 학교 유형 약어
 */
export function getSchoolTypeShort(schoolType: string | null | undefined): string {
  if (!schoolType) return ''

  const typeMap: Record<string, string> = {
    '초등학교': '초',
    '중학교': '중',
    '고등학교': '고',
    '특수학교': '특수',
  }

  return typeMap[schoolType] || schoolType
}
