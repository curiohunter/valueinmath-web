-- Google Calendar 연동을 위한 필드 추가 (밸류인 전용)
-- 실행일: 2025-06-24

-- calendar_events 테이블에 google_calendar_id 필드 추가
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_calendar_id);

-- 필드 설명 추가
COMMENT ON COLUMN calendar_events.google_calendar_id IS 'Google Calendar에서 생성된 이벤트 ID (밸류인 전용)';