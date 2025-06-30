# 프로젝트 개발 중 자주 겪는 오류와 해결법, 실무 팁

## 1. 외부 라이브러리(react-big-calendar 등) SSR/RSC 오류
- **현상:**
  - "Super expression must either be null or a function" 등 런타임 에러
  - 캘린더, 차트 등 UI 라이브러리에서 자주 발생
- **원인:**
  - Next.js app router 환경에서 외부 UI 라이브러리는 클라이언트 컴포넌트로만 동작해야 함
- **해결:**
  - 해당 컴포넌트 파일 맨 위에 `"use client";` 추가

---

## 2. date-fns v3 import 오류
- **현상:**
  - `Module not found: Can't resolve 'date-fns/format'` 등
- **원인:**
  - v3부터는 모든 함수/locale을 루트에서 중괄호 import해야 함
- **해결:**
  - `import { format, parse, startOfWeek, getDay } from 'date-fns';`
  - `import { ko } from 'date-fns/locale';`

---

## 3. 타입 선언 파일이 없는 라이브러리 사용 시
- **현상:**
  - `Could not find a declaration file for module ...`
- **해결:**
  - `types/라이브러리명.d.ts` 파일 생성 후 `declare module '라이브러리명';` 작성

---

## 4. 패키지 설치했는데도 모듈을 못 찾는 경우
- **원인:**
  - node_modules 꼬임, lock 파일 문제, 설치 경로 불일치
- **해결:**
  1. `rm -rf node_modules package-lock.json yarn.lock`
  2. `npm install --legacy-peer-deps`
  3. `.next` 폴더 삭제 후 `npm run dev`

---

## 5. 타입스크립트에서 외부 이벤트 타입 오류
- **현상:**
  - `Object literal may only specify known properties ...`
- **해결:**
  - 직접 타입 선언해서 사용 (예: `type CalendarEvent = { title: string; start: Date; end: Date; allDay?: boolean; }`)

---

## 6. Toast 메시지가 표시되지 않거나 사라지지 않는 문제 🚨
- **현상:**
  - 일정 등록, 학생 생성 등 성공/실패 메시지가 표시되지 않음
  - 또는 토스트가 너무 오래 남아있어서 화면을 가림
- **원인:**
  - `TOAST_REMOVE_DELAY` 시간 설정이 잘못됨 (예: 1,000,000ms = 16분)
  - useToast import 경로 불일치 (`@/components/ui/use-toast` vs `@/hooks/use-toast`)
  - Toaster 컴포넌트가 layout에 렌더링되지 않음
- **해결:**
  1. **타이머 설정 확인**: `TOAST_REMOVE_DELAY = 5000` (5초)로 설정
  2. **import 경로 통일**: Toaster에서 사용하는 것과 같은 경로 사용
  3. **Toaster 렌더링 확인**: `app/layout.tsx`에 `<Toaster />` 포함되어 있는지 확인
  4. **토스트 호출 순서**: 성공 처리 → 토스트 표시 → 짧은 딜레이 → 모달/페이지 닫기
- **실무 팁:**
  - 토스트 기능이 안 되면 먼저 간단한 테스트 버튼으로 토스트 시스템 자체 동작 확인
  - 콘솔 로그로 토스트 함수 호출 여부를 확인
  - shadcn/ui 기반 프로젝트에서는 토스트 파일이 중복으로 있을 수 있으니 주의

---

## 7. react-big-calendar 네비게이션 버튼이 동작하지 않는 문제
- **현상:**
  - 월/주/일 전환, 이전/다음, 오늘 버튼 등 네비게이션 버튼 클릭 시 아무 반응이 없음
  - 콘솔에서 noop$1() 함수가 실행됨 (내부적으로 아무 동작도 하지 않음)
- **원인:**
  - Calendar 컴포넌트에 date, view, onNavigate, onView 상태/핸들러가 빠져있음
  - 상태 관리가 없으면 캘린더가 정적으로 고정되어 버튼이 동작하지 않음
- **해결:**
  1. useState로 date, view 상태를 선언
  2. useCallback으로 onNavigate, onView 핸들러 구현
  3. Calendar에 아래 props를 추가
     ```tsx
     const [date, setDate] = useState(new Date());
     const [view, setView] = useState<View>('month');
     const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
     const onView = useCallback((newView: View) => setView(newView), []);
     <Calendar
       ...
       date={date}
       view={view}
       onNavigate={onNavigate}
       onView={onView}
       ...
     />
     ```
- **실무 팁:**
  - 캘린더, 차트 등 외부 UI 라이브러리는 상태 관리가 없으면 동작이 제한됨
  - 버튼/뷰 전환이 안 되면 상태/핸들러 누락을 의심할 것

---

## 9. Supabase 클라이언트/서버 인증 컨텍스트 불일치 문제 🔒
- **현상:**
  - 서버 사이드에서는 데이터 조회 성공하지만 클라이언트 사이드에서는 빈 배열 반환
  - RLS(Row Level Security) 정책이 클라이언트/서버에서 다르게 작동
  - 관리자 권한이 있는데도 특정 테이블 조회가 실패
- **원인:**
  - `getSupabaseBrowserClient()`와 `createServerActionClient({ cookies })`의 인증 컨텍스트 차이
  - Next.js App Router에서 클라이언트 사이드 Supabase 클라이언트가 서버 세션과 동기화되지 않음
  - RLS 정책에서 `auth.uid()`가 클라이언트에서 제대로 인식되지 않음
- **해결책:**
  1. **즉시 해결**: `createClientComponentClient()` 사용
     ```typescript
     // 기존 (문제)
     import { getSupabaseBrowserClient } from "@/lib/supabase/client"
     const supabase = getSupabaseBrowserClient()
     
     // 개선 (해결)
     import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
     const supabase = createClientComponentClient()
     ```
  2. **임시 우회**: 서버 액션에서 데이터를 가져와 클라이언트에서 사용
     ```typescript
     // 서버에서 데이터 조회 후 클라이언트로 전달
     const serverResult = await testGetPendingUsers()
     if (serverResult.success) {
       setPendingUsers(serverResult.pendingUsers)
     }
     ```
  3. **장기적 개선**: API 라우트 사용
     ```typescript
     // app/api/admin/pending-users/route.ts
     export async function GET() {
       const supabase = createServerComponentClient({ cookies })
       // 서버에서 권한 확인 + 데이터 조회
       return NextResponse.json({ pendingUsers })
     }
     ```
- **보안 분석:**
  - ✅ **안전함**: 서버에서 RLS 정책 + 관리자 권한 검증 후 데이터 전달
  - ✅ **민감정보 미포함**: 공개 가능한 정보만 조회 (id, email, name, status)
  - ⚠️ **성능**: Server Action 호출로 약간의 지연 발생
- **실무 팁:**
  - Supabase + Next.js App Router 조합에서는 클라이언트 컴포넌트에서 `createClientComponentClient` 필수 사용
  - RLS 정책 테스트는 서버/클라이언트 양쪽에서 모두 확인할 것
  - 관리자 기능은 API 라우트로 구현하는 것이 보안상 더 안전
  - 디버깅 시 서버/클라이언트 각각 로그를 출력해서 어느 쪽에서 문제인지 명확히 파악

---

## 10. React 입력 폼 성능 문제 - useState vs react-hook-form 🚀
- **현상:**
  - 텍스트 입력 시 타이핑이 느리고 버벅거림
  - 입력할 때마다 전체 컴포넌트가 리렌더링되는 느낌
  - 다른 비슷한 모달(예: 학생정보 입력)은 빠른데 특정 모달만 느림
- **원인:**
  - `useState`로 직접 상태 관리 시 매번 전체 폼이 리렌더링됨
  - 복잡한 폼(시간 선택, 카테고리 등 여러 필드)에서 한 필드 변경 시 다른 필드들도 영향받음
  - useMemo, useCallback 등의 최적화로도 근본적 해결 어려움
- **해결:**
  ```tsx
  // 기존 (느림)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formData, setFormData] = useState({...})
  
  // 개선 (빠름)
  const form = useForm<FormValues>({
    defaultValues: { title: '', description: '', ... }
  })
  
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <Input {...field} placeholder="제목 입력" />
    )}
  />
  ```
- **성능 차이 이유:**
  - **react-hook-form**: 각 필드가 독립적으로 관리되어 해당 필드만 리렌더링
  - **useState**: 상태 변경 시 전체 컴포넌트 리렌더링 발생
  - **내장 최적화**: react-hook-form은 성능에 특화되어 설계됨
- **실무 팁:**
  - 3개 이상의 입력 필드가 있는 폼은 react-hook-form 사용 권장
  - shadcn/ui Form 컴포넌트와 조합하면 일관된 디자인 + 성능 확보
  - 기존 useState 폼을 react-hook-form으로 전환하면 즉시 성능 향상 체감 가능
  - 학생정보, 직원정보 등 다른 모달이 빠른 이유는 이미 react-hook-form 사용하고 있기 때문

---

## 8. 실무 팁
- 외부 라이브러리 import 경로, 대소문자, 오타 항상 확인
- Next.js app router 환경에서는 외부 UI 라이브러리는 대부분 "use client" 필요
- 에러 메시지는 구글/깃허브/공식문서에서 검색하면 대부분 해결책이 있다
- 자주 쓰는 해결법은 이렇게 파일로 정리해두고, 프로젝트 시작할 때 꼭 읽어보기
- **사용자 피드백(토스트, 알림 등)은 개발 초기에 제대로 설정해야 나중에 고생하지 않음**
- **플레이라이트 같은 E2E 테스트로 실제 사용자 플로우를 확인하면 숨어있는 UI/UX 문제를 빨리 발견할 수 있음**
- **Supabase 인증 문제 발생 시 서버/클라이언트 양쪽 로그를 비교해서 근본 원인 파악할 것**
