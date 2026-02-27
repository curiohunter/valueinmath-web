-- =============================================
-- 미완료 가입 자동 삭제 크론잡 설정 가이드
-- =============================================
--
-- 이 파일은 pg_cron 스케줄 등록을 위한 SQL입니다.
-- Supabase 대시보드의 SQL Editor에서 직접 실행해야 합니다.
--
-- 역할: 48시간 이상 경과한 미승인 계정 + orphan auth.users 자동 삭제
-- 실행 시간: 매일 새벽 4:00 KST (UTC 19:00)
--
-- 사전 조건:
-- 1. cleanup-stale-users Edge Function이 배포되어 있어야 함
-- 2. Vault에 'cron_secret' 시크릿이 등록되어 있어야 함
--    (기존 mathflat cron에서 이미 설정되어 있으면 재사용)
--
-- =============================================

-- =============================================
-- Step 1: 기존 크론잡 삭제 (있으면)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-users') THEN
    PERFORM cron.unschedule('cleanup-stale-users');
  END IF;
END $$;

-- =============================================
-- Step 2: 크론잡 스케줄 등록
-- =============================================

-- 매일 04:00 KST (UTC 19:00) 실행
SELECT cron.schedule(
  'cleanup-stale-users',
  '0 19 * * *',  -- UTC 19:00 = KST 04:00
  $$
  SELECT net.http_post(
    url := 'https://zeolpqtmlqzskvmhbyct.supabase.co/functions/v1/cleanup-stale-users',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- =============================================
-- 확인용 쿼리
-- =============================================

-- 등록된 크론잡 확인
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'cleanup-stale-users';
