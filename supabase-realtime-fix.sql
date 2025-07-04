-- Supabase Realtime 설정 수정 SQL
-- 이 쿼리들을 Supabase SQL Editor에서 실행하여 CHANNEL_ERROR를 해결하세요

-- 1. 먼저 현재 설정 확인
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 2. global_messages와 message_read_status 테이블을 Realtime Publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE global_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_status;

-- 3. RLS 정책 확인 (읽기 권한이 있는지 확인)
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
WHERE tablename IN ('global_messages', 'message_read_status');

-- 4. 만약 RLS 정책이 없다면 기본 정책 추가
-- 모든 인증된 사용자가 global_messages를 볼 수 있도록 허용
CREATE POLICY "authenticated users can view global messages" 
ON global_messages FOR SELECT 
TO authenticated 
USING (true);

-- 모든 인증된 사용자가 message_read_status를 볼 수 있도록 허용
CREATE POLICY "authenticated users can view message read status" 
ON message_read_status FOR SELECT 
TO authenticated 
USING (true);

-- 5. 다시 확인
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('global_messages', 'message_read_status');