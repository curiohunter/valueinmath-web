import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RiskFactor {
  attendanceAvg: number;
  homeworkAvg: number;
  focusAvg: number;
  testScore: number | null;
  missingTests: number;
}

interface AtRiskStudent {
  studentId: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
  department?: string;
  riskLevel: 'high' | 'medium' | 'low';
  factors: RiskFactor;
  totalScore: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Calculate date range (1 month ago to today)
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get the last day of current month for snapshot date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const snapshotDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // 1. Fetch study logs
    const { data: studyLogs, error: studyError } = await supabaseClient
      .from('study_logs')
      .select(`
        student_id,
        attendance_status,
        homework,
        focus,
        class_id,
        date,
        students!inner(id, name, status, department),
        classes!inner(id, name, teacher_id)
      `)
      .gte('date', monthAgoStr)
      .lte('date', todayStr)
      .eq('students.status', '재원');

    if (studyError) {
      throw new Error(`Failed to fetch study logs: ${studyError.message}`);
    }

    // 2. Fetch test logs
    const { data: testLogs } = await supabaseClient
      .from('test_logs')
      .select(`
        student_id,
        test_score,
        date,
        class_id
      `)
      .gte('date', monthAgoStr)
      .lte('date', todayStr);

    // 3. Fetch teachers
    const { data: teachers } = await supabaseClient
      .from('employees')
      .select('id, name')
      .eq('status', '재직');

    // 4. Calculate statistics per student
    const studentStatsMap = new Map();

    // Aggregate study logs data
    studyLogs?.forEach(log => {
      const studentId = log.student_id;
      const student = log.students as any;
      const classInfo = log.classes as any;
      
      if (!studentStatsMap.has(studentId)) {
        studentStatsMap.set(studentId, {
          studentId: log.student_id,
          studentName: student.name,
          department: student.department || '미분류',
          classNames: new Set(),
          teacherIds: new Set(),
          attendanceSum: 0,
          attendanceCount: 0,
          homeworkSum: 0,
          homeworkCount: 0,
          focusSum: 0,
          focusCount: 0,
          testScores: [],
          expectedTests: 0
        });
      }
      
      const stats = studentStatsMap.get(studentId)!;
      stats.classNames.add(classInfo.name);
      stats.teacherIds.add(classInfo.teacher_id);
      
      if (log.attendance_status) {
        stats.attendanceSum += log.attendance_status;
        stats.attendanceCount++;
      }
      if (log.homework) {
        stats.homeworkSum += log.homework;
        stats.homeworkCount++;
      }
      if (log.focus) {
        stats.focusSum += log.focus;
        stats.focusCount++;
      }
    });

    // Add test scores
    testLogs?.forEach(test => {
      if (studentStatsMap.has(test.student_id) && test.test_score !== null) {
        studentStatsMap.get(test.student_id).testScores.push(test.test_score);
      }
    });

    // 5. Calculate risk scores and prepare snapshots
    const snapshots: any[] = [];

    studentStatsMap.forEach((stats, studentId) => {
      stats.teacherIds.forEach((teacherId: string) => {
        const teacherName = teachers?.find(t => t.id === teacherId)?.name || '선생님';
        
        // Calculate averages
        const attendanceAvg = stats.attendanceCount > 0 ? stats.attendanceSum / stats.attendanceCount : 5;
        const homeworkAvg = stats.homeworkCount > 0 ? stats.homeworkSum / stats.homeworkCount : 5;
        const focusAvg = stats.focusCount > 0 ? stats.focusSum / stats.focusCount : 5;
        
        const testScore = stats.testScores.length > 0 
          ? stats.testScores.reduce((a: number, b: number) => a + b, 0) / stats.testScores.length 
          : null;
        const missingTests = Math.max(0, 1 - stats.testScores.length);
        
        // Calculate total risk score
        let totalScore = (attendanceAvg + homeworkAvg + focusAvg) / 3;
        if (testScore !== null) {
          totalScore = (totalScore * 3 + (testScore / 20)) / 4;
        }
        
        // Determine risk level - 더 엄격한 기준 적용
        let riskLevel: 'high' | 'medium' | 'low';
        if (totalScore < 2.5 || attendanceAvg < 2 || homeworkAvg < 2 || missingTests > 2) {
          // 고위험: 매우 심각한 경우만
          riskLevel = 'high';
        } else if (totalScore < 3.3 || attendanceAvg < 3 || homeworkAvg < 3 || (testScore !== null && testScore < 60) || missingTests > 1) {
          // 중위험: 실제로 문제가 있는 경우만
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }
        
        // Only save high and medium risk students
        if (riskLevel === 'high' || riskLevel === 'medium') {
          snapshots.push({
            snapshot_date: snapshotDate,
            student_id: studentId,
            student_name: stats.studentName,
            teacher_id: teacherId,
            teacher_name: teacherName,
            class_names: Array.from(stats.classNames).join(', '),
            department: stats.department,
            risk_level: riskLevel,
            total_score: totalScore,
            attendance_avg: attendanceAvg,
            homework_avg: homeworkAvg,
            focus_avg: focusAvg,
            test_score: testScore,
            missing_tests: missingTests
          });
        }
      });
    });

    // 6. Delete existing snapshots for this month
    const { error: deleteError } = await supabaseClient
      .from('at_risk_students_snapshots')
      .delete()
      .eq('snapshot_date', snapshotDate);

    if (deleteError) {
      console.error('Error deleting existing snapshots:', deleteError);
    }

    // 7. Insert new snapshots
    if (snapshots.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('at_risk_students_snapshots')
        .insert(snapshots);

      if (insertError) {
        throw new Error(`Failed to insert snapshots: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Saved ${snapshots.length} at-risk student snapshots for ${snapshotDate}`,
        snapshotCount: snapshots.length,
        snapshotDate
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})