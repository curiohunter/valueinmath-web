# 밸류인 학원관리시스템 개발 가이드라인

## 프로젝트 개요

### 기술 스택
- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: SWR + React Hooks
- **Deployment**: Vercel

### 핵심 기능
- 학생/직원 관리 시스템
- 수업 및 출결 관리
- 실시간 채팅 (글로벌 챗 유지, /chat 페이지 제거됨)
- ✅ 일정 관리 (FullCalendar 마이그레이션 완료)
- 관리자 승인 기반 사용자 시스템
- ✅ Google OAuth 로그인 (Production 설정 완료)

## 파일 수정 우선순위

### 필수 수정 순서
1. **types/** - 타입 정의 먼저 수정
2. **database/** - SQL 스크립트 및 RLS 정책 확인
3. **services/** - 비즈니스 로직 구현
4. **hooks/** - 데이터 페칭 훅 생성/수정
5. **components/** - UI 컴포넌트 마지막 수정
6. **app/** - 페이지 및 라우팅 최종 연결

### 핵심 파일 맵핑
- `types/supabase.ts` - 자동생성 DB 타입 (수정 금지)
- `types/*.ts` - 커스텀 타입 정의
- `lib/supabase/browser.ts` - 클라이언트 컴포넌트용
- `lib/supabase/server.ts` - 서버 컴포넌트용
- `lib/supabase/admin.ts` - 관리자 작업용
- `middleware.ts` - 인증 및 라우팅 보호

## Supabase 통합 패턴

### 클라이언트별 사용 규칙 (2025-07-05 업데이트)
```typescript
// Client Component에서 - AuthProvider 사용
import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/auth/client";

export default function Component() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  // ... component logic
}

// Server Component에서
import { createServerClient } from '@/lib/auth/server'

// API Route에서 - createRouteHandlerClient 사용
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
const supabase = createRouteHandlerClient<Database>({ 
  cookies: () => cookieStore as any 
});

// ⚠️ 절대 사용 금지
import { supabaseClient } from "@/lib/supabase/client"; // Auth session 문제 발생
import { useAuth } from "@/contexts/AuthContext"; // 이전 버전, 제거됨
```

### 데이터 작업 규칙
- **읽기**: SWR 훅 사용 (`hooks/` 디렉토리)
- **쓰기**: 서비스 함수 사용 (`services/` 디렉토리)
- **실시간**: Supabase Realtime 구독
- **인증**: middleware.ts에서 처리

### Upsert/Insert 필수 패턴 (2025-07-03 추가)
```typescript
// ❌ 잘못된 패턴 - ID가 undefined인 경우 null로 변환되어 에러 발생
const { error } = await supabase
  .from("table")
  .upsert(rows.map(r => ({
    id: r.id, // r.id가 undefined면 null이 되어 NOT NULL 제약조건 위반
    ...otherFields
  })));

// ✅ 올바른 패턴 - 기존/새 레코드 분리
const existingRows = rows.filter(r => r.id);
const newRows = rows.filter(r => !r.id);

// 기존 레코드 업데이트 (ID 포함)
if (existingRows.length > 0) {
  const { error } = await supabase
    .from("table")
    .upsert(existingRows.map(r => ({
      id: r.id,
      ...fields,
      last_modified_by: currentUserId
    })), { onConflict: "id" });
}

// 새 레코드 삽입 (ID 제외, 자동생성)
if (newRows.length > 0) {
  const { error } = await supabase
    .from("table")
    .insert(newRows.map(r => ({
      ...fields, // id 필드 제외
      created_by: teacherId // 반 담당선생님 ID
    })));
}
```

### created_by / last_modified_by 규칙
- **created_by**: 해당 반의 담당선생님 ID 설정 (보고서 분류용)
- **last_modified_by**: 실제 수정한 사용자 ID 설정 (감사 추적용)

### RLS 정책 준수
- 직접 SQL 실행 금지
- admin 클라이언트는 최소한으로 사용
- 모든 테이블에 RLS 정책 필수

## 컴포넌트 개발 표준

### 디렉토리 구조
```
components/
├── ui/          # shadcn/ui 기본 컴포넌트
├── layout/      # 레이아웃 컴포넌트
├── landing/     # 랜딩 페이지 섹션
├── chat/        # 채팅 관련
├── schedules/   # 일정 관련
└── [feature]/   # 기능별 컴포넌트
```

### 컴포넌트 작성 규칙
- shadcn/ui 컴포넌트 우선 사용
- 커스텀 컴포넌트는 기존 패턴 따르기
- Props 인터페이스 명시적 정의
- 한국어 UI 텍스트 사용

### 스타일링 규칙
- Tailwind 유틸리티 클래스 우선
- cn() 헬퍼로 클래스 병합
- dark: 프리픽스로 다크모드 지원
- CSS Modules는 복잡한 애니메이션에만 사용

## 현재 진행 중인 마이그레이션

### ✅ FullCalendar 전환 (완료 - 2025-07-01)
- **제거됨**: `N8nChatSidebar.tsx`, `GoogleCalendarEmbed.tsx`
- **완성됨**: `FullCalendarWrapper.tsx`, `DashboardCalendar.tsx`
- **특징**: 
  - Google Calendar 스타일 UI
  - 날짜별 그룹핑 표시
  - KST 타임존 완벽 지원
  - 48개 구글 캘린더 이벤트 임포트 완료

### SaaS 멀티테넌시 준비
- **현재**: 단일 학원 (밸류인수학학원)
- **계획**: academy_id 기반 멀티테넌시
- **작업시**: 향후 academy_id 필드 고려하여 개발

### 데이터베이스 단순화
- **제거 예정**: 복잡한 agents, chats, messages 구조
- **유지**: 기존 데이터 마이그레이션 필요
- **추가됨**: `calendar_events` 테이블 (Google Calendar 연동)
- **참고**: PROJECT_STATUS.md 확인

### 배포 및 보안 주의사항 (중요!)
- **GitHub Public Repository**: 민감한 정보 제거 필수
  - User IDs, API Keys 절대 포함 금지
  - 개인정보 관련 데이터 제거
- **Vercel 자동배포**: Public 리포지토리에서만 작동
- **Google OAuth**: Production redirect URI 설정 완료

## 작업 시나리오별 가이드

### 새 기능 추가
1. types/에 인터페이스 정의
2. database/에 테이블 및 RLS 추가
3. Supabase 타입 재생성
4. services/에 CRUD 함수 구현
5. hooks/에 useSWR 훅 생성
6. components/에 UI 구현
7. app/에서 페이지 연결

### 기존 기능 수정
1. PROJECT_STATUS.md 확인
2. 영향받는 타입 먼저 수정
3. 서비스 → 훅 → 컴포넌트 순서
4. 한국어 UI 텍스트 유지
5. 다크모드 호환성 확인

### API 라우트 생성
1. app/api/[route]/route.ts 생성
2. createServerClient 사용
3. 인증 체크 필수
4. 에러 응답 표준화
5. CORS 설정 확인

### 데이터베이스 변경
1. database/에 마이그레이션 SQL 작성
2. RLS 정책 동시 업데이트
3. Supabase 대시보드에서 실행
4. 타입 재생성 필수
5. 관련 서비스/훅 업데이트

## 절대 금지사항

### 보안 관련
- **SUPABASE_SERVICE_ROLE_KEY** 클라이언트 노출
- **profiles.is_approved** 체크 없이 사용자 승인
- **RLS 정책** 우회하는 직접 SQL 실행
- **미들웨어 보호** 제거 또는 우회
- **User UUID** 등 민감한 ID 값 공개 리포지토리 노출
- **개인정보** (이메일, 전화번호 등) 하드코딩

### 코드 품질
- ✅ **n8n 레거시 코드** 모두 제거 완료
- ✅ **agents/chats/messages** 테이블 제거 (글로벌 챗 기능만 유지)
- **영어 UI 텍스트** 사용 (한국어만 허용)
- **localStorage** 사용 (Supabase 우선)
- **any 타입** 사용 (unknown 사용)
- **shadcn/ui toast 사용 금지** (Sonner toast가 더 안정적)

### TypeScript 주의사항 (주요 패턴)
- **Next.js 15 호환성**: `cookies: () => cookieStore as any` 패턴 사용 필수
- **Supabase 타입 이슈**: `.eq()`, `.update()` 메서드에서 `@ts-ignore` 또는 `as any` 필요
- **Nullable 필드**: DB에서 nullable인 필드는 `row.field || defaultValue` 패턴으로 안전하게 처리
- **쿼리 파라미터**: `param as SpecificType['field']` 패턴으로 타입 캐스팅
- **데이터 변환**: 타입 변환 함수에서 모든 nullable 필드에 기본값 제공

### 아키텍처
- **페이지 컴포넌트**에 비즈니스 로직 직접 구현
- **클라이언트 컴포넌트**에서 서버 전용 API 호출
- **동기적 데이터 페칭** (SWR 사용 필수)
- **전역 상태 관리 라이브러리** 추가 (Context 사용)

## AI 에이전트 의사결정 기준

### 컴포넌트 선택
1. shadcn/ui에 있는가? → 사용
2. 유사한 컴포넌트 있는가? → 패턴 복사
3. 새로 만들어야 하는가? → 기존 스타일 따르기

### 상태 관리 선택
1. 서버 데이터인가? → SWR 사용
2. 폼 상태인가? → react-hook-form 사용
3. UI 상태인가? → useState 사용
4. 전역 상태인가? → Context API 사용

### 에러 처리
1. 사용자 입력 에러 → toast.error() 표시
2. 서버 에러 → 에러 바운더리 + 로깅
3. 인증 에러 → 로그인 페이지 리다이렉트
4. 권한 에러 → 403 페이지 표시

### 성능 최적화
1. 이미지 많은가? → next/image 사용
2. 리스트 긴가? → 가상화 고려
3. 데이터 크기 큰가? → 페이지네이션
4. 실시간 필요한가? → Supabase Realtime

## 검증 체크리스트

### 커밋 전 확인
- [ ] TypeScript 에러 없음
- [ ] 한국어 UI 텍스트 사용
- [ ] 다크모드 정상 작동
- [ ] RLS 정책 준수
- [ ] SWR 훅 에러 처리
- [ ] 민감한 정보(UUID, API Key) 미포함 확인

### 기능 추가 시
- [ ] types/ 파일 업데이트
- [ ] services/ 함수 구현
- [ ] hooks/ 훅 생성
- [ ] 컴포넌트 반응형 디자인
- [ ] 관리자 승인 플로우 고려

### 배포 전
- [ ] 환경변수 설정 확인
- [ ] 빌드 에러 없음 확인
- [ ] PROJECT_STATUS.md 업데이트
- [ ] 데이터베이스 마이그레이션 완료
- [ ] Supabase 타입 최신화

## 최근 해결된 주요 이슈 (2025-07-05 업데이트)

### 1. Hydration 및 렌더링 문제 (2025-07-05)
- **문제**: 로그인 후 간헐적으로 화면이 렌더링되지 않음
- **원인**: Server/Client 간 인증 상태 불일치로 인한 hydration mismatch
- **해결**: 
  - 새로운 AuthProvider 구조로 전면 재설계
  - Dashboard layout에 `mounted` 상태 체크 추가
  - Middleware에서 캐시 제거로 단순화
- **영향**: 모든 인증 관련 컴포넌트

### 2. 학습관리 테이블 중복 학생 추가 문제 (2025-07-05)
- **문제**: 같은 학생이 다른 반에 속할 때 추가 안됨
- **원인**: study_logs 테이블의 unique constraint가 (student_id, date)로 설정
- **해결**: unique constraint를 (class_id, student_id, date)로 변경
- **SQL**: `ALTER TABLE study_logs DROP CONSTRAINT study_logs_student_id_date_key; ALTER TABLE study_logs ADD CONSTRAINT study_logs_class_student_date_key UNIQUE (class_id, student_id, date);`

### 3. Console Log 보안 문제 (2025-07-05)
- **문제**: Public GitHub에 민감한 사용자 정보 로깅
- **해결**: 모든 console.log, console.error 제거
- **영향**: GlobalChatButton, auth-actions, login 관련 파일들

### 4. Google Calendar 형식 변환 (2025-07-03)
- **문제**: `2025-07-02T10:00:00+09:00` → `2025-07-02 10:00:00+09`
- **해결**: `.replace('T', ' ').replace('+09:00', '+09')`

### 5. FullCalendar More Events 투명 모달
- **문제**: 배경이 투명해서 글씨가 안 보임
- **해결**: `.fc-more-popover` 스타일에 흰색 배경 추가

### 6. 대시보드 캘린더 Timezone 
- **문제**: UTC 기준으로 계산해서 날짜가 틀어짐
- **해결**: 로컬 시간 기준으로 변경

### 7. Vercel 자동배포 안됨
- **문제**: Private 리포지토리는 webhook 생성 안됨
- **해결**: Public 리포지토리로 전환

### 8. Google OAuth Redirect
- **문제**: Production에서 localhost로 리다이렉트
- **해결**: NEXT_PUBLIC_SITE_URL 환경변수 추가

### 9. Auth Session Missing 오류 (2025-07-03)
- **문제**: `supabaseClient`로 직접 클라이언트 생성 시 인증 세션 없음
- **해결**: `createClientComponentClient` 사용으로 변경
- **영향**: learning, test-logs, history 페이지 모두 수정

### 10. Supabase Upsert ID null 제약조건 위반 (2025-07-03)
- **문제**: 새 레코드에 `id: undefined`가 포함되어 null로 변환됨
- **원인**: upsert에서 기존/새 레코드를 구분 없이 처리
- **해결**: 기존 레코드(ID 있음)와 새 레코드(ID 없음) 분리 처리
- **패턴**: existingRows는 upsert, newRows는 insert 사용