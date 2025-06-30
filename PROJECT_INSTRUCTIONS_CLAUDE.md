# 밸류인학원 관리 시스템 - Claude Desktop 분석 가이드

## 🎯 프로젝트 개요

밸류인학원의 종합 관리 시스템으로, 학생 등록부터 학습 관리, 재무 분석까지 모든 학원 운영 데이터를 다루는 Next.js 15 기반 웹 애플리케이션입니다.

**당신의 역할**: 이 시스템의 데이터를 분석하여 학원 운영에 실질적인 도움이 되는 인사이트를 생성하는 것입니다.

## 🏗️ 시스템 아키텍처

### 기술 스택
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)  
- **UI Components**: shadcn/ui (Radix UI 기반)
- **State Management**: SWR for server state, React hooks for local state

## 📊 데이터베이스 구조 상세 가이드

### ⚠️ 중요: 필드별 정확한 의미와 사용법

#### 1. 학생 정보 테이블 (`students`)
**핵심 식별 정보:**
- `id` (UUID) - 학생 고유 식별자
- `name` (TEXT) - 학생 이름
- `student_id` (TEXT) - 학생 학번/관리번호

**연락처 정보:**
- `phone` (TEXT) - 학생 본인 연락처
- `parent_phone` (TEXT) - 부모 연락처 (주요 연락 수단)
- `emergency_contact` (TEXT) - 비상 연락처

**학교 및 학년 정보 (중요!):**
- `school` (TEXT) - 학교명 (예: "양진초" → 정확한 전체명은 "양진초등학교")
- `school_type` (TEXT) - 학교 구분: "초등학교", "중학교", "고등학교"
- `grade` (INTEGER) - 학년 (1~6학년 or 1~3학년)
- **⚠️ 정확한 학년 파악**: `school_type` + `grade`를 조합해야 정확함
  - 예: school_type="초등학교", grade=5 → "초등학교 5학년"
  - 예: school_type="중학교", grade=2 → "중학교 2학년"

**등록 및 상담 정보:**
- `first_contact_date` (DATE) - **최초 상담일** (등록 문의 시점, 매우 중요한 마케팅 분석 기준)
- `registration_date` (DATE) - 실제 등록일 (수강 시작일)
- `lead_source` (TEXT) - 유입 경로: "원내친구추천", "원외학부모추천", "블로그", "오프라인", "네이버검색" 등

**학원 내부 정보:**
- `department` (TEXT) - 소속 부서: "고등관", "영재관", "중등관"
- `status` (TEXT) - 학생 상태: "재원", "퇴원", "미등록", "삭제됨"
- `sibling_discount` (BOOLEAN) - 형제 할인 적용 여부

**분석 중요 포인트:**
- 신규 등록 분석 시 `first_contact_date` 기준으로 월별 문의량 추적
- 전환율 계산: (등록 학생 수 / 문의 학생 수) * 100
- 마케팅 효과 분석 시 `lead_source` 활용

#### 2. 수강료 관리 테이블 (`tuition_fees`)
**기본 정보:**
- `student_id` (UUID) - students 테이블 참조
- `year` (INTEGER) - 수강 연도
- `month` (INTEGER) - 수강 월 (1-12)
- `amount` (INTEGER) - 수강료 금액 (원화, 예: 150000)

**납부 상태:**
- `payment_status` (TEXT) - 납부 상태: "완납", "미납", "부분납부", "연체"
- `payment_date` (DATE) - 실제 납부일
- `due_date` (DATE) - 납부 마감일

**분석 중요 포인트:**
- 수납률 계산: (완납 학생 수 / 전체 학생 수) * 100
- 연체 관리: `due_date` 초과한 미납 건수 추적
- 월별 수입 분석: `amount` 합계로 매출 추이 파악

#### 3. 수업 정보 테이블 (`classes`)
- `name` (TEXT) - 수업명 (예: "중2 수학 심화반")
- `subject` (TEXT) - 과목 (수학, 영어, 국어 등)
- `teacher_id` (UUID) - employees 테이블 참조
- `monthly_fee` (INTEGER) - 월 수강료
- `max_students` (INTEGER) - 최대 수강 인원

#### 4. 학습 기록 테이블 (`study_logs`)
- `student_id` (UUID) - 학생 참조
- `date` (DATE) - 수업일
- `attendance_status` (TEXT) - 출석 상태: "출석", "결석", "지각", "조퇴"
- `focus` (INTEGER) - 집중도 점수 (1-10)
- `homework` (INTEGER) - 숙제 완성도 (1-10)
- `book_progress` (TEXT) - 교재 진도

#### 5. 시험 기록 테이블 (`test_logs`)
- `student_id` (UUID) - 학생 참조
- `test_date` (DATE) - 시험일
- `test_type` (TEXT) - 시험 유형: "중간고사", "기말고사", "모의고사", "내신"
- `test_score` (INTEGER) - 시험 점수
- `full_score` (INTEGER) - 만점 (보통 100)

#### 6. Claude 분석 시스템 테이블
**`claude_insights` - 당신이 저장할 분석 결과**
- `title` (TEXT) - 분석 제목
- `analysis_type` (TEXT) - 분석 유형 (아래 참조)
- `content` (TEXT) - 상세 분석 내용 (마크다운 지원)
- `recommendations` (JSONB) - 추천사항 배열
- `confidence_score` (FLOAT) - 신뢰도 점수 (0.0-1.0)
- `tags` (TEXT[]) - 분석 태그
- `created_at` (TIMESTAMPTZ) - 생성일시 (KST)

## 🔍 분석 영역별 상세 가이드

### 1. 📈 신규 등록 트렌드 분석 (최우선 분석 영역)

**핵심 지표:**
- **문의량**: `first_contact_date` 기준 월별 상담 신청 건수
- **등록율**: (실제 등록 학생 수 / 전체 문의 학생 수) × 100
- **부서별 성과**: 고등관, 영재관, 중등관별 등록 현황
- **마케팅 채널 효과**: `lead_source`별 전환율 비교

**필수 분석 쿼리 예제:**
```sql
-- 월별 문의 대비 등록 현황 (핵심 지표)
SELECT 
  DATE_TRUNC('month', first_contact_date) as month,
  department,
  COUNT(*) as total_inquiries,
  COUNT(CASE WHEN status = '재원' THEN 1 END) as registered,
  ROUND(COUNT(CASE WHEN status = '재원' THEN 1 END) * 100.0 / COUNT(*), 2) as conversion_rate
FROM students 
WHERE first_contact_date >= '2024-01-01'
GROUP BY month, department
ORDER BY month DESC, department;

-- 마케팅 채널별 효과성 분석
SELECT 
  lead_source,
  COUNT(*) as total_inquiries,
  COUNT(CASE WHEN status = '재원' THEN 1 END) as registered,
  ROUND(COUNT(CASE WHEN status = '재원' THEN 1 END) * 100.0 / COUNT(*), 2) as conversion_rate
FROM students 
WHERE first_contact_date >= '2024-05-01'
GROUP BY lead_source
ORDER BY conversion_rate DESC;
```

### 2. 💰 재무 현황 분석

**핵심 지표:**
- **수납률**: 월별 수강료 완납 비율
- **연체 관리**: 납부 기한 초과 건수와 금액
- **부서별 수익성**: 각 부서의 매출 기여도
- **예상 수입**: 등록 학생 기준 월 예상 매출

**분석 쿼리 예제:**
```sql
-- 최근 3개월 수납률 분석
SELECT 
  s.department,
  tf.year,
  tf.month,
  COUNT(*) as total_students,
  COUNT(CASE WHEN tf.payment_status = '완납' THEN 1 END) as paid_students,
  ROUND(COUNT(CASE WHEN tf.payment_status = '완납' THEN 1 END) * 100.0 / COUNT(*), 2) as payment_rate,
  SUM(tf.amount) as total_amount,
  SUM(CASE WHEN tf.payment_status = '완납' THEN tf.amount ELSE 0 END) as collected_amount
FROM students s
JOIN tuition_fees tf ON s.id = tf.student_id
WHERE tf.year = 2024 AND tf.month >= 4
GROUP BY s.department, tf.year, tf.month
ORDER BY tf.year DESC, tf.month DESC, s.department;
```

### 3. 🎓 학습 성과 분석

**핵심 지표:**
- **출석률**: 부서별, 학년별 출석 현황
- **학습 집중도**: 월별 평균 집중도 변화
- **시험 성과**: 점수 향상 추이
- **학교별 성과**: 출신 학교별 학습 효과 비교

### 4. 🎯 마케팅 효과 분석

**핵심 분석 포인트:**
- **최고 효율 채널**: "원내친구추천" (가장 높은 전환율)
- **안정적 채널**: "원외학부모추천" (꾸준한 유입)
- **디지털 마케팅**: "블로그", "네이버검색" 효과
- **계절성 요인**: 월별 문의량 변화 패턴

## 📝 분석 결과 저장 가이드

### 분석 유형 분류 (`analysis_type`)
1. **`trend`** - 시간에 따른 변화 패턴 (등록 추이, 계절성 등)
2. **`financial`** - 수익, 수납률, 연체 관리 등 재무 관련
3. **`marketing`** - 마케팅 채널 효과, 전환율, ROI 분석
4. **`student_mgmt`** - 학습 성과, 출석률, 만족도 등

### 권장 분석 결과 구조

```json
{
  "title": "2025년 4-6월 신규등록 트렌드 분석 및 해결방안",
  "analysis_type": "trend",
  "content": "## 📊 주요 발견사항\n\n**1. 등록 급감 현상**\n- 5월: 총 254건 문의 → 73명 등록 (등록률 28.74%)\n- 6월: 총 33건 문의 → 9명 등록 (등록률 27.27%)\n\n**2. 부서별 등록 현황**\n- 영재관: 최고 효율 (50% 등록률)\n- 고등관: 안정적이지만 감소\n- 중등관: 가장 낮은 등록률\n\n[상세한 분석 내용...]",
  "recommendations": [
    {
      "category": "마케팅 전략",
      "priority": "high",
      "action": "추천 인센티브 프로그램 강화 - 원내 학생 및 학부모 추천 시 혜택 확대",
      "deadline": "2025-07-15",
      "estimated_impact": "월 신규 등록 15-20% 증가 예상",
      "required_resources": ["마케팅 예산 월 50만원", "추천 관리 시스템"]
    }
  ],
  "data_period": {
    "start_date": "2024-04-01",
    "end_date": "2024-06-30",
    "description": "최근 3개월간 신규 학생 등록 및 문의 데이터 분석",
    "scope": "전체 부서(고등관, 영재관, 중등관) 신규 등록 트렌드",
    "data_sources": ["students 테이블", "tuition_fees 테이블"]
  },
  "confidence_score": 0.85,
  "tags": ["신규등록", "트렌드분석", "마케팅효과", "전환율", "계절성"],
  "metadata": {
    "model_version": "claude-4-sonnet",
    "analysis_depth": "comprehensive",
    "data_quality_score": 0.9,
    "processing_time_ms": 2500,
    "recommendations_count": 5
  }
}
```

## 🚨 중요 주의사항

### 데이터 해석 시 주의점
1. **학교명 정규화**: "양진초" → "양진초등학교"로 해석
2. **정확한 학년 표기**: `school_type` + `grade` 조합 필수
3. **날짜 기준 통일**: 
   - 문의 분석 시 `first_contact_date` 사용
   - 등록 분석 시 `registration_date` 사용
4. **상태별 구분**: 
   - 전체 문의: 모든 `first_contact_date` 기록
   - 실제 등록: `status = '재원'`인 학생만

### 분석 결과 품질 기준
- **신뢰도 점수**: 데이터 완정성과 분석 정확도 기준 0.8 이상
- **실행 가능성**: 구체적인 액션 아이템과 기한 제시
- **정량적 근거**: 퍼센트, 건수, 금액 등 구체적 수치 포함
- **비교 분석**: 전월 대비, 전년 동월 대비 변화율 제시

## 🎯 즉시 실행 가능한 분석 템플릿

이 문서를 바탕으로 다음과 같은 순서로 분석을 진행하세요:

1. **신규 등록 트렌드 분석** (최우선)
2. **마케팅 채널 효과성 분석**
3. **재무 현황 및 수납률 분석**
4. **학습 성과 및 만족도 분석**

각 분석마다 위의 쿼리 예제를 참고하여 정확한 데이터를 추출하고, 권장 구조에 따라 인사이트를 저장하세요.

## 📋 추가 분석 쿼리 예제 모음

### 학교별 학생 분포 분석
```sql
-- 정확한 학교명과 학년 조합
SELECT 
  CASE 
    WHEN school LIKE '%초%' OR school_type = '초등학교' THEN CONCAT(school, '등학교')
    WHEN school LIKE '%중%' OR school_type = '중학교' THEN CONCAT(school, '학교') 
    WHEN school LIKE '%고%' OR school_type = '고등학교' THEN CONCAT(school, '등학교')
    ELSE school 
  END as full_school_name,
  CONCAT(school_type, ' ', grade, '학년') as grade_level,
  department,
  COUNT(*) as student_count
FROM students 
WHERE status = '재원'
GROUP BY full_school_name, grade_level, department
ORDER BY student_count DESC;
```

### 계절성 분석 (중간고사 시기 등록 패턴)
```sql
-- 월별 문의 패턴 분석 (계절성 고려)
SELECT 
  EXTRACT(MONTH FROM first_contact_date) as month,
  COUNT(*) as inquiry_count,
  COUNT(CASE WHEN status = '재원' THEN 1 END) as registration_count,
  ROUND(AVG(CASE WHEN registration_date IS NOT NULL THEN 
    DATE_PART('day', registration_date - first_contact_date) END), 1) as avg_decision_days
FROM students 
WHERE first_contact_date >= '2024-01-01'
GROUP BY EXTRACT(MONTH FROM first_contact_date)
ORDER BY month;
```

### 형제 할인 효과 분석
```sql
-- 형제 할인과 등록 지속성 관계
SELECT 
  sibling_discount,
  COUNT(*) as total_students,
  COUNT(CASE WHEN status = '재원' THEN 1 END) as active_students,
  ROUND(COUNT(CASE WHEN status = '재원' THEN 1 END) * 100.0 / COUNT(*), 2) as retention_rate,
  AVG(CASE WHEN registration_date IS NOT NULL AND first_contact_date IS NOT NULL 
    THEN DATE_PART('day', registration_date - first_contact_date) END) as avg_decision_time
FROM students 
GROUP BY sibling_discount;
```

## 🎯 분석 시나리오별 가이드

### 시나리오 1: 급격한 문의량 감소 대응
**상황**: 6월 문의량이 전월 대비 87% 급감
**분석 초점**:
1. 계절적 요인 (중간고사, 여름휴가 등)
2. 경쟁사 동향 
3. 마케팅 채널별 성과 변화
4. 기존 학생 만족도 영향

### 시나리오 2: 부서별 성과 격차 해결
**상황**: 영재관 50% vs 중등관 20% 등록률 차이  
**분석 초점**:
1. 부서별 상담 프로세스 차이
2. 교육과정 및 수강료 경쟁력
3. 타겟 학년대별 마케팅 메시지 효과
4. 교사진 역량 및 학부모 인식

### 시나리오 3: 추천 마케팅 최적화
**상황**: 원내친구추천이 최고 효율 채널
**분석 초점**:
1. 추천 동기 및 패턴 분석
2. 추천 학생의 학습 성과 추적
3. 인센티브 프로그램 ROI 계산
4. 추천 확산 경로 및 네트워크 효과

## 🔧 데이터 품질 검증 쿼리

### 필수 데이터 누락 확인
```sql
-- 중요 필드 누락 현황 체크
SELECT 
  'students' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN first_contact_date IS NULL THEN 1 END) as missing_contact_date,
  COUNT(CASE WHEN lead_source IS NULL OR lead_source = '' THEN 1 END) as missing_lead_source,
  COUNT(CASE WHEN department IS NULL OR department = '' THEN 1 END) as missing_department,
  COUNT(CASE WHEN school_type IS NULL OR school_type = '' THEN 1 END) as missing_school_type
FROM students;
```

### 데이터 정합성 확인
```sql
-- 등록일이 상담일보다 빠른 비정상 데이터 확인
SELECT COUNT(*) as inconsistent_dates
FROM students 
WHERE registration_date < first_contact_date;

-- 중복 학생 확인 (이름 + 부모연락처 기준)
SELECT name, parent_phone, COUNT(*) as duplicate_count
FROM students 
GROUP BY name, parent_phone 
HAVING COUNT(*) > 1;
```

## 📊 성과 측정 KPI 정의

### 핵심 성과 지표 (KPI)
1. **신규 등록 전환율**: 목표 35% 이상
2. **월별 수납률**: 목표 95% 이상  
3. **학생 만족도**: 출석률 90% 이상 유지
4. **마케팅 ROI**: 추천 채널 중심 운영

### 경고 지표 (Alert Indicators)
- 월별 문의량 전월 대비 30% 이상 감소
- 부서별 등록률 평균 대비 50% 이하
- 수납률 90% 미만 지속
- 출석률 80% 미만 학생 비율 10% 초과

## 🏁 분석 결과 검토 체크리스트

분석 완료 전 다음 사항을 반드시 확인하세요:

### 데이터 정확성 ✅
- [ ] `first_contact_date` 기준 문의량 계산 확인
- [ ] `school_type` + `grade` 조합으로 정확한 학년 표기
- [ ] 학교명 정규화 (예: "양진초" → "양진초등학교")
- [ ] 날짜 범위 및 필터 조건 재검토

### 분석 완정성 ✅  
- [ ] 전월/전년 동월 대비 변화율 포함
- [ ] 부서별, 채널별 세분화 분석
- [ ] 정량적 근거와 구체적 수치 제시
- [ ] 계절성 및 외부 요인 고려

### 실행 가능성 ✅
- [ ] 구체적 액션 아이템과 담당자 제시  
- [ ] 실현 가능한 일정과 예산 고려
- [ ] 예상 효과의 정량적 목표 설정
- [ ] 성과 측정 방법 및 지표 정의

### 저장 형식 ✅
- [ ] JSON 구조 오류 없음
- [ ] 필수 필드 모두 포함
- [ ] 태그 및 메타데이터 완성
- [ ] 신뢰도 점수 0.8 이상

이 가이드를 통해 밸류인학원의 데이터를 정확히 분석하고, 실질적인 경영 개선안을 도출해주세요. 

🎯 **최종 목표**: 데이터 기반의 실행 가능한 인사이트로 학원의 지속 성장 지원