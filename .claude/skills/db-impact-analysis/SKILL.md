---
name: db-impact-analysis
description: DB 테이블/필드 변경 시 코드 영향 분석. 스키마 수정, 필드 추가/삭제, 테이블 리팩토링, 마이그레이션 작업 시 사용.
allowed-tools: Grep, Glob, Read
---

# DB 영향 분석 (Impact Analysis)

테이블이나 필드를 변경하기 전, 코드에 미치는 영향을 분석합니다.

## 1. 테이블 사용처 찾기

```bash
# 특정 테이블이 사용되는 모든 파일
Grep 'from("테이블명")' --include="*.ts" --include="*.tsx"

# 사용 빈도 확인
grep -roh 'from("테이블명")' --include="*.ts" --include="*.tsx" | wc -l
```

## 2. 필드 사용처 찾기

```bash
# 필드명이 사용되는 위치 (정확도 높이려면 테이블과 함께)
Grep "필드명" --include="*.ts" --include="*.tsx"

# 타입 정의에서 확인
Grep "필드명" types/database.ts
```

## 3. 변경 전 체크리스트

### 테이블 삭제 시
- [ ] `from("테이블명")` 사용처 모두 확인
- [ ] RLS 정책 삭제 필요
- [ ] FK로 연결된 다른 테이블 확인
- [ ] types/database.ts 재생성 필요

### 필드 삭제/이름 변경 시
- [ ] 해당 필드 사용하는 코드 모두 수정
- [ ] INSERT/UPDATE 쿼리에서 해당 필드 제거
- [ ] SELECT에서 해당 필드 사용 여부
- [ ] 프론트엔드 표시 로직 확인

### 필드 타입 변경 시
- [ ] TypeScript 타입 호환성 확인
- [ ] 기존 데이터 마이그레이션 필요 여부
- [ ] NULL 허용 여부 변경 시 기본값 설정

## 4. 스냅샷 필드 주의사항

다음 테이블은 스냅샷 필드가 있어 FK 삭제 후에도 데이터 보존됨:

| 테이블 | 스냅샷 필드 |
|--------|------------|
| study_logs | student_name_snapshot, class_name_snapshot |
| test_logs | student_name_snapshot, class_name_snapshot |
| tuition_fees | student_name_snapshot, class_name_snapshot |
| makeup_classes | student_name_snapshot, class_name_snapshot |
| consultations | student_name_snapshot |

**students 또는 classes 삭제 시**: 스냅샷 필드가 있으므로 데이터는 보존됨

## 5. FK 관계 확인

```bash
# types/database.ts에서 Relationships 확인
Grep "Relationships:" -A 20 types/database.ts | grep "테이블명"
```

## 6. RLS 정책 영향

```bash
# 해당 테이블의 RLS 정책 확인 (Supabase Dashboard 또는)
mcp__supabase__execute_sql("SELECT * FROM pg_policies WHERE tablename = '테이블명'")
```

## 7. 변경 후 필수 작업

1. `npx supabase gen types typescript --project-id zeolpqtmlqzskvmhbyct > types/database.ts`
2. TypeScript 빌드 확인: `npm run build`
3. 영향받는 페이지 수동 테스트
