# ValueIn Academy Management System - Development Plan

## 📋 Project Information

**Repository**: https://github.com/curiohunter/valueinmath-web
**Stack**: Next.js 15, Supabase, TypeScript, Tailwind CSS
**Deployment**: Vercel (auto-deploy on push to main)
**Last Updated**: 2025-10-27

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

#### Management Features (2025-07-09 ~ 2025-10-23)
- [x] Tuition management with Excel export
- [x] Learning history & test logs
- [x] Makeup class tracking
- [x] Entrance test management
- [x] Resources page (Google Drive integration)
- [x] School exam management system (PDF upload, filters, storage)
- [x] School exam scores system (student-subject-score tracking with decimal support)
- [x] Parent/Student approval system (admin approval workflow with delete)
- [x] Parent/Student portal (학습 포털 with 6 data sources integration)

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
