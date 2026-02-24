/**
 * 한글 제목 → URL slug 변환 유틸리티
 * 한글 URL은 SEO에 유리하므로 한글 slug 사용
 */

/**
 * 제목을 URL-safe slug로 변환
 * - 특수문자 제거, 공백을 하이픈으로 대체
 * - 60자 제한
 */
export function generateSlug(title: string): string {
  return title
    .trim()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '') // 한글, 영숫자, 공백, 하이픈만 유지
    .replace(/\s+/g, '-')                      // 공백 → 하이픈
    .replace(/-+/g, '-')                       // 연속 하이픈 제거
    .replace(/^-|-$/g, '')                     // 양끝 하이픈 제거
    .slice(0, 60)
    .toLowerCase()
}

/**
 * slug 유니크 보장 (중복 시 -2, -3 등 suffix 추가)
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug
  let counter = 2

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
