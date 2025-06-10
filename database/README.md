# 데이터베이스 설정 가이드

## 1. profiles 테이블에 approval_status 컬럼 추가

이미 완료되었다고 하셨지만, 혹시 누락된 경우를 위해 SQL:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));
```

## 2. 자동 프로필 생성 트리거 적용

`database/profiles_trigger.sql` 파일의 내용을 Supabase SQL 에디터에서 실행해주세요.

이 트리거는 새 사용자가 가입할 때 자동으로 profiles 테이블에 레코드를 생성합니다:
- `approval_status: 'pending'`
- 회원가입 시 입력한 이름 자동 저장
- 이메일 주소 자동 저장

## 3. 기존 사용자 데이터 정리 (선택사항)

기존에 profiles 레코드가 없는 사용자들이 있다면:

```sql
-- 기존 auth.users 중 profiles가 없는 사용자들의 프로필 생성
INSERT INTO profiles (id, email, name, approval_status, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', ''),
  'pending',
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

## 4. RLS 정책 확인

profiles 테이블에 적절한 RLS 정책이 설정되어 있는지 확인:

```sql
-- 자신의 프로필은 읽기/쓰기 가능
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 관리자는 모든 프로필 조회 가능 (직원 관리용)
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE auth_id = auth.uid() 
    AND position IN ('원장', '부원장')
  )
);

-- 관리자는 approval_status 업데이트 가능
CREATE POLICY "Admins can update approval status" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE auth_id = auth.uid() 
    AND position IN ('원장', '부원장')
  )
);
```

## 적용 순서

1. `profiles_trigger.sql` 실행
2. 기존 데이터 정리 (필요한 경우)
3. RLS 정책 확인/적용
4. 애플리케이션 재시작

## 테스트

1. 새 계정으로 회원가입
2. 이름 입력 기능 확인
3. 관리자 계정으로 직원 관리 페이지에서 계정 연결
4. 자동 승인 확인
5. 계정 연결 해제 시 승인 취소 확인
