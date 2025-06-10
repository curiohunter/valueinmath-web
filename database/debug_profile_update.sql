-- 1. 현재 상태 확인
SELECT 
  e.name as employee_name,
  e.position,
  e.department,
  e.auth_id,
  p.name as profile_name,
  p.approval_status,
  p.position as profile_position,
  p.department as profile_department
FROM employees e
LEFT JOIN profiles p ON e.auth_id = p.id
WHERE e.name = '박민아';

-- 2. 해당 유저 프로필 수동 업데이트 테스트
UPDATE profiles 
SET 
  name = '박민아',
  position = (SELECT position FROM employees WHERE auth_id = 'd04e418a-22fa-4458-889f-df1c95f8c6e7'),
  department = (SELECT department FROM employees WHERE auth_id = 'd04e418a-22fa-4458-889f-df1c95f8c6e7'),
  approval_status = 'approved',
  updated_at = NOW()
WHERE id = 'd04e418a-22fa-4458-889f-df1c95f8c6e7';

-- 3. 업데이트 결과 확인
SELECT * FROM profiles WHERE id = 'd04e418a-22fa-4458-889f-df1c95f8c6e7';
