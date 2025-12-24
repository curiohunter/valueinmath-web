---
name: data-dictionary
description: 프로젝트 DB 스키마 참조. 테이블 용도, 관계, 주요 필드, 사용처 확인 시 사용. DB 작업, 코드 수정, 버그 분석 시 참조.
---

# Data Dictionary - ValueInMath

## 상세 문서

> 📚 **상세 문서 위치**: `docs/dbdocs/`
> - README.md - 전체 개요 및 관계도
> - tables/{카테고리}/*.md - 테이블별 상세 문서
> - enums.md - 24개 Enum 정의
> - relationships.md - FK 관계 상세
> - code-mapping.md - 테이블-코드 매핑

---

## 테이블 요약 (49개)

### 01-core (5개) - 핵심 테이블
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| students | 학생 정보 | 높음 |
| employees | 직원 정보, 인증 | 높음 |
| profiles | 포털 사용자, 승인 | 높음 |
| classes | 반/수업 정보 | 높음 |
| class_students | 학생-반 매핑 | 높음 |

### 02-learning (8개) - 학습 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| study_logs | 학습일지 | 높음 |
| test_logs | 테스트 기록 | 높음 |
| makeup_classes | 보강 기록 | 중간 |
| school_exams | 학교 시험 | 중간 |
| school_exam_scores | 시험 점수 | 중간 |
| entrance_tests | 입학 테스트 | 낮음 |
| mathflat_records | 매쓰플랫 연동 | 중간 |
| learning_comments | 학습 코멘트 | 중간 |

### 03-consultation (3개) - 상담 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| consultations | 상담 기록 | 높음 |
| consultation_requests | 상담 요청 (포털) | 낮음 |
| pending_registrations | 등록 대기 | 낮음 |

### 04-financial (3개) - 재무 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| tuition_fees | 학원비 | 높음 |
| payssam_logs | 페이삼 연동 | 낮음 |
| class_enrollments_history | 등록 이력 | 낮음 |

### 05-marketing (6개) - 마케팅 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| marketing_campaigns | 캠페인 | 중간 |
| campaign_participants | 참가자 | 중간 |
| marketing_attributions | 귀인 분석 | 낮음 |
| marketing_insights | AI 인사이트 | 미사용 |
| funnel_events | 퍼널 이벤트 | 중간 |
| lead_source_channel_mapping | 채널 매핑 | 미사용 |

### 06-analytics (4개) - 분석/통계
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| academy_monthly_stats | 월별 통계 | 중간 |
| monthly_reports | 월간 리포트 | 중간 |
| claude_insights | AI 분석 결과 | 낮음 |
| at_risk_students_snapshots | 위험 스냅샷 | 낮음 |

### 07-risk (4개) - 리스크 관리
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| student_risk_scores | 리스크 점수 | 중간 |
| risk_alerts | 리스크 알림 | 중간 |
| risk_config | 설정 | 낮음 |
| seasonal_alerts | 시즌 알림 | 낮음 |

### 08-calendar (3개) - 일정 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| calendar_events | 일정 | 중간 |
| event_participants | 참가자 | 미사용 |
| class_schedules | 반 시간표 | 중간 |

### 09-workspace (5개) - 워크스페이스
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| todos | 할 일 | 중간 |
| memos | 메모 | 중간 |
| comments | 댓글 | 중간 |
| comment_reactions | 반응 | 낮음 |
| comment_protocols | 템플릿 | 낮음 |

### 10-ai (4개) - AI 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| ai_usage_logs | 사용량 로그 | 높음 |
| ai_rate_limits | 사용자 제한 | 중간 |
| ai_global_limits | 전역 제한 | 낮음 |
| comment_llm_logs | 코멘트 생성 로그 | 중간 |

### 11-portal (2개) - 포털 관련
| 테이블 | 용도 | 빈도 |
|--------|------|------|
| profile_students | 포털 권한 | 높음 |
| notifications | 알림 | 중간 |

### 12-views (2개) - 뷰
| 뷰 | 용도 |
|----|------|
| student_class_mapping | 학생-반 매핑 뷰 |
| student_name_mapping | 학생 이름 뷰 |

---

## 자주 실수하는 필드명

| 잘못된 사용 | 올바른 필드명 | 테이블 |
|------------|--------------|--------|
| payment_date | **period_date** | tuition_fees |
| user_id | **auth_id** | employees, profiles |
| status | **approval_status** | profiles |
| name (직접) | **student_name_snapshot** | 스냅샷 테이블들 |

---

## 스냅샷 시스템

학생 퇴원/반 삭제 시 데이터 보존:

| 테이블 | 스냅샷 필드 |
|--------|-------------|
| study_logs | student_name_snapshot, class_name_snapshot |
| test_logs | student_name_snapshot, class_name_snapshot |
| makeup_classes | student_name_snapshot, class_name_snapshot |
| tuition_fees | student_name_snapshot, class_name_snapshot |
| consultations | student_name_snapshot |

**표시 패턴**:
```typescript
const name = row.student_name_snapshot
  || students.find(s => s.id === row.student_id)?.name
  || "알 수 없음";
```

---

## RLS 정책 패턴

| 패턴 | 조건 | 대상 테이블 |
|------|------|-------------|
| A (직원) | employees.auth_id = auth.uid() AND status = '재직' | 대부분 |
| B (포털) | profiles.student_id = table.student_id AND approval_status = 'approved' | portal 테이블 |

---

## 스키마 확인

```bash
# 정확한 필드명 확인
Grep "테이블명: {" -A 40 types/supabase.ts

# 또는 상세 문서 참조
Read docs/dbdocs/tables/{카테고리}/{테이블명}.md
```
