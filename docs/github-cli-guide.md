# ValueIn Academy - GitHub CLI 활용 가이드

**Last Updated**: 2025-10-24
**Repository**: https://github.com/curiohunter/valueinmath-web

---

## 📋 목차

1. [개요](#개요)
2. [설치 및 설정](#설치-및-설정)
3. [일상 워크플로우](#일상-워크플로우)
4. [GitHub Actions 자동화](#github-actions-자동화)
5. [Claude Code ↔ GPT-5 협업](#claude-code--gpt-5-협업)
6. [장기 운영 전략](#장기-운영-전략)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

### GitHub CLI란?

GitHub CLI(`gh`)는 터미널에서 GitHub 리포지토리, 이슈, PR을 관리하는 공식 도구입니다. 브라우저 없이 개발 워크플로우를 완전히 자동화할 수 있습니다.

### ValueIn Academy 프로젝트 도입 목적

1. **이슈 관리 체계화**: PLAN.md 수동 관리 → GitHub Issues 자동화
2. **코드 품질 향상**: GPT-5 자동 리뷰로 다각도 검증
3. **안전한 배포**: Feature branch + PR + CI/CD 파이프라인
4. **개발 이력 관리**: 릴리즈 노트 자동 생성, 변경 사항 추적

### 예상 효과

- ✅ 작업 진행 상황 실시간 추적
- ✅ 버그 발견 → 이슈 생성 → 수정 → 자동 닫기 워크플로우
- ✅ GPT-5 코드 리뷰로 Claude Code와 다른 관점 확보
- ✅ 체계적인 릴리즈 관리 (월간 배포 히스토리)

---

## 설치 및 설정

### 1. GitHub CLI 설치

```bash
# macOS (Homebrew)
brew install gh

# 설치 확인
gh --version
# gh version 2.40.0 (2024-01-15)
```

### 2. GitHub 인증

```bash
# OAuth 인증 시작
gh auth login

# 선택 옵션:
# → GitHub.com
# → HTTPS
# → Y (인증 토큰 생성)
# → Login with a web browser

# 인증 확인
gh auth status
# ✓ Logged in to github.com as curiohunter
```

### 3. 프로젝트 연결 확인

```bash
cd /Users/ian/project/claude_project/valuein_homepage

# 리포지토리 정보 확인
gh repo view
# curiohunter/valueinmath-web
# ValueIn Academy Management System
# https://github.com/curiohunter/valueinmath-web
```

### 4. 라벨 체계 구축

```bash
# 프로젝트 맞춤 라벨 생성
gh label create "supabase" --color "3ECF8E" --description "Supabase 관련"
gh label create "next.js" --color "000000" --description "Next.js 15 관련"
gh label create "auth" --color "FF6B6B" --description "인증/권한 관리"
gh label create "portal" --color "4ECDC4" --description "학부모/학생 포털"
gh label create "dashboard" --color "95E1D3" --description "관리자 대시보드"
gh label create "high-priority" --color "D32F2F" --description "긴급 처리 필요"
gh label create "medium-priority" --color "FFA726" --description "중요도 중간"
gh label create "low-priority" --color "66BB6A" --description "낮은 우선순위"
gh label create "Q4-2025" --color "9C27B0" --description "2025년 4분기"
gh label create "Q1-2026" --color "673AB7" --description "2026년 1분기"
gh label create "Q2-2026" --color "3F51B5" --description "2026년 2분기"
gh label create "SaaS-준비" --color "2196F3" --description "Multi-tenancy 대비"

# 라벨 확인
gh label list
```

### 5. 마일스톤 설정

```bash
# Q4 2025: SaaS Multi-tenancy Preparation
gh api repos/curiohunter/valueinmath-web/milestones \
  --method POST \
  --field title="Q4 2025 - SaaS 준비" \
  --field due_on="2025-12-31T23:59:59Z" \
  --field description="Database schema review, Tenant isolation strategy"

# Q1 2026: UX/UI Enhancements
gh api repos/curiohunter/valueinmath-web/milestones \
  --method POST \
  --field title="Q1 2026 - UX/UI 개선" \
  --field due_on="2026-03-31T23:59:59Z" \
  --field description="Mobile responsiveness, Dark mode, Accessibility"

# Q2 2026: Advanced Features
gh api repos/curiohunter/valueinmath-web/milestones \
  --method POST \
  --field title="Q2 2026 - 고급 기능" \
  --field due_on="2026-06-30T23:59:59Z" \
  --field description="Enhanced analytics, Automated reporting, SMS/Email notification"

# 마일스톤 확인
gh api repos/curiohunter/valueinmath-web/milestones
```

---

## 일상 워크플로우

### 1. 버그 발견 시 즉시 이슈 생성

```bash
# 예시: 학원비 엑셀 내보내기 버그
gh issue create \
  --title "bug: 학원비 엑셀 내보내기 시 형제할인 중복 적용" \
  --body "**재현 조건**:
1. 학원비 관리 페이지 접속
2. 형제할인 체크박스 여러 번 클릭
3. 엑셀 내보내기 실행

**Expected**: 5% 할인 1회만 적용
**Actual**: 클릭 횟수만큼 중복 적용 (5% → 10% → 15% ...)

**Related Code**:
\`app/(dashboard)/students/[id]/tuition/page.tsx:245\`

**Assigned**: @curiohunter" \
  --label "bug,high-priority,dashboard" \
  --assignee "@me"

# 이슈 번호 확인 (예: #5 생성됨)
gh issue list
```

### 2. 이슈 해결 후 커밋 연결

```bash
# Claude Code로 버그 수정
# ... 코드 수정 ...

# 커밋 메시지에 이슈 번호 포함
git add .
git commit -m "fix: 학원비 형제할인 중복 적용 방지

- 현재 상태(row.isSibling) 확인 로직 추가
- 체크박스 상태 변경 시에만 할인율 적용/해제
- 중복 클릭 시 상태 불변성 보장

Fixes #5"

git push origin main

# GitHub이 자동으로 Issue #5를 닫음
```

### 3. 새 기능 개발 (Feature Branch + PR)

```bash
# Feature branch 생성
git checkout -b feature/sms-notification

# 이슈 먼저 생성
gh issue create \
  --title "feat: SMS/Email 알림 시스템 구현" \
  --body "**Requirements**:
- [ ] Twilio API 연동
- [ ] 학부모 전화번호 검증
- [ ] 알림 발송 이력 DB 저장
- [ ] 대시보드 알림 전송 UI

**Estimated Time**: 2-3 days" \
  --label "enhancement,Q2-2026,dashboard" \
  --milestone "Q2 2026 - 고급 기능"

# 개발 진행...
# Claude Code로 코드 작성

# PR 생성 (자동으로 이슈 번호 감지)
gh pr create \
  --title "feat: SMS/Email 알림 시스템 구현" \
  --body "## Summary
학부모에게 출결, 성적, 상담 내용을 SMS/Email로 전송하는 기능 추가

## Changes
- \`lib/notifications/twilio.ts\`: Twilio API wrapper
- \`app/(dashboard)/notifications/page.tsx\`: 알림 관리 페이지
- \`database/migrations/20260315_add_notifications.sql\`: DB 스키마

## Testing
- [x] Twilio Sandbox 환경 테스트 완료
- [x] RLS 정책 확인 (원장/부원장만 발송 가능)

Closes #15" \
  --assignee "@me"

# PR 상태 확인
gh pr status

# 자동 GPT-5 리뷰 완료 후 머지
gh pr merge --squash --delete-branch
```

### 4. 월간 릴리즈 노트 생성

```bash
# 매월 말 릴리즈 태그 생성
gh release create v1.1.0 \
  --title "November 2025 Release" \
  --generate-notes \
  --notes-start-tag v1.0.0

# 출력 예시:
# ## What's Changed
# * feat: SMS/Email 알림 시스템 by @curiohunter in #15
# * fix: 학원비 형제할인 중복 적용 방지 by @curiohunter in #5
# * docs: GitHub CLI 가이드 추가 by @curiohunter in #16
#
# **Full Changelog**: https://github.com/curiohunter/valueinmath-web/compare/v1.0.0...v1.1.0
```

---

## GitHub Actions 자동화

### 워크플로우 구조

```
.github/
├── workflows/
│   ├── ci.yml                    # TypeScript/ESLint 검증
│   ├── gpt5-review.yml          # GPT-5 코드 리뷰
│   ├── db-check.yml             # Supabase Migration 검증
│   └── monthly-report.yml       # 월간 프로젝트 리포트
├── dependabot.yml               # 보안 취약점 스캔
└── PULL_REQUEST_TEMPLATE.md    # PR 템플릿
```

### 1. CI 파이프라인 (`.github/workflows/ci.yml`)

```yaml
name: CI - Code Quality Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint
        continue-on-error: true

      - name: TypeScript Check
        run: npx tsc --noEmit
        continue-on-error: true

      - name: Build Check
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### 2. GPT-5 코드 리뷰 (`.github/workflows/gpt5-review.yml`)

```yaml
name: GPT-5 Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout PR
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR diff
        id: diff
        run: |
          git fetch origin ${{ github.base_ref }}
          DIFF=$(git diff origin/${{ github.base_ref }}...HEAD)
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: GPT-5 Code Review
        uses: actions/github-script@v7
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        with:
          script: |
            const fetch = require('node-fetch');

            const reviewPrompt = `
            # ValueIn Academy 프로젝트 코드 리뷰

            ## 프로젝트 컨텍스트
            - Next.js 15 App Router
            - Supabase (PostgreSQL + Auth + RLS)
            - TypeScript strict mode
            - 학원 관리 시스템 (학생/학부모/교직원)

            ## 리뷰 중점 사항
            1. **Supabase RLS 정책**: 학생/학부모는 본인 데이터만, 교직원은 전체 접근
            2. **Next.js 15 호환성**: async cookies(), Server Actions 패턴
            3. **TypeScript 타입 안전성**: Supabase 타입 일치 여부
            4. **보안 취약점**: SQL injection, XSS, CSRF
            5. **성능 최적화**: 불필요한 리렌더링, N+1 쿼리

            ## 코드 변경 내용
            \`\`\`diff
            ${{ steps.diff.outputs.diff }}
            \`\`\`

            ## 요청사항
            - 각 파일별 리뷰 코멘트 (개선점, 버그, 보안 이슈)
            - 우선순위 (Critical/High/Medium/Low)
            - 구체적인 수정 제안 코드
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                  { role: 'system', content: 'You are a senior code reviewer specializing in Next.js, Supabase, and TypeScript.' },
                  { role: 'user', content: reviewPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4000
              })
            });

            const data = await response.json();
            const reviewComment = data.choices[0].message.content;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## 🤖 GPT-5 Code Review\n\n${reviewComment}`
            });
```

### 3. Supabase Migration 검증 (`.github/workflows/db-check.yml`)

```yaml
name: Database Migration Check

on:
  pull_request:
    paths:
      - 'database/**'
      - 'types/supabase.ts'

jobs:
  migration-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Check RLS Policies
        run: |
          # RLS 정책 누락 검증
          for file in database/migrations/*.sql; do
            if grep -q "CREATE TABLE" "$file"; then
              table=$(grep "CREATE TABLE" "$file" | head -1 | awk '{print $3}')
              if ! grep -q "ALTER TABLE $table ENABLE ROW LEVEL SECURITY" "$file"; then
                echo "::warning::Table $table missing RLS policy in $file"
              fi
            fi
          done
```

### 4. 보안 스캔 (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "curiohunter"
    labels:
      - "dependencies"
      - "automated"
    versioning-strategy: increase-if-necessary

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

### 5. GitHub Secrets 설정

```bash
# Supabase 환경 변수
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "eyJhbG..."

# OpenAI API Key (GPT-5)
gh secret set OPENAI_API_KEY --body "sk-proj-..."

# Secrets 확인
gh secret list
```

---

## Claude Code ↔ GPT-5 협업

### 역할 분담 전략

| 역할 | Claude Code | GPT-5 |
|------|-------------|-------|
| **개발** | ✅ 코드 작성 및 리팩토링 | ❌ |
| **리뷰** | ⚠️ 자체 검증 | ✅ 다른 관점 검증 |
| **보안** | ⚠️ 기본 체크 | ✅ 심층 분석 |
| **최적화** | ✅ 초기 구현 | ✅ 성능 병목 탐지 |
| **문서화** | ✅ 코드 주석 | ✅ 아키텍처 설명 |

### 실전 워크플로우

```bash
# 1. Claude Code로 기능 개발
# Feature: 학부모 포털 알림 설정

git checkout -b feature/parent-notification-settings

# Claude Code 프롬프트:
# "학부모가 알림 수신 설정을 변경할 수 있는 페이지 구현해줘.
#  - SMS/Email 각각 on/off
#  - 알림 유형별 설정 (출결, 성적, 상담, 학원비)
#  - Supabase에 저장, RLS 정책 추가"

# 2. PR 생성
gh pr create --fill

# 3. GPT-5 자동 리뷰 (GitHub Actions 트리거)
# → 5분 후 PR 코멘트에 리뷰 등록

# 4. GPT-5 제안 반영 (Claude Code로 수정)
# GPT-5 코멘트: "notification_settings 테이블에 인덱스 누락"

# Claude Code 프롬프트:
# "GPT-5 리뷰 코멘트 반영해서 parent_id 컬럼에 인덱스 추가해줘"

# 5. 최종 머지
gh pr merge --squash --delete-branch
```

### GPT-5 리뷰 예시 출력

```markdown
## 🤖 GPT-5 Code Review

### 📁 app/(portal)/settings/notifications/page.tsx

**Priority: High**
**Issue**: Race condition in notification settings update

**Current Code** (Line 45-52):
```typescript
const handleToggle = async (type: string, enabled: boolean) => {
  setLoading(true);
  await supabase
    .from('notification_settings')
    .update({ [type]: enabled })
    .eq('parent_id', user.id);
  setLoading(false);
};
```

**Problem**: 여러 토글을 빠르게 클릭 시 마지막 요청만 반영될 수 있음

**Suggested Fix**:
```typescript
const handleToggle = async (type: string, enabled: boolean) => {
  // Optimistic update
  setSettings(prev => ({ ...prev, [type]: enabled }));

  try {
    const { error } = await supabase
      .from('notification_settings')
      .update({ [type]: enabled })
      .eq('parent_id', user.id);

    if (error) throw error;
  } catch (err) {
    setSettings(prev => ({ ...prev, [type]: !enabled }));
    toast.error('설정 저장 실패');
  }
};
```

---

### 📁 lib/notifications/send.ts

**Priority: Critical** ⚠️
**Issue**: Missing rate limiting for SMS API

**Suggested Fix**: Rate limiter 구현 (10 SMS/hour per parent)
```

---

## 장기 운영 전략

### 1. 월간 릴리즈 루틴

```bash
# 매월 말 체크리스트
gh issue list --milestone "Q4-2025" --state open  # 미완료 작업
gh pr list --state merged --search "merged:2025-11"  # 이번 달 머지된 PR
gh release create v1.2.0 --generate-notes  # 릴리즈 노트

# PLAN.md 업데이트
# "Recent Changes Log" 섹션에 릴리즈 내용 반영
```

### 2. PLAN.md ↔ GitHub Issues 동기화

```bash
# 주간 동기화 체크
# PLAN.md "In Progress" 섹션 확인
gh issue list --state open --label "in-progress"

# 불일치 발견 시:
# - PLAN.md에만 있음 → Issue 생성
# - Issue에만 있음 → PLAN.md 업데이트
```

### 3. 분기별 리뷰

```bash
# Q4 2025 종료 시 (12월 말)
gh issue list --milestone "Q4 2025 - SaaS 준비" --state all
gh pr list --search "merged:2025-10..2025-12"

# 다음 분기 준비
gh milestone list  # Q1 2026 마일스톤 확인
gh issue list --milestone "Q1 2026 - UX/UI 개선"
```

---

## 트러블슈팅

### 1. GitHub CLI 인증 실패

```bash
# 증상: gh auth status 실패
# 해결: 토큰 재생성
gh auth logout
gh auth login
```

### 2. GitHub Actions 워크플로우 오류

```bash
# 워크플로우 실행 로그 확인
gh run list
gh run view [RUN_ID] --log

# 특정 Job 재실행
gh run rerun [RUN_ID]
```

### 3. GPT-5 API 비용 초과

```bash
# 월간 사용량 확인
# OpenAI Dashboard: https://platform.openai.com/usage

# 비용 절감 방법:
# 1. PR 크기 제한 (1000 lines 이하)
# 2. 리뷰 빈도 조절 (중요한 PR만)
# 3. Temperature 낮추기 (0.3 → 0.1)
```

### 4. Secrets 업데이트

```bash
# Secret 값 변경
gh secret set OPENAI_API_KEY --body "new-key-value"

# Secret 삭제
gh secret remove OLD_SECRET_NAME
```

---

## 참고 자료

### 공식 문서
- [GitHub CLI 공식 문서](https://cli.github.com/manual/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [OpenAI API 문서](https://platform.openai.com/docs/api-reference)

### 프로젝트 관련 문서
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
- [PLAN.md](../PLAN.md) - 개발 로드맵
- [README.md](../README.md) - 프로젝트 개요

### 내부 워크플로우
- `.github/workflows/` - GitHub Actions 워크플로우
- `.github/PULL_REQUEST_TEMPLATE.md` - PR 템플릿

---

**마지막 업데이트**: 2025-10-24
**작성자**: Claude Code + curiohunter
**문의**: GitHub Issues 또는 curiohunter@valueinmath.com
