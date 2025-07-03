-- Supabase Realtime 설정 확인 SQL
-- 이 쿼리들을 Supabase SQL Editor에서 실행하여 설정을 확인하세요

-- 1. Publication 존재 여부 확인
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Publication에 포함된 테이블 확인
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 3. global_messages 테이블의 RLS 정책 확인
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
WHERE tablename = 'global_messages';

-- 4. 만약 Publication이 없거나 테이블이 포함되지 않았다면 다음 실행:
-- ALTER PUBLICATION supabase_realtime ADD TABLE global_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE message_read_status;