-- RLS 정책 확인 및 생성

-- 1. 현재 profiles 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. profiles 테이블 RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 3. 필요한 RLS 정책들

-- RLS 활성화 (이미 되어있을 수 있음)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 프로필을 읽을 수 있는 정책
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- 사용자가 자신의 프로필을 업데이트할 수 있는 정책
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 관리자(원장, 부원장)가 모든 프로필을 조회할 수 있는 정책
CREATE POLICY IF NOT EXISTS "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE auth_id = auth.uid() 
    AND position IN ('원장', '부원장')
  )
);

-- 관리자가 모든 프로필을 업데이트할 수 있는 정책
CREATE POLICY IF NOT EXISTS "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE auth_id = auth.uid() 
    AND position IN ('원장', '부원장')
  )
);

-- 시스템이 프로필을 삽입할 수 있는 정책 (트리거용)
CREATE POLICY IF NOT EXISTS "System can insert profiles" ON profiles
FOR INSERT WITH CHECK (true);

-- 4. employees 테이블도 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'employees';
