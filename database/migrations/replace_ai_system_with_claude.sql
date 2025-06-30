-- Claude Desktop 연동을 위한 AI 시스템 재설계
-- 기존 복잡한 AI 에이전트 테이블들을 제거하고 간단한 Claude 분석 결과 테이블로 교체
-- 실행 전 필요시 기존 데이터 백업 권장

-- 기존 AI 에이전트 관련 테이블들 제거
DROP TABLE IF EXISTS ai_agent_collaborations;
DROP TABLE IF EXISTS ai_agent_execution_logs;
DROP TABLE IF EXISTS ai_agent_actions;
DROP TABLE IF EXISTS ai_agent_insights;
DROP TABLE IF EXISTS ai_agent_memory;
DROP TABLE IF EXISTS ai_llm_configs;
DROP TABLE IF EXISTS ai_agents;

-- 기존 ENUM 타입들도 제거
DROP TYPE IF EXISTS ai_agent_type;
DROP TYPE IF EXISTS llm_provider_type;
DROP TYPE IF EXISTS agent_memory_type;

-- 기존 함수들 제거
DROP FUNCTION IF EXISTS update_ai_agent_updated_at();
DROP FUNCTION IF EXISTS cleanup_expired_memories();

-- Claude 분석 타입 ENUM 생성
CREATE TYPE claude_analysis_type AS ENUM (
  'trend',           -- 트렌드 분석
  'financial',       -- 재무 분석
  'marketing',       -- 마케팅 분석
  'student_mgmt'     -- 학생 관리 분석
);

-- Claude 보고서 타입 ENUM 생성
CREATE TYPE claude_report_type AS ENUM (
  'monthly',         -- 월간 보고서
  'quarterly',       -- 분기 보고서
  'yearly',          -- 연간 보고서
  'custom'           -- 맞춤 보고서
);

-- Claude 인사이트 테이블 생성
CREATE TABLE claude_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  analysis_type claude_analysis_type NOT NULL,
  content TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]',
  data_period JSONB DEFAULT '{}', -- {start_date, end_date, description}
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1) DEFAULT 0.8,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}', -- 추가 메타데이터 (data_source, student_count 등)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claude 보고서 테이블 생성
CREATE TABLE claude_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID REFERENCES claude_insights(id) ON DELETE CASCADE,
  report_type claude_report_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_content TEXT NOT NULL,
  charts_data JSONB DEFAULT '{}', -- 차트 및 그래프 데이터
  file_attachments JSONB DEFAULT '[]', -- 첨부파일 정보
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_claude_insights_type ON claude_insights(analysis_type);
CREATE INDEX idx_claude_insights_status ON claude_insights(status);
CREATE INDEX idx_claude_insights_created_at ON claude_insights(created_at DESC);
CREATE INDEX idx_claude_insights_tags ON claude_insights USING GIN(tags);
CREATE INDEX idx_claude_reports_insight_id ON claude_reports(insight_id);
CREATE INDEX idx_claude_reports_type ON claude_reports(report_type);
CREATE INDEX idx_claude_reports_status ON claude_reports(status);
CREATE INDEX idx_claude_reports_created_at ON claude_reports(created_at DESC);

-- RLS 정책 활성화
ALTER TABLE claude_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (관리자만 접근 가능)
CREATE POLICY "Admins can manage Claude insights" ON claude_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_id = auth.uid() 
      AND position IN ('원장', '부원장')
    )
  );

CREATE POLICY "Admins can manage Claude reports" ON claude_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_id = auth.uid() 
      AND position IN ('원장', '부원장')
    )
  );

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_claude_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성
CREATE TRIGGER update_claude_insights_updated_at
  BEFORE UPDATE ON claude_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_updated_at();

CREATE TRIGGER update_claude_reports_updated_at
  BEFORE UPDATE ON claude_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_updated_at();

-- 샘플 데이터 추가 (테스트용)
INSERT INTO claude_insights (title, analysis_type, content, recommendations, data_period, confidence_score, tags) VALUES
(
  '2025년 1월 학생 성과 분석',
  'student_mgmt',
  '지난 한 달간 학생들의 학습 성과와 출석률을 분석한 결과, 전반적으로 양호한 수준을 보이고 있습니다. 특히 중학생 그룹의 수학 성적이 크게 향상되었으며, 고등학생들의 출석률도 안정적입니다.',
  '[
    {"category": "학습관리", "priority": "high", "action": "중학생 수학 심화반 개설 검토"},
    {"category": "출석관리", "priority": "medium", "action": "고등학생 출석 동기부여 프로그램 지속"}
  ]'::jsonb,
  '{"start_date": "2025-01-01", "end_date": "2025-01-31", "description": "2025년 1월 학습 데이터"}'::jsonb,
  0.85,
  ARRAY['학생관리', '성과분석', '월간보고']
),
(
  '수업료 수납 현황 및 예측',
  'financial',
  '현재 수업료 수납률은 92%로 양호한 수준입니다. 연체 학생들에 대한 관리가 필요하며, 향후 3개월 수입 예측 결과 안정적인 수익을 유지할 것으로 전망됩니다.',
  '[
    {"category": "재무관리", "priority": "high", "action": "연체 학생 개별 상담 실시"},
    {"category": "수익관리", "priority": "medium", "action": "신규 학생 모집 캠페인 준비"}
  ]'::jsonb,
  '{"start_date": "2025-01-01", "end_date": "2025-01-31", "description": "1월 수업료 수납 데이터"}'::jsonb,
  0.78,
  ARRAY['재무', '수업료', '예측분석']
);

-- 첫 번째 인사이트에 대한 보고서 생성
INSERT INTO claude_reports (insight_id, report_type, title, summary, full_content, charts_data) 
SELECT 
  id,
  'monthly',
  '2025년 1월 학생 성과 월간 보고서',
  '학생들의 전반적인 학습 성과가 양호하며, 특히 중학생 수학 성적 향상이 두드러짐',
  '## 학생 성과 분석 상세 보고서

### 주요 성과 지표
- 전체 학생 출석률: 94.2%
- 평균 성적 향상도: +12.5%
- 학부모 만족도: 4.6/5.0

### 분석 결과
1. **중학생 수학 성적 향상**: 평균 15점 상승
2. **고등학생 출석률 안정**: 지속적인 90% 이상 유지
3. **신규 학생 적응률**: 85% 학생이 첫 달 목표 달성

### 권장사항
- 중학생 수학 심화반 개설 검토
- 고등학생 출석 동기부여 프로그램 지속
- 신규 학생 멘토링 시스템 강화',
  '{"attendance_chart": {"type": "line", "data": [92, 94, 93, 95, 94]}, "grade_improvement": {"type": "bar", "data": {"middle": 15, "high": 8}}}'::jsonb
FROM claude_insights 
WHERE title = '2025년 1월 학생 성과 분석';

-- 마이그레이션 완료 로그
INSERT INTO claude_insights (title, analysis_type, content, recommendations, tags) VALUES
(
  'AI 시스템 마이그레이션 완료',
  'trend',
  'Claude Desktop 연동을 위한 데이터베이스 마이그레이션이 성공적으로 완료되었습니다. 기존 복잡한 AI 에이전트 시스템이 간단한 Claude 인사이트 시스템으로 교체되었습니다.',
  '[{"category": "시스템", "priority": "info", "action": "새로운 시스템 테스트 및 검증"}]'::jsonb,
  ARRAY['시스템', '마이그레이션', 'Claude']
);