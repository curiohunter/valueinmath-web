-- Claude 테이블에 RLS 정책 추가

-- claude_insights 테이블 RLS 정책
ALTER TABLE claude_insights ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 인사이트를 볼 수 있음
CREATE POLICY "Anyone can view claude insights" ON claude_insights
    FOR SELECT USING (true);

-- 인증된 사용자는 인사이트를 생성할 수 있음
CREATE POLICY "Authenticated users can insert claude insights" ON claude_insights
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자는 인사이트를 수정할 수 있음
CREATE POLICY "Authenticated users can update claude insights" ON claude_insights
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 인증된 사용자는 인사이트를 삭제할 수 있음
CREATE POLICY "Authenticated users can delete claude insights" ON claude_insights
    FOR DELETE USING (auth.role() = 'authenticated');

-- claude_reports 테이블 RLS 정책
ALTER TABLE claude_reports ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 보고서를 볼 수 있음
CREATE POLICY "Anyone can view claude reports" ON claude_reports
    FOR SELECT USING (true);

-- 인증된 사용자는 보고서를 생성할 수 있음
CREATE POLICY "Authenticated users can insert claude reports" ON claude_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자는 보고서를 수정할 수 있음
CREATE POLICY "Authenticated users can update claude reports" ON claude_reports
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 인증된 사용자는 보고서를 삭제할 수 있음
CREATE POLICY "Authenticated users can delete claude reports" ON claude_reports
    FOR DELETE USING (auth.role() = 'authenticated');