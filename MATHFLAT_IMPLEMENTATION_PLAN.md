# 매쓰플랫 문제 정보 및 학생 답안 입력 시스템 구현 계획서

## 1. 프로젝트 개요

### 1.1 목표
- 매쓰플랫에서 생성된 문제집/테스트의 정보를 체계적으로 관리
- 학생들이 빠르고 재미있게 답안을 입력할 수 있는 모바일 우선 인터페이스 구축
- 오답 분석 및 학습 데이터 수집을 통한 개인화된 학습 지원
- 팔란티어(Palantir Foundry)와 연동하여 고급 학습 분석 제공

### 1.2 핵심 가치
- **속도**: 매쓰플랫 학생 앱보다 3배 빠른 답안 입력
- **재미**: 게임화 요소로 학생 참여도 향상
- **인사이트**: 체계적인 오답 분석 및 학습 패턴 파악
- **확장성**: 팔란티어 연동을 통한 빅데이터 분석

## 2. 데이터베이스 설계

### 2.1 주요 테이블 구조

#### mathflat_workbooks (문제집 정보)
```sql
CREATE TABLE mathflat_workbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workbook_name TEXT NOT NULL,
  publisher TEXT,
  grade_level TEXT, -- '중1-1', '고등-공통수학1' 등
  subject_area TEXT, -- '대수', '미적분', '확통' 등
  workbook_type TEXT, -- '개념서', '유형서', '기출문제집' 등
  total_pages INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### mathflat_tests (테스트/시험 정보)
```sql
CREATE TABLE mathflat_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name TEXT NOT NULL,
  test_type TEXT, -- '단원평가', '모의고사', '일일테스트' 등
  test_date DATE,
  workbook_id UUID REFERENCES mathflat_workbooks(id),
  created_by UUID REFERENCES employees(id),
  start_page INTEGER,
  end_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### mathflat_problems (문제 정보)
```sql
CREATE TABLE mathflat_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_number TEXT NOT NULL, -- '1번', '2-1번' 등
  problem_text TEXT, -- 문제 내용 (선택사항)
  workbook_id UUID REFERENCES mathflat_workbooks(id),
  test_id UUID REFERENCES mathflat_tests(id),
  page_number INTEGER,
  difficulty TEXT, -- '상', '중', '하'
  category TEXT, -- '이차함수', '미분', '확률' 등
  sub_category TEXT, -- '최대최소', '변화율', '조건부확률' 등
  correct_rate DECIMAL(3,1), -- 전국 정답률 (%)
  tags TEXT[], -- ['계산', '응용', '증명'] 등
  problem_source TEXT, -- '매쓰플랫', '자체제작' 등
  grade_level TEXT, -- 문제별 난이도 레벨
  chapter TEXT, -- 단원 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### mathflat_student_answers (학생 답안)
```sql
CREATE TABLE mathflat_student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  problem_id UUID REFERENCES mathflat_problems(id),
  test_log_id UUID REFERENCES test_logs(id),
  student_answer TEXT, -- 학생이 입력한 답
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  solving_time INTEGER, -- 풀이 시간(초)
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
  error_type TEXT, -- '계산실수', '개념오류', '문제이해실패', '시간부족' 등
  notes TEXT, -- 학생 질문이나 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 인덱스 전략
```sql
-- 빠른 조회를 위한 인덱스
CREATE INDEX idx_problems_workbook ON mathflat_problems(workbook_id);
CREATE INDEX idx_problems_test ON mathflat_problems(test_id);
CREATE INDEX idx_answers_student ON mathflat_student_answers(student_id);
CREATE INDEX idx_answers_problem ON mathflat_student_answers(problem_id);
CREATE INDEX idx_answers_date ON mathflat_student_answers(answered_at);
```

### 2.3 Row Level Security (RLS)
```sql
-- 학생은 자신의 답안만 조회/수정 가능
ALTER TABLE mathflat_student_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own answers" ON mathflat_student_answers
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own answers" ON mathflat_student_answers
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 교사는 모든 데이터 접근 가능
CREATE POLICY "Teachers can view all data" ON mathflat_student_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_id = auth.uid() 
      AND position IN ('강사', '원장', '부원장')
    )
  );
```

## 3. UI/UX 설계

### 3.1 학생용 답안 입력 인터페이스

#### 메인 화면 구성
```
┌─────────────────────────┐
│  📚 중2-1 단원평가      │
│  진행률: 15/20 (75%)    │
├─────────────────────────┤
│                         │
│     문제 15번           │
│                         │
│   [문제 이미지/텍스트]   │
│                         │
├─────────────────────────┤
│   ① ② ③ ④ ⑤          │
│                         │
│  [스와이프하여 다음 →]  │
└─────────────────────────┘
```

#### 주요 기능
1. **빠른 입력 모드**
   - 숫자 패드: 객관식 답안 즉시 입력
   - 스와이프: 좌(이전), 우(다음), 상(건너뛰기), 하(북마크)
   - 음성 입력: "3번" 말하면 자동 입력 (선택사항)

2. **즉시 피드백**
   - 정답/오답 즉시 표시 (설정 가능)
   - 연속 정답 시 콤보 애니메이션
   - 틀린 문제 자동 북마크

3. **게임화 요소**
   ```
   🔥 5 연속 정답! (+50점)
   ⏱️ 빠른 풀이 보너스! (+20점)
   🏆 오늘의 순위: 3위
   ```

### 3.2 오답 분석 입력

#### 오답 유형 빠른 선택
```
┌─────────────────────────┐
│   왜 틀렸나요?          │
├─────────────────────────┤
│ 🧮 계산 실수            │
│ 💡 개념 이해 부족       │
│ 📖 문제 이해 실패       │
│ ⏰ 시간 부족            │
│ 🎯 기타                 │
└─────────────────────────┘
```

#### 세부 태그 시스템
- 계산 실수: 부호 실수, 연산 순서, 계산 오류
- 개념 오류: 공식 혼동, 정의 오해, 원리 미숙
- 문제 이해: 조건 놓침, 질문 오해, 그래프 해석
- 시간 부족: 풀이 중단, 마킹 실수

### 3.3 대시보드 디자인

#### 학생 개인 대시보드
```
┌─────────────────────────┐
│   이번 주 학습 현황     │
├─────────────────────────┤
│ 📊 정답률: 78%          │
│ 🎯 목표 달성: 4/5일     │
│ 🏅 랭킹: 반 5위         │
│ 🔥 연속 학습: 12일      │
├─────────────────────────┤
│   취약 유형 TOP 3       │
│ 1. 이차함수 최대최소    │
│ 2. 절댓값 함수          │
│ 3. 함수의 극한          │
└─────────────────────────┘
```

## 4. 기술 구현 방안

### 4.1 프론트엔드 아키텍처

#### 컴포넌트 구조
```
/app
  /mathflat
    /answer-input
      page.tsx          # 답안 입력 메인 페이지
      /components
        QuestionCard.tsx    # 문제 표시 컴포넌트
        AnswerPad.tsx      # 답안 입력 패드
        SwipeHandler.tsx   # 스와이프 제스처 처리
        ComboAnimation.tsx # 연속 정답 애니메이션
    /dashboard
      page.tsx          # 학습 대시보드
    /analysis
      page.tsx          # 오답 분석 페이지
```

#### 주요 기술 스택
- **UI Framework**: Next.js 15 (App Router)
- **스타일링**: Tailwind CSS + shadcn/ui
- **애니메이션**: Framer Motion
- **상태관리**: SWR + Zustand (게임 상태)
- **제스처**: react-swipeable
- **차트**: Recharts

### 4.2 백엔드 구현

#### API 엔드포인트
```typescript
// /api/mathflat/problems
GET    /api/mathflat/problems?testId={id}     // 테스트 문제 목록
POST   /api/mathflat/problems                  // 문제 등록

// /api/mathflat/answers
POST   /api/mathflat/answers                   // 답안 제출
PATCH  /api/mathflat/answers/:id              // 답안 수정
GET    /api/mathflat/answers/stats            // 통계 조회

// /api/mathflat/analysis
GET    /api/mathflat/analysis/errors          // 오답 분석
GET    /api/mathflat/analysis/patterns        // 학습 패턴
```

#### Supabase Edge Functions
```typescript
// 실시간 리더보드 계산
supabase.functions.serve('calculate-leaderboard')

// 학습 패턴 분석
supabase.functions.serve('analyze-learning-patterns')

// 팔란티어 데이터 동기화
supabase.functions.serve('sync-to-palantir')
```

### 4.3 팔란티어 통합 설계

#### 데이터 파이프라인
```
Supabase DB → Edge Function → Palantir API
     ↓              ↓              ↓
[실시간 데이터] [배치 처리]  [온톨로지 저장]
```

#### 온톨로지 매핑
```yaml
Student:
  - id, name, grade, school
  - relationships: [answers, tests, classes]
  
Problem:
  - id, content, difficulty, category
  - relationships: [workbook, answers, tags]
  
Answer:
  - id, student_answer, is_correct, timestamp
  - relationships: [student, problem, error_type]
  
LearningPattern:
  - student_id, pattern_type, confidence_score
  - time_series_data, recommendations
```

## 5. 구현 로드맵

### Phase 1: MVP (1-2주)
- [ ] 데이터베이스 스키마 생성
- [ ] 기본 CRUD API 구현
- [ ] 문제 정보 입력 관리자 페이지
- [ ] 모바일 답안 입력 UI
- [ ] 기본 인증 및 권한 설정

### Phase 2: 핵심 기능 (2-3주)
- [ ] 스와이프 제스처 구현
- [ ] 실시간 채점 시스템
- [ ] 오답 유형 선택 UI
- [ ] 기본 통계 대시보드
- [ ] 교사용 모니터링 페이지

### Phase 3: 게임화 (3-4주)
- [ ] 포인트/경험치 시스템
- [ ] 레벨/뱃지/업적 시스템
- [ ] 실시간 리더보드
- [ ] 친구 시스템
- [ ] 일일/주간 챌린지

### Phase 4: 고급 기능 (4-5주)
- [ ] 팔란티어 API 연동
- [ ] 고급 학습 분석
- [ ] AI 기반 문제 추천
- [ ] PWA 설정
- [ ] 오프라인 모드

## 6. 성능 목표

### 응답 시간
- 답안 제출: < 200ms
- 페이지 전환: < 100ms
- 통계 로딩: < 500ms

### 사용성 지표
- 문제당 입력 시간: < 5초
- 일일 활성 사용자: 80%+
- 답안 완성률: 90%+

### 확장성
- 동시 접속자: 1,000명+
- 일일 답안 처리: 100,000개+
- 데이터 보관: 3년+

## 7. 보안 및 개인정보보호

### 데이터 보안
- 모든 API 통신 HTTPS 암호화
- JWT 토큰 기반 인증
- Row Level Security로 데이터 격리

### 개인정보보호
- 학생 개인정보 최소 수집
- 학습 데이터 익명화 처리
- GDPR/개인정보보호법 준수

## 8. 예상 효과

### 학생 측면
- 답안 입력 시간 70% 단축
- 학습 동기부여 200% 향상
- 즉각적인 피드백으로 학습 효율 증대

### 교사 측면
- 실시간 학습 현황 파악
- 데이터 기반 맞춤 지도
- 행정 업무 시간 50% 감소

### 학원 측면
- 차별화된 교육 서비스
- 학부모 만족도 향상
- 데이터 기반 의사결정

## 9. 리스크 및 대응 방안

### 기술적 리스크
- **문제**: 대용량 동시 접속 처리
- **해결**: CDN, 캐싱, 로드밸런싱

### 사용성 리스크
- **문제**: 복잡한 UI로 인한 사용 거부감
- **해결**: 단계적 온보딩, 튜토리얼

### 데이터 리스크
- **문제**: 학습 데이터 유출
- **해결**: 암호화, 접근 제어, 감사 로그

## 10. 향후 확장 계획

### 단기 (6개월)
- 음성 인식 답안 입력
- AI 오답 노트 자동 생성
- 학부모 앱 연동

### 중기 (1년)
- 타 학원 SaaS 서비스
- 전국 단위 학습 데이터 분석
- 교육청 연계 서비스

### 장기 (2년+)
- AI 튜터 기능
- VR/AR 문제 풀이
- 글로벌 서비스 확장