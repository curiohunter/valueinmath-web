# 학원 관리 프로그램 진행 상황

## 🚀 새로운 캘린더 시스템 설계 및 리팩토링 계획 (2025.06.10)

### **중요 결정: n8n 채팅 방식 → FullCalendar + 구글 API 직접 연동**

#### **현재 문제점 및 결정 배경:**
- **상업화 한계**: n8n 웹훅 연결 방식은 고객별 개별 설정 필요 (구글 클라우드 콘솔 API 발급, OAuth 설정 등)
- **판매 시 기술 지원 부담**: 고객 1명당 반나절~하루 소요, 확장성 부족
- **복잡한 사용자 경험**: 채팅으로 캘린더 조작이 직관적이지 않음
- **데이터베이스 오버헤드**: 일정 에이전트 1개만 사용하는데 agents(1개), chats(4개), messages(110개) 테이블 과도 복잡

#### **새로운 솔루션: SaaS 중앙화 + FullCalendar**
```
[고객 학원] → [내 중앙 API] → [구글 캘린더 API]
     ↓              ↓              ↓
기본 FullCalendar  OAuth 관리    실제 캘린더 데이터
(무료, MIT)      ($0 비용)      (고객별 분리)
```

#### **기술 스택 결정:**
- **FullCalendar 기본 버전**: MIT 라이선스 (완전 무료), 학원 관리 필요 기능 95% 제공
- **구글 캘린더 API**: 내 앱으로 통합, 고객은 권한 승인만
- **SaaS 중앙화**: 내 서버에서 모든 고객의 구글 캘린더 관리

#### **고객 온보딩 프로세스 (혁신적 단순화):**
```
1. 계약 체결 ✍️
2. API 키 수령 📧  
3. 구글 권한 승인 링크 클릭 🔗 (내 앱에 캘린더 권한 부여)
4. \"허용\" 버튼 클릭 ✅
5. 즉시 사용 시작! 🎉

소요 시간: 3분 (기존 반나일 → 3분으로 단축)
기술 지식: 불필요
```

#### **비용 구조:**
- FullCalendar 라이선스: $0 (MIT 무료)
- 구글 API 사용료: $0 (무료 할당량 충분)
- 내 서버 운영비: 월 10-20만원 (모든 고객 처리)
- 고객당 추가 비용: $0

---

## 📋 단계별 리팩토링 계획

### **1단계: 새로운 캘린더 시스템 구축 (1-2주)**

#### **1.1 FullCalendar 기본 설정**
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

#### **1.2 중앙 API 서버 구축**
- **고객 인증 시스템**: API 키 기반 고객 식별
- **구글 OAuth 통합**: 내 앱으로 모든 고객의 구글 캘린더 권한 관리
- **CRUD API 엔드포인트**: `/api/calendar/events` (GET, POST, PUT, DELETE)

#### **1.3 새로운 데이터베이스 스키마**
```sql
-- 기존 복잡한 agents, chats, messages 테이블 대체
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_name VARCHAR(255),
  api_key VARCHAR(255) UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_calendar_id VARCHAR(255),
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고객별 캘린더 설정 (선택적)
CREATE TABLE calendar_settings (
  customer_id uuid REFERENCES customers(id),
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  default_event_duration INTEGER DEFAULT 60, -- 분 단위
  working_hours JSONB, -- {\"start\": \"09:00\", \"end\": \"18:00\"}
  preferences JSONB -- 기타 설정
);
```

### **2단계: /schedule 페이지 전면 교체 (1주)**

#### **2.1 기존 제거 대상**
- `components/schedules/N8nChatSidebar.tsx` → 완전 삭제
- `components/schedules/GoogleCalendarEmbed.tsx` → 완전 삭제
- n8n 관련 환경변수 및 웹훅 설정

#### **2.2 새로운 컴포넌트 구현**
```typescript
// components/calendar/GoogleCalendar.tsx
// - FullCalendar 기반 캘린더 UI
// - 드래그&드롭으로 일정 생성/수정
// - 구글 캘린더 API 직접 연동
// - 실시간 동기화

// components/calendar/EventQuickAdd.tsx  
// - 간단한 일정 추가 폼
// - 날짜/시간 선택
// - 반복 일정 설정

// components/calendar/CalendarSidebar.tsx
// - 오늘 일정 요약
// - 다가오는 이벤트
// - 캘린더 설정
```

#### **2.3 새로운 /schedule 페이지 구조**
```typescript
// app/(dashboard)/schedule/page.tsx
const SchedulePage = () => {
  return (
    <div className=\"flex gap-4 h-full\">
      {/* 메인: FullCalendar */}
      <div className=\"flex-1\">
        <GoogleCalendar user={user} />
      </div>
      
      {/* 사이드바: 일정 관리 도구 */}
      <div className=\"w-80\">
        <CalendarSidebar />
      </div>
    </div>
  )
}
```

### **3단계: /chat 페이지 용도 변경 (1주)**

#### **3.1 기존 MultiChat 처리**
- `components/MultiChat.tsx` → 보존 (다른 용도로 활용 가능)
- `app/(dashboard)/chat/MultiChatPage.tsx` → 삭제
- `app/(dashboard)/chat/page.tsx` → 완전 교체

#### **3.2 새로운 /chat 페이지: \"AI 자동화 허브\"**
```typescript
// app/(dashboard)/chat/page.tsx → 자동화 대시보드로 변경
const AutomationDashboard = () => {
  return (
    <div className=\"p-6 space-y-6\">
      {/* 📱 SNS 마케팅 자동화 섹션 */}
      <AutomationSection
        title=\"📱 SNS 마케팅 자동화\"
        cards={[
          { name: \"인스타그램 게시글\", icon: \"📸\" },
          { name: \"블로그 포스팅\", icon: \"✍️\" }, 
          { name: \"유튜브 썸네일\", icon: \"🎬\" }
        ]}
      />
      
      {/* 🎯 학생 모집 자동화 섹션 */}
      <AutomationSection
        title=\"🎯 학생 모집 자동화\"
        cards={[
          { name: \"상담 예약 관리\", icon: \"📞\" },
          { name: \"입테 분석 리포트\", icon: \"📊\" },
          { name: \"경쟁 분석\", icon: \"🔍\" }
        ]}
      />
    </div>
  )
}
```

### **4단계: 데이터베이스 마이그레이션 (1주)**

#### **4.1 기존 테이블 정리**
```sql
-- 단계적 제거 (백업 후)
-- 1. messages 테이블 (110개 레코드)
-- 2. chats 테이블 (4개 레코드)  
-- 3. agents 테이블 (1개 레코드)

-- 새로운 고객 관리 테이블 생성
-- customers, calendar_settings 테이블 추가
```

#### **4.2 데이터 마이그레이션 스크립트**
```sql
-- 기존 사용자를 고객으로 변환
INSERT INTO customers (academy_name, api_key, created_at)
SELECT 
  '테스트 학원', 
  'test_api_key_' || id,
  created_at
FROM profiles 
WHERE approval_status = 'approved';
```

### **5단계: 사이드바 메뉴 업데이트**
```typescript
// components/layout/sidebar.tsx 수정
const sidebarItems = [
  // ... 기존 메뉴들
  {
    title: \"AI 자동화\",  // 변경: \"에이전트\" → \"AI 자동화\"
    href: \"/chat\",
    icon: Zap,  // 변경: Shield → Zap
  },
  {
    title: \"수업 일정\",
    href: \"/schedule\", 
    icon: Calendar,
    badge: \"새로워짐\"  // 임시 배지
  },
]
```

### **6단계: 리팩토링 우선순위 및 작업 순서**

#### **Phase 1: 기반 시설 구축 (1주)**
1. `customers` 테이블 생성 및 마이그레이션
2. 구글 OAuth 앱 등록 및 설정
3. 중앙 API 서버 `/api/calendar/events` 구현
4. FullCalendar 패키지 설치 및 기본 설정

#### **Phase 2: /schedule 페이지 교체 (1주)**
1. `components/calendar/GoogleCalendar.tsx` 구현
2. 기존 N8nChatSidebar, GoogleCalendarEmbed 제거
3. 새로운 페이지 구조 적용 및 테스트
4. 드래그&드롭, CRUD 기능 검증

#### **Phase 3: /chat 페이지 재구성 (1주)**
1. 자동화 대시보드 컴포넌트 구현
2. 기존 MultiChatPage 제거
3. 사이드바 메뉴 업데이트
4. 향후 자동화 기능 연동 준비

#### **Phase 4: 정리 및 최적화 (3일)**
1. 사용하지 않는 테이블 정리 (agents, chats, messages)
2. n8n 관련 코드 및 환경변수 정리
3. 타입 정의 업데이트
4. 문서화 및 배포 준비

---

## 계정 연결 기반 승인 시스템 및 헤더 알림 완전 구현 (2025.06.10)
- **회원가입 시 이름 입력 기능 추가**: 관리자가 신규 가입자를 쉽게 식별할 수 있도록 이름 필드 필수 입력 구현
- **계정 연결 중심 승인 시스템 구현**: 
  - 기존 헤더 알림에서 바로 승인/거부 → 직원 관리에서 계정 연결 시에만 승인으로 워크플로우 변경
  - 계정 연결 시 자동으로 `approval_status: \"approved\"` 처리
  - 계정 연결 해제 시 `approval_status: \"pending\"` 복귀 및 직원 정보 초기화
- **승인 대기 페이지 이름 입력 기능 강화**:
  - 이름이 없는 사용자를 위한 이름 입력 컴포넌트 추가
  - 이름 입력 후 관리자 알림에 실명 표시로 식별성 향상
  - 조건부 UI: 이름 없음 → 이름 입력 화면, 이름 있음 → 승인 대기 화면
- **헤더 알림 시스템 완전 개선**:
  - pending 상태 사용자 실시간 감지 및 알림 표시 (빨간 뱃지 + 카운트)
  - 승인/거부 버튼 제거, \"직원 관리에서 연결하기\" 버튼으로 대체
  - 서버/클라이언트 인증 컨텍스트 불일치 문제 해결 (`createClientComponentClient` 적용)
  - 하이브리드 접근법: 서버 사이드 데이터 우선 사용으로 RLS 문제 우회
- **Supabase 인증 문제 근본 해결**:
  - `getSupabaseBrowserClient()` → `createClientComponentClient()` 교체
  - 서버 액션과 클라이언트 컴포넌트 간 인증 컨텍스트 동기화 완료
  - RLS 정책 확인 및 관리자 UPDATE 권한 추가
- **profiles 테이블 트리거 구현**: 신규 사용자 가입 시 자동으로 profiles 레코드 생성 (approval_status: 'pending')
- **데이터 동기화 로직 강화**:
  - 계정 연결 시: 직원 정보 → profiles 테이블 완전 동기화 (name, position, department, approval_status)
  - 계정 연결 해제 시: 승인 취소 + 직원 정보 초기화 (name도 null로 설정)
  - 중복 연결 방지 로직 추가
- **실시간 업데이트 시스템 고도화**:
  - INSERT/UPDATE 이벤트 모두 감지하여 알림 목록 실시간 업데이트
  - 드롭다운 열 때마다 최신 데이터 자동 새로고침
  - 서버/클라이언트 양쪽 로그 비교 디버깅 시스템 구축
- **보안 및 성능 고려사항**:
  - 서버 사이드 RLS 정책 + 관리자 권한 검증으로 보안 유지
  - 민감 정보 미포함 (공개 가능한 정보만 조회)
  - API 라우트 기반 장기 개선안 준비 완료
- **완전한 워크플로우 구현**:
  1. 회원가입 → 이름 입력 → `approval_status: \"pending\"`
  2. 관리자 헤더 알림 → 신규 가입자 확인 (이름 포함)
  3. 직원 관리에서 계정 연결 → 자동 승인 완료
  4. 계정 연결 해제 → 승인 취소 + 알림 재표시

## 밸류인수학학원 랜딩페이지 완전 구현 (2025.06.09)
- **전체 랜딩페이지 구조 완성**: Hero, About, Programs, Teachers, Features, Location, CTA, Footer 8개 섹션 구현
- **현대적 UI/UX 디자인**: framer-motion 애니메이션, react-intersection-observer 스크롤 인터렉션, 그라데이션 효과
- **완전 반응형 디자인**: 모바일/태블릿/데스크톱 모든 기기 대응, Tailwind CSS 활용
- **SEO 최적화**: 메타데이터, 구조화된 데이터(JSON-LD), Open Graph, Twitter Cards 설정
- **학원 정보 완벽 반영**: 강사진 소개, 교육과정(고등관/중등관/영재관), 위치정보, 연락처 등 실제 정보 적용
- **미들웨어 라우팅 수정**: 루트 경로(/)에서 랜딩페이지 표시, 학원관리시스템 로그인 분리
- **기술적 이슈 해결**: section 태그 JSX 호환성 문제, Lucide React 아이콘 호환성, Tailwind 애니메이션 설정
- **프로덕션 빌드 최적화**: Next.js 빌드 성공, 정적 생성 최적화, 패키지 의존성 해결

## TypeScript 타입 시스템 개선 완료 (2025.06.05)
- **student-form-modal.tsx 타입 오류 해결**: FormValues와 Student 타입 불일치 문제 해결
- **명시적 타입 정의 구현**: CreateStudentData, UpdateStudentData 타입 추가로 타입 안전성 확보
- **LeadSource 타입 추가**: import 누락 문제 해결 및 타입 완전성 개선
- **날짜 타입 변환 최적화**: Date → string 변환 로직 명시적 구현
- **타입 캐스팅 개선**: as 단언 대신 명시적 타입 정의 방식으로 안전성 향상

## 대시보드 실시간 동기화 시스템 개선 (2025.06.05)
- **입학테스트 실시간 필터링**: 학생 상태 변경 시 입학테스트 목록에서 즉시 제거
- **자동 새로고침 시스템**: 30초마다 대시보드 데이터 자동 업데이트
- **상태 변경 추적**: 신규상담 → 다른 상태 변경 시 로그 및 UI 반영
- **통계 기준 날짜 수정**: 신규등원 통계를 registration_date → start_date로 변경
- **데이터 동기화 개선**: Promise.all을 활용한 병렬 데이터 새로고침
- **사용자 경험 향상**: 상태 변경과 동시에 관련 데이터 실시간 업데이트

## 글로벌 채팅 시스템 완전 개선 (2025.06.04)
- **사이드 패널 방식으로 전환**: Drawer 모달에서 fixed position div로 변경하여 채팅창 열린 상태에서도 다른 페이지 정상 작동
- **GlobalChatInterface 컴포넌트 분리**: GlobalChatButton에서 채팅 기능만 독립적으로 분리하여 재사용성 향상
- **AI 에이전트 채팅과 구분**: MultiChat(AI용)과 GlobalChatInterface(사용자간) 명확히 분리
- **동시 작업 환경 구현**: 채팅창이 화면 우측에 고정되어 있어도 학생/직원/반 관리 등 모든 기능 동시 사용 가능
- **사용자 이름 매칭 문제 해결**: employees 테이블과 auth_id 연동으로 실명 표시 완벽 구현
- **z-index 최적화**: 다른 UI 요소와 충돌하지 않도록 z-40으로 조정
- **UX 개선**: 우측 상단 X 버튼으로 채팅창 닫기, 텔레그램 스타일 메시징 인터페이스
- **실시간 동기화**: Supabase Realtime으로 메시지/온라인 사용자 실시간 업데이트

## 이전 글로벌 채팅(학원 전체 채팅) 기능 완성 (2025.06.03)
- Supabase 기반 글로벌 채팅(학원 전체 채팅) 실시간 연동 및 UI/UX 완성
- 직원(employees) 테이블과 연동하여 채팅 메시지에 실명(이름) 표시
- 한글 입력(IME) 중복 메시지 버그 완벽 해결 (isComposing 체크)
- Card 기반 모달 UI로 디자인 대폭 개선 (X 버튼 중복 제거, 그림자, 둥근 모서리, 온라인 사용자 영역 분리)
- 헤더의 채팅/알림/프로필 버튼 스타일 완전 통일, 일관된 UX 제공
- 접근성(DialogTitle) 보강: 스크린리더 지원 및 경고 완전 제거
- 실시간 메시지 송수신, 온라인 유저 표시, 미읽은 메시지 뱃지 등 실무적 요구사항 모두 반영
- 코드 리팩토링 및 주니어 개발자도 이해하기 쉬운 구조로 개선

## 프로젝트 개요
- **프로젝트명**: 학원 관리 시스템
- **목적**: 학생 정보 관리 및 학원 운영 효율화
- **시작일**: 2023년 5월 22일

## 완료된 기능
- [x] 기본 UI 구조 및 레이아웃 설정
- [x] 학생 목록 조회 및 필터링
- [x] 학생 등록/수정/삭제 기능
- [x] 학생 상태별 색상 구분 (재원, 퇴원, 휴원, 미등록)
- [x] 담당관별 색상 구분 (고등관, 중등관, 영재관)
- [x] 학생 메모 기능 구현
- [x] 종료일 필드 추가 및 Supabase 연동
- [x] 퇴원 상태 학생의 종료일 필수 검증
- [x] 검색 기능 개선
- [x] 직원 관리 기능 구현
  - [x] 직원 목록 조회 및 필터링
  - [x] 직원 등록/수정/삭제 기능
  - [x] 직원 상태별 색상 구분 (재직, 퇴직)
  - [x] 직책별 색상 구분 (원장, 부원장, 강사, 데스크직원, 데스크보조)
  - [x] 직원 메모 기능 구현
- [x] 반 관리 기능 구현
  - [x] 반 목록 조회 및 담당선생님/과목별 필터링
  - [x] 반 등록/수정/삭제 기능
  - [x] 반별 학생 목록 표시 및 관리
  - [x] 담당선생님 필터(원장/강사만), 과목 필터, UI/UX 학생관리와 통일
  - [x] 반 상세 모달에서 학생 목록, 담당선생님, 수정/삭제/닫기 버튼 UI 개선
  - [x] shadcn/tailwind/card/border/shadow 등 스타일 통일
- [x] UI 개선
  - [x] 테이블 컬럼 정렬 문제 수정
  - [x] 메모와 관리 열 가운데 정렬 적용
  - [x] 반/학생/직원 관리 페이지 상단탭, 필터, 버튼, 테이블, 모달 등 UI/UX 통일
  - [x] 불필요한 검색 인풋/버튼 제거, 필터/버튼만 남기고 정렬
- [x] 인증 기능 추가
  - [x] 로그인/회원가입 페이지 구현
  - [x] 비밀번호 재설정 기능 구현
  - [x] 인증 미들웨어 설정
  - [x] 직원과 사용자 계정 연결 기능 구현
  - [x] 사용자 프로필 테이블 생성 및 관리
  - [x] 새 사용자 등록 시 프로필 자동 생성 트리거 추가
  - [x] 프로필 테이블에 이메일 필드 추가 및 동기화 트리거 구현
  - [x] 기존 사용자를 위한 프로필 생성
  - [x] 회원 탈퇴(계정 삭제) 기능 구현 (user, profiles 삭제 및 /login 리디렉션)
- [x] 팀 채팅 기능 구현 (기본 기능)
  - [x] 채팅 데이터베이스 스키마 설계 및 생성
  - [x] 채팅방 생성 및 관리 기능
  - [x] 메시지 전송 및 수신 기능
  - [x] 계정 연결된 직원만 멤버로 선택 가능
  - [x] 메시지 읽음 상태 관리
  - [x] 사이드바에 채팅 메뉴 추가
  - [x] 회원 탈퇴 시 user, profiles 삭제 및 /login 리디렉션 처리 완료
- [x] 글로벌 채팅 시스템 완전 구현
  - [x] 사이드 패널 방식으로 채팅창과 다른 페이지 동시 사용 가능
  - [x] GlobalChatInterface 컴포넌트 분리 및 재사용성 향상
  - [x] AI 에이전트 채팅과 사용자간 채팅 명확히 구분
  - [x] employees 테이블 연동으로 실명 표시 완벽 구현
  - [x] 실시간 메시지/온라인 사용자 동기화
  - [x] 텔레그램 스타일 UX 및 z-index 최적화
- [x] n8n 기반 에이전트(챗봇) 연동 및 실전 구조 개선
  - [x] n8n Webhook URL 환경변수 관리 및 보안 적용
  - [x] TeddyFlow 스타일의 멀티 챗봇/대화 목록/대화창 UI(MultiChat) 구현
  - [x] 프론트엔드 fetch 경로 자동 변환(`/api/n8n/...` 프록시)로 CORS 문제 완전 해결
  - [x] Next.js rewrites 설정으로 로컬/운영 환경 모두 same-origin 개발 구조 완성
  - [x] CORS 헤더 중복 문제 실전 디버깅 및 프록시/서버 환경변수 최적화
  - [x] 채팅 입력창 UX 개선(하단 고정, 메시지 반영 패턴 개선)
  - [x] 반복 피드백 기반 구조/UX/코드 리팩토링 및 상세 설명 제공
  - [x] 채팅/에이전트/메시지 삭제 시 DB 연쇄 삭제(FK + ON DELETE CASCADE) 적용
  - [x] MultiChat 컴포넌트 구조/레이아웃/스크롤/높이 고정 등 UI/UX 개선
  - [x] 채팅방/에이전트/메시지 실시간 동기화 및 삭제 동작 실전 검증
  - [x] Supabase RLS 정책/권한 문제 실전 점검 및 안내
  - [x] 실전 디버깅(삭제, 실시간, CORS, fetch, 프록시 등) 및 코드 품질 개선
  - [x] 최신 Claude Sonnet4와의 협업 및 실전 피드백 반영
- [x] 밸류인수학학원 랜딩페이지 완전 구현
  - [x] 8개 섹션 랜딩페이지 구조 완성 (Hero, About, Programs, Teachers, Features, Location, CTA, Footer)
  - [x] framer-motion 기반 대화형 애니메이션 시스템 구현
  - [x] react-intersection-observer로 스크롤 인터랙션 최적화
  - [x] Tailwind CSS 기반 완전 반응형 디자인 (모바일/태블릿/PC 대응)
  - [x] SEO 최적화: 메타데이터, JSON-LD 구조화 데이터, Open Graph 설정
  - [x] 실제 학원 정보 완벽 반영: 강사진(박석돈 원장 등 7명), 교육과정, 연락처
  - [x] 랜딩페이지와 학원관리시스템 라우팅 분리 (미들웨어 수정)
  - [x] 기술적 이슈 해결: JSX section 태그 호환성, Lucide React 아이콘, Tailwind 애니메이션
  - [x] Next.js 프로덕션 빌드 성공 및 정적 생성 최적화

## 예정된 기능 및 리팩토링
- [ ] **새로운 캘린더 시스템 구축** (우선순위 1)
  - [ ] FullCalendar 기본 버전 설치 및 설정
  - [ ] 중앙 API 서버 `/api/calendar/events` 구현
  - [ ] customers 테이블 생성 및 마이그레이션
  - [ ] 구글 OAuth 앱 등록 및 설정
- [ ] **/schedule 페이지 전면 교체** (우선순위 2)
  - [ ] GoogleCalendar.tsx 컴포넌트 구현 (FullCalendar 기반)
  - [ ] N8nChatSidebar.tsx 완전 삭제
  - [ ] GoogleCalendarEmbed.tsx 완전 삭제
  - [ ] 드래그&드롭 CRUD 기능 구현
- [ ] **/chat 페이지 용도 변경** (우선순위 3)
  - [ ] AutomationDashboard 컴포넌트 구현
  - [ ] MultiChatPage.tsx 삭제
  - [ ] 사이드바 메뉴 \"에이전트\" → \"AI 자동화\"로 변경
- [ ] **데이터베이스 마이그레이션** (우선순위 4)
  - [ ] agents, chats, messages 테이블 정리
  - [ ] 기존 사용자 → customers 테이블 변환
  - [ ] 타입 정의 업데이트
- [ ] 전월대비 계산 로직 구현 (현재 하드코딩)
- [ ] 카톡 자동화 시스템 구현
  - [ ] 테스트고민 → 격려 메시지
  - [ ] 입테후고민 → 학원 어필 메시지  
  - [ ] 재원결정 → 등원 안내 메시지
- [ ] 엑셀 내보내기/가져오기 기능
- [ ] 모바일 반응형 개선
- [ ] 학습 관리 페이지 구현

## 이슈 및 해결된 문제
- ✅ 대시보드 5개 카드 세로 배열 → 가로 배열 수정 (grid-cols-5 + min-w-0)
- ✅ 재원생 수 0명 표시 → status 값 'active' → '재원'으로 수정
- ✅ 대시보드 헤더 제목 제거로 공간 효율성 향상
- ✅ 한글 status 값에 맞는 색상 매핑 수정 ('재원', '퇴원' 등)
- ✅ Supabase 타입 정의 및 실시간 데이터 연동 구현
- ✅ student-form-modal.tsx 타입 오류 해결 (FormValues ↔ Student 타입 불일치)
- ✅ 입학테스트 목록 실시간 상태 필터링 구현 (신규상담이 아닌 학생 자동 숨김)
- ✅ 신규등원 통계 기준 registration_date → start_date로 수정
- ✅ 퇴원 통계 end_date 참조 확인 및 정상 동작 확인

## 마지막 업데이트
- 날짜: 2025년 6월 10일
- 작업: 새로운 캘린더 시스템 설계 및 리팩토링 계획 완성. n8n 채팅 방식에서 FullCalendar + 구글 API 직접 연동으로 전환 결정. SaaS 중앙화 방식으로 상업화 문제 해결.

## 다음 작업 우선순위
1. **FullCalendar 기반 새로운 캘린더 시스템 구축**: 기존 n8n 채팅 방식 대체
2. **customers 테이블 및 중앙 API 서버 구축**: SaaS 중앙화 아키텍처 구현
3. **/schedule 페이지 전면 교체**: 직관적인 드래그&드롭 캘린더 UI
4. **/chat 페이지 AI 자동화 허브로 변경**: 실질적 가치 제공하는 자동화 기능
5. **기존 agents/chats/messages 테이블 정리**: 데이터베이스 단순화

## DB 스키마 업데이트시 
-  supabase gen types typescript --project-id <프로젝트ID> --schema public > types/database.ts

## 깃허브 커밋
  git add .
  git commit -m \"작업 내용\"
  git push`
