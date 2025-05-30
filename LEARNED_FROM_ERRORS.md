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

## 6. 실무 팁
- 외부 라이브러리 import 경로, 대소문자, 오타 항상 확인
- Next.js app router 환경에서는 외부 UI 라이브러리는 대부분 "use client" 필요
- 에러 메시지는 구글/깃허브/공식문서에서 검색하면 대부분 해결책이 있다
- 자주 쓰는 해결법은 이렇게 파일로 정리해두고, 프로젝트 시작할 때 꼭 읽어보기 

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