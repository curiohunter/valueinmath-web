-- 월별 통계 스냅샷 저장 함수
CREATE OR REPLACE FUNCTION save_monthly_snapshot()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_day integer;
  v_active_total integer;
  v_active_by_dept jsonb;
  v_consult_total integer;
  v_consult_by_dept jsonb;
  v_test_total integer;
  v_test_by_dept jsonb;
  v_enroll_total integer;
  v_enroll_by_dept jsonb;
  v_withdraw_total integer;
  v_withdraw_by_dept jsonb;
  v_mom_change numeric(5,2);
  v_consult_yoy numeric(5,2);
  v_withdraw_yoy numeric(5,2);
  v_last_month_active integer;
  v_last_year_consult integer;
  v_last_year_withdraw integer;
BEGIN
  -- 현재 날짜 정보
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  v_day := EXTRACT(DAY FROM CURRENT_DATE);
  
  -- 27일 이전이면 종료
  IF v_day < 27 THEN
    RAISE NOTICE '월말이 아닙니다. (현재: %일)', v_day;
    RETURN;
  END IF;
  
  -- 재적 학생 집계
  SELECT 
    COUNT(*),
    jsonb_object_agg(
      COALESCE(d.name, '미지정'), 
      dept_count
    )
  INTO v_active_total, v_active_by_dept
  FROM (
    SELECT 
      s.department_id,
      d.name,
      COUNT(*) as dept_count
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.status = '재적'
    GROUP BY s.department_id, d.name
  ) AS dept_stats
  LEFT JOIN departments d ON dept_stats.department_id = d.id;
  
  -- 이번달 상담 집계
  SELECT 
    COUNT(*),
    jsonb_object_agg(
      COALESCE(dept_name, '미지정'),
      dept_count
    )
  INTO v_consult_total, v_consult_by_dept
  FROM (
    SELECT 
      d.name as dept_name,
      COUNT(*) as dept_count
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.first_contact_date >= date_trunc('month', CURRENT_DATE)
      AND s.first_contact_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
    GROUP BY d.name
  ) AS consult_stats;
  
  -- 이번달 입학테스트 집계
  SELECT 
    COUNT(*),
    jsonb_object_agg(
      COALESCE(dept_name, '미지정'),
      dept_count
    )
  INTO v_test_total, v_test_by_dept
  FROM (
    SELECT 
      d.name as dept_name,
      COUNT(*) as dept_count
    FROM entrance_tests et
    LEFT JOIN students s ON et.consultation_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE et.test_date >= date_trunc('month', CURRENT_DATE)
      AND et.test_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
    GROUP BY d.name
  ) AS test_stats;
  
  -- 이번달 신규 등록 집계
  SELECT 
    COUNT(*),
    jsonb_object_agg(
      COALESCE(dept_name, '미지정'),
      dept_count
    )
  INTO v_enroll_total, v_enroll_by_dept
  FROM (
    SELECT 
      d.name as dept_name,
      COUNT(*) as dept_count
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.enrollment_date >= date_trunc('month', CURRENT_DATE)
      AND s.enrollment_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
      AND s.status IN ('재적', '휴원')
    GROUP BY d.name
  ) AS enroll_stats;
  
  -- 이번달 퇴원 집계
  SELECT 
    COUNT(*),
    jsonb_object_agg(
      COALESCE(dept_name, '미지정'),
      dept_count
    )
  INTO v_withdraw_total, v_withdraw_by_dept
  FROM (
    SELECT 
      d.name as dept_name,
      COUNT(*) as dept_count
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.withdrawal_date >= date_trunc('month', CURRENT_DATE)
      AND s.withdrawal_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
      AND s.status = '퇴원'
    GROUP BY d.name
  ) AS withdraw_stats;
  
  -- 지난달 재적생 수 (MoM 계산용)
  SELECT active_students_total
  INTO v_last_month_active
  FROM academy_monthly_stats
  WHERE year = CASE 
    WHEN v_month = 1 THEN v_year - 1 
    ELSE v_year 
  END
  AND month = CASE 
    WHEN v_month = 1 THEN 12 
    ELSE v_month - 1 
  END;
  
  -- 작년 같은달 상담/퇴원 수 (YoY 계산용)
  SELECT consultations_total, withdrawals_total
  INTO v_last_year_consult, v_last_year_withdraw
  FROM academy_monthly_stats
  WHERE year = v_year - 1
  AND month = v_month;
  
  -- MoM, YoY 변화율 계산
  v_mom_change := CASE 
    WHEN v_last_month_active IS NOT NULL AND v_last_month_active > 0 
    THEN ((v_active_total - v_last_month_active)::numeric / v_last_month_active * 100)
    ELSE 0
  END;
  
  v_consult_yoy := CASE
    WHEN v_last_year_consult IS NOT NULL AND v_last_year_consult > 0
    THEN ((v_consult_total - v_last_year_consult)::numeric / v_last_year_consult * 100)
    ELSE 0
  END;
  
  v_withdraw_yoy := CASE
    WHEN v_last_year_withdraw IS NOT NULL AND v_last_year_withdraw > 0
    THEN ((v_withdraw_total - v_last_year_withdraw)::numeric / v_last_year_withdraw * 100)
    ELSE 0
  END;
  
  -- NULL 값 처리
  v_active_by_dept := COALESCE(v_active_by_dept, '{}'::jsonb);
  v_consult_by_dept := COALESCE(v_consult_by_dept, '{}'::jsonb);
  v_test_by_dept := COALESCE(v_test_by_dept, '{}'::jsonb);
  v_enroll_by_dept := COALESCE(v_enroll_by_dept, '{}'::jsonb);
  v_withdraw_by_dept := COALESCE(v_withdraw_by_dept, '{}'::jsonb);
  
  -- UPSERT: 있으면 업데이트, 없으면 삽입
  INSERT INTO academy_monthly_stats (
    year, month,
    active_students_total, active_students_by_dept, active_students_mom_change,
    consultations_total, consultations_by_dept, consultations_yoy_change,
    entrance_tests_total, entrance_tests_by_dept, test_conversion_rate,
    new_enrollments_total, new_enrollments_by_dept, enrollment_conversion_rate,
    withdrawals_total, withdrawals_by_dept, withdrawals_yoy_change,
    collected_at
  ) VALUES (
    v_year, v_month,
    COALESCE(v_active_total, 0),
    v_active_by_dept,
    COALESCE(v_mom_change, 0),
    COALESCE(v_consult_total, 0),
    v_consult_by_dept,
    COALESCE(v_consult_yoy, 0),
    COALESCE(v_test_total, 0),
    v_test_by_dept,
    CASE 
      WHEN v_consult_total > 0 
      THEN (v_test_total::numeric / v_consult_total * 100)
      ELSE 0
    END,
    COALESCE(v_enroll_total, 0),
    v_enroll_by_dept,
    CASE 
      WHEN v_consult_total > 0 
      THEN (v_enroll_total::numeric / v_consult_total * 100)
      ELSE 0
    END,
    COALESCE(v_withdraw_total, 0),
    v_withdraw_by_dept,
    COALESCE(v_withdraw_yoy, 0),
    NOW()
  )
  ON CONFLICT (year, month) 
  DO UPDATE SET
    active_students_total = EXCLUDED.active_students_total,
    active_students_by_dept = EXCLUDED.active_students_by_dept,
    active_students_mom_change = EXCLUDED.active_students_mom_change,
    consultations_total = EXCLUDED.consultations_total,
    consultations_by_dept = EXCLUDED.consultations_by_dept,
    consultations_yoy_change = EXCLUDED.consultations_yoy_change,
    entrance_tests_total = EXCLUDED.entrance_tests_total,
    entrance_tests_by_dept = EXCLUDED.entrance_tests_by_dept,
    test_conversion_rate = EXCLUDED.test_conversion_rate,
    new_enrollments_total = EXCLUDED.new_enrollments_total,
    new_enrollments_by_dept = EXCLUDED.new_enrollments_by_dept,
    enrollment_conversion_rate = EXCLUDED.enrollment_conversion_rate,
    withdrawals_total = EXCLUDED.withdrawals_total,
    withdrawals_by_dept = EXCLUDED.withdrawals_by_dept,
    withdrawals_yoy_change = EXCLUDED.withdrawals_yoy_change,
    collected_at = NOW(),
    updated_at = NOW();
    
  RAISE NOTICE '월별 스냅샷 저장 완료: %년 %월', v_year, v_month;
END;
$$;