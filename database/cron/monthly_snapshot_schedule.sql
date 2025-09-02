-- pg_cron 확장 활성화 (이미 설치되어 있다면 스킵)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 스케줄 제거 (있다면)
SELECT cron.unschedule('monthly-academy-snapshot');

-- 매달 28일 오전 2시에 실행 (한국 시간 기준)
-- Supabase는 UTC를 사용하므로, 한국시간 오전 2시 = UTC 전날 오후 5시
SELECT cron.schedule(
  'monthly-academy-snapshot',           -- job 이름
  '0 17 27 * *',                        -- 매달 27일 17:00 UTC (28일 02:00 KST)
  $$SELECT save_monthly_snapshot();$$   -- 실행할 SQL
);

-- 스케줄 확인
SELECT * FROM cron.job WHERE jobname = 'monthly-academy-snapshot';

-- 실행 로그 확인 (최근 10개)
-- SELECT * FROM cron.job_run_details 
-- WHERE jobname = 'monthly-academy-snapshot' 
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- 수동 실행 테스트
-- SELECT save_monthly_snapshot();