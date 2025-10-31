# ValueIn Academy Management System - Development Plan

## 📋 Project Information

**Repository**: https://github.com/curiohunter/valueinmath-web
**Stack**: Next.js 15, Supabase, TypeScript, Tailwind CSS
**Deployment**: Vercel (auto-deploy on push to main)
**Last Updated**: 2025-10-31

---

## 🎯 Current Phase: Maintenance & SaaS Preparation

### ✅ Completed Features

#### Core Systems (2025-07-05 ~ 2025-08-27)
- [x] Authentication system with approval workflow
- [x] Centralized AuthProvider with hydration fix
- [x] Student/Employee management
- [x] Class management with student relationships
- [x] Calendar system with Google Calendar sync
- [x] Workspace system (Todos/Memos with real-time updates)

#### Analytics & Reporting (2025-08-22 ~ 2025-10-01)
- [x] Student timeline with consultation details
- [x] Mathflat integration (2주 통계)
- [x] Monthly stats automation (pg_cron)
- [x] Consultation management system
- [x] Dashboard with comprehensive stats

#### Management Features (2025-07-09 ~ 2025-10-31)
- [x] Tuition management with Excel export
- [x] Learning history & test logs
- [x] Makeup class tracking
- [x] Entrance test management
- [x] Resources page (Google Drive integration)
- [x] School exam management system (PDF upload, filters, storage)
- [x] School exam scores system (student-subject-score tracking with decimal support)
- [x] Parent/Student approval system (admin approval workflow with delete)
- [x] Parent/Student portal (학습 포털 with 6 data sources integration)
- [x] Parent-Teacher communication system (monthly learning comments with replies/reactions)

#### Technical Improvements
- [x] @supabase/ssr migration (from auth-helpers-nextjs)
- [x] Next.js 15 async cookies() handling
- [x] Security updates (xlsx 0.20.3, Next.js 15.4.7)
- [x] Data change tracking pattern
- [x] Collaboration lock for concurrent editing
- [x] GitHub Actions CI/CD pipeline (TypeScript, ESLint, Build checks)
- [x] GPT-5 Mini automated code review system
- [x] Database migration validation workflow
- [x] Dependabot security updates automation

---

## 🚧 In Progress

### October 2025 Monitoring
- [ ] Verify October monthly stats cron execution (Due: Oct 31, 2025)
  - Expected: ~88 active students
  - Cron schedule: `30 23 28-31 * *` (KST 08:30)
  - Function: `save_monthly_academy_stats()`

### Documentation & Infrastructure (2025-10-24 ~ 2025-10-27)
- [x] CLAUDE.md updated with current project state
- [x] PLAN.md created with development roadmap
- [x] GitHub CLI 활용 가이드 작성 (`docs/github-cli-guide.md`)
- [x] GitHub CLI 설치 및 인증 (gh v2.82.1)
- [x] GitHub Actions CI/CD 파이프라인 구축 (ci.yml, gpt5-review.yml, db-check.yml)
- [x] GPT-5 코드 리뷰 자동화 설정 (OpenAI GPT-4o-mini)
- [x] Dependabot 설정 완료 (주간 npm 패키지 업데이트)

---

## 📅 Upcoming Tasks

### Phase 1: GitHub CLI & Automation (2주)
- [ ] 라벨 및 마일스톤 체계 구축
- [ ] 현재 작업 GitHub Issues로 이관
- [ ] PR 기반 워크플로우 도입
- [ ] GPT-5 ↔ Claude Code 협업 프로세스 정착

### Phase 2: SaaS Multi-tenancy Preparation (Q4 2025)
- [ ] Database schema review for multi-academy support
- [ ] Tenant isolation strategy design
- [ ] Migration plan documentation
- [ ] Performance testing with multiple tenants

### Phase 2: UX/UI Enhancements (Q1 2026)
- [ ] Mobile responsiveness improvements
- [ ] Dark mode optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (Core Web Vitals)

### Phase 3: Advanced Features (Q2 2026)
- [ ] Enhanced analytics dashboard
- [ ] Automated reporting system
- [ ] Parent portal
- [ ] SMS/Email notification system

---

## 🐛 Known Issues

### Critical
- None currently tracked

### Medium Priority
- Monthly stats cron verification needed (October 2025)

### Low Priority
- None currently tracked

---

## 📝 Recent Changes Log

### 2025-10-31
- ✅ **학부모-선생님 소통 시스템 완성**
  - 선생님용 월별 학습 코멘트 작성 기능 (학생 선택, 년/월 선택)
  - 학생별 학습 상황 표시 (5개 카드: 학습/시험/상담/보강/매쓰플랫)
  - 클릭 가능한 카드로 상세 데이터 표시
  - 학습 카드: 출석/숙제/집중도 평균 점수 + 라벨 표시
  - 매쓰플랫 카드: 유형별 문제수 및 정답률
  - 학부모/학생용 코멘트 조회 및 답글/반응 기능
  - Components: `student-comment-editor.tsx`, `teacher-comment-form.tsx`, `comments-section.tsx`
  - Services: `comments.ts`, `consultation-requests.ts`
  - API Routes: `/api/learning-comments`, `/api/consultation-requests`
- ✅ **데이터베이스 스키마 정렬**
  - study_logs: `attendance` → `attendance_status`
  - test_logs: `test_date` → `date`, `test_name` → `test`, `score` → `test_score`
  - consultations: `consultation_date` → `date`, 필드명 표준화
  - makeup_classes: `scheduled_date` → `absence_date`
  - mathflat_records: 실제 스키마 적용 (mathflat_type, problem_solved, correct_count)
- ✅ **타임존 문제 해결**
  - toISOString() → formatDate() 로컬 시간대 사용
  - 월별 날짜 범위 계산 정확도 개선

### 2025-10-30
- ✅ **Portal 학습일지 UI 개선 (Phase 1)**
  - scoreColor 함수 추가 (learning 페이지 컬러 시스템 적용)
  - 출석/숙제/집중도 colorful badge UI 구현
  - 교재 레이블 변경: "교재1" → "수업", "교재2" → "숙제"
  - BookOpen, FileText 아이콘 추가
  - 컴포넌트: `components/portal/study-logs-section.tsx`
- ✅ **반관리 페이지 시간표 표시 및 학생 정보 개선**
  - 시간표 컬럼 추가: 각 반의 시간표 테이블에 표시
  - 시간표 포맷: "월수금 19:00-21:00" 형태, 요일 그룹별 줄바꿈 처리
  - 학생 이름 포맷: "홍길동(초6)" 형태로 학교급+학년 표시
  - 인쇄 기능: 시간표 및 학생 정보 포함하여 출력
  - 수정 파일: `page.tsx`, `classes-table.tsx`, `print-classes-table.tsx`
- ✅ **보강 모달 시간 보존 버그 수정**
  - 편집 모드에서 기존 보강 시간이 2PM으로 변경되는 문제 해결
  - useEffect 조건 추가: 편집 모드 시 기본값 설정 방지
  - Select 컴포넌트 fallback 제거: undefined 사용으로 변경
  - 파일: `components/learning/makeup-classes/makeup-modal.tsx`
- ✅ **학습일지 & 테스트 관리 페이지 반 필터 정렬 개선**
  - 반 선택 필터를 선생님별로 정렬 (가나다순)
  - 같은 선생님 내에서는 반 이름으로 정렬
  - 수정 파일: `learning/page.tsx`, `learning/test-logs/page.tsx`

### 2025-10-25 ~ 2025-10-27
- ✅ **GitHub Actions CI/CD 파이프라인 완료**
  - CI Workflow: TypeScript, ESLint, Build 자동 검증
  - GPT-5 Mini Code Review: OpenAI GPT-4o-mini 기반 AI 코드 리뷰
  - Database Check: RLS 정책 및 SQL 구문 검증 자동화
  - Dependabot: 주간 npm 패키지 업데이트 (12개 PR 생성)
  - GitHub Secrets 설정 완료 (OPENAI_API_KEY, Supabase 자격증명)
- ✅ **인증 시스템 버그 수정**
  - 학생/학부모 로그인 쿠키 전파 문제 해결 (commit 111e15b)
  - 싱글턴 패턴 복원으로 토큰 갱신 문제 해결 (commit 31b3f7f)
- ✅ **의존성 업데이트 자동화**
  - @types/node: 22.15.34 → 24.9.1 (#8)
  - @radix-ui/react-tooltip: 1.1.6 → 1.2.8 (#7)
  - @hookform/resolvers: 5.1.1 → 5.2.2 (#4)

### 2025-10-24
- ✅ **GitHub CLI 도입 계획 수립**
  - `docs/github-cli-guide.md` 작성 완료 (14개 섹션, 500+ 라인)
  - 무료 플랜 기반 구체적 활용 방안 문서화
  - Claude Code ↔ GPT-5 협업 전략 설계
  - Phase별 실행 계획 수립 (즉시 시작 → CI/CD → 장기 운영)
  - 예상 비용 분석 완료 (GitHub Actions 무료, OpenAI API ~$3/월)
- ✅ **PLAN.md 업데이트**
  - GitHub CLI & Automation Phase 추가
  - In Progress 섹션에 인프라 작업 추가

### 2025-10-23
- ✅ **Parent/Student Approval System Completed**
  - Admin approval workflow in `/employees` page (second tab)
  - Three actions: Approve, Reject, Delete (with Supabase Auth deletion)
  - Student selection modal with search and sorting
  - Approval history table with pagination (10 items/page)
  - Using `profiles` table with `student_id` FK for data integrity
- ✅ **Parent/Student Portal Completed**
  - Route: `/portal` with role-based access control
  - 6 data sources: study_logs, test_logs, school_exam_scores, makeup_classes, consultations, mathflat_records
  - UI: Student info card + overview stats + activity timeline + detailed sections
  - RLS policies: Students/parents can only view their own data
  - Middleware: Auto-redirect students/parents from dashboard to portal
- ✅ **Technical Fixes**
  - Fixed global scroll issue (removed `overflow: hidden` from body)
  - Fixed portal layout scroll with sticky header
  - Added comprehensive RLS policies for all portal tables

### 2025-10-22
- ✅ School exam scores management system completed
  - Database: `school_exam_scores` table with RLS policies
  - Student selection: Searchable combobox with 재원생 priority and ㄱㄴㄷ sorting
  - Score input: Multiple subjects per student with decimal support (0.01 precision)
  - Filters: 3-column layout (student/school/subject search + 6 filters)
  - Table: Color-coded scores (90+ green → 60- red) with PDF preview
  - Integration: Optional link to `school_exams` for PDF access
  - UI fixes: Mouse wheel scrolling and React state-based search
  - Page: `/learning/school-exam-scores` with LearningTabs

### 2025-10-21
- ✅ School exam management system completed
  - Database schema: `school_exams` table with RLS policies
  - Storage: Supabase Storage bucket `school-exam-pdfs` with RLS
  - PDF upload: Drag-and-drop component with validation
  - UI: Modal form, filters, table with icon-only status indicators
  - Page: `/learning/school-exams` with LearningTabs integration
  - Performance: Composite index for employees RLS optimization
- ✅ Fixed Excel export phone number bug (`paymentPhone` field)
- ✅ Deployed to production (commit 9cde25d)

### 2025-10-01
- ✅ Updated CLAUDE.md documentation (420 lines)
- ✅ Created PLAN.md for project roadmap
- ✅ Added GitHub workflow integration guidelines
- ✅ Debugged September monthly stats cron issue
- ✅ Disabled failing Job #5 (enrollment_date error)
- ✅ Manually corrected September 2025 data (3 → 86 students)

### 2025-08-27
- ✅ Workspace system completed (Todos/Memos)
- ✅ Real-time updates with Supabase subscriptions
- ✅ Employee names integration (using `employees` table)
- ✅ Dashboard Todo statistics card

### 2025-08-26
- ✅ Consultation management system added
- ✅ Student timeline consultation details integration

### 2025-08-22
- ✅ Monthly stats automation with pg_cron
- ✅ UPSERT logic for duplicate prevention

### 2025-10-01 Feature Improvements
- ✅ Mathflat statistics period expanded (1주 → 2주)
- ✅ Tuition field changed (`payment_date` → `period_date`)
- ✅ Excel export for tuition history
- ✅ Student registration grade options (4-6학년 추가)
- ✅ Resources page with Google Drive integration
- ✅ Security updates (xlsx 0.20.3, Next.js 15.4.7)

---

## 🔧 Technical Debt

### High Priority
- None currently identified

### Medium Priority
- Consider refactoring auth patterns for better consistency
- Evaluate SWR cache strategies for performance

### Low Priority
- Component organization cleanup
- Type safety improvements for complex Supabase queries

---

## 📊 Success Metrics

### Performance
- Build time: < 60 seconds
- First load JS: < 500KB
- Lighthouse score: > 90

### Quality
- TypeScript coverage: 100%
- Test coverage: TBD (E2E tests planned)
- Zero critical security vulnerabilities

### User Experience
- Monthly stats automation: 100% success rate
- Real-time updates latency: < 500ms
- User approval workflow: < 24h turnaround

---

## 🎓 Learning Notes

### Best Practices Established
1. Always use `employees` table for user names (NOT `profiles`)
2. Use `period_date` field for tuition (NOT `payment_date`)
3. Implement data change tracking for all bulk edit pages
4. Use Sonner toast for all notifications (more stable)
5. Separate existing/new records for Supabase upsert operations
6. Add proper dependencies to all useCallback hooks to prevent form reset
7. Use explicit column widths in tables for proper alignment
8. Optimize RLS policies with composite indexes (e.g., `auth_id, status`)
9. Use `profiles.student_id` FK for approved registrations (NOT `pending_registrations.student_name`)
10. Add RLS policies for student/parent data access (self-service portal pattern)
11. Remove global `overflow: hidden` - let layouts manage their own scroll

### Common Pitfalls Avoided
1. Hydration errors with auth state (solved with AuthProvider)
2. Concurrent editing conflicts (solved with collaboration lock)
3. Missing DB deletes in bulk edit (solved with deleted IDs tracking)
4. Duplicate sibling discount application (solved with state comparison)
5. Form reset on drag-and-drop (solved with proper useCallback dependencies)
6. Storage upload failures (solved with proper RLS policies on storage.objects)
7. Table column misalignment (solved with explicit width classes)

---

## 🚀 Deployment Checklist

### Before Each Deploy
- [ ] Run `npm run build` locally
- [ ] Check TypeScript errors
- [ ] Review ESLint warnings
- [ ] Test critical user flows
- [ ] Update PLAN.md with changes

### Post-Deploy Verification
- [ ] Verify production build success on Vercel
- [ ] Check Supabase connection
- [ ] Test authentication flow
- [ ] Monitor error logs for 24h

---

**Next Review Date**: October 31, 2025 (Monthly stats verification)
