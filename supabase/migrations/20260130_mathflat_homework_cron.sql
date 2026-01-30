-- =============================================
-- MathFlat 숙제 수집 크론잡 설정 가이드
-- =============================================
--
-- 이 파일은 pg_cron 스케줄 등록을 위한 SQL입니다.
-- Supabase 대시보드의 SQL Editor에서 직접 실행해야 합니다.
--
-- 설정 순서:
-- 1. Vercel에 환경변수 추가 (CRON_SECRET, MATHFLAT_EMAIL, MATHFLAT_PASSWORD)
-- 2. Supabase 대시보드 > Project Settings > Vault에서 시크릿 추가
-- 3. 아래 SQL을 SQL Editor에서 실행
--
-- =============================================

-- =============================================
-- Step 1: Vault 시크릿 설정 (대시보드에서 수동 설정)
-- =============================================
--
-- Supabase 대시보드 > Project Settings > Vault에서:
--
-- 1. project_url: https://www.valueinmath.com
-- 2. cron_secret: [Vercel에 설정한 CRON_SECRET 값]
--
-- =============================================

-- =============================================
-- Step 2: 기존 크론잡 삭제 (있으면)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mathflat-homework-first') THEN
    PERFORM cron.unschedule('mathflat-homework-first');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mathflat-homework-second') THEN
    PERFORM cron.unschedule('mathflat-homework-second');
  END IF;
END $$;

-- =============================================
-- Step 3: 크론잡 스케줄 등록
-- =============================================

-- 1차 수집: 매일 23:50 KST (UTC 14:50)
-- 오늘 수업 있는 반의 숙제 목록만 수집 (문제 상세 X)
SELECT cron.schedule(
  'mathflat-homework-first',
  '50 14 * * *',  -- UTC 14:50 = KST 23:50
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/api/cron/mathflat-homework',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{"collectionType": "first"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- 2차 수집: 매일 10:00 KST (UTC 01:00)
-- 오늘 수업 있는 반의 채점 결과 업데이트 (문제 상세 O)
SELECT cron.schedule(
  'mathflat-homework-second',
  '0 1 * * *',  -- UTC 01:00 = KST 10:00
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/api/cron/mathflat-homework',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{"collectionType": "second"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- =============================================
-- 확인용 쿼리
-- =============================================

-- 등록된 크론잡 확인
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'mathflat-homework%';
