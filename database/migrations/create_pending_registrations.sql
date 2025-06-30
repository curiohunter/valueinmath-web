-- pending_registrations 테이블 생성
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent', 'teacher')),
  student_name TEXT, -- 학부모인 경우 학생 이름
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 등록 정보만 볼 수 있음
CREATE POLICY "Users can view own registration" ON pending_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 등록 정보만 수정할 수 있음
CREATE POLICY "Users can update own registration" ON pending_registrations
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 등록 정보만 삽입할 수 있음
CREATE POLICY "Users can insert own registration" ON pending_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 관리자(원장, 부원장)는 모든 등록 정보를 볼 수 있음
CREATE POLICY "Admins can view all registrations" ON pending_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_id = auth.uid() 
      AND position IN ('원장', '부원장')
    )
  );

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_pending_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_registrations_updated_at
  BEFORE UPDATE ON pending_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_registrations_updated_at();