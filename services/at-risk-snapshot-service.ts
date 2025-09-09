import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Student = Database['public']['Tables']['students']['Row'];
type Employee = Database['public']['Tables']['employees']['Row'];

export interface RiskFactor {
  attendanceAvg: number;
  homeworkAvg: number;
  focusAvg: number;
  testScore: number | null;
  missingTests: number;
}

export interface AtRiskStudent {
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

export interface TeacherGroup {
  teacherId: string;
  teacherName: string;
  students: AtRiskStudent[];
}

export interface AtRiskSnapshot {
  snapshot_date: string;
  student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  class_names: string;
  department: string | null;
  risk_level: 'high' | 'medium' | 'low';
  total_score: number;
  attendance_avg: number | null;
  homework_avg: number | null;
  focus_avg: number | null;
  test_score: number | null;
  missing_tests: number;
}

class AtRiskSnapshotService {
  private supabase = createClient();

  /**
   * Calculate current at-risk students based on recent performance data
   */
  async calculateAtRiskStudents(): Promise<TeacherGroup[]> {
    try {
      // Calculate date range (1 month ago to today)
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch study logs for the past month
      const { data: studyLogs, error: studyError } = await this.supabase
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
        console.error('Error fetching study logs:', studyError);
        throw studyError;
      }

      // 2. Fetch test logs for the past month
      const { data: testLogs, error: testError } = await this.supabase
        .from('test_logs')
        .select(`
          student_id,
          test_score,
          date,
          class_id
        `)
        .gte('date', monthAgoStr)
        .lte('date', todayStr);

      if (testError) {
        console.error('Error fetching test logs:', testError);
      }

      // 3. Fetch employee information
      const { data: teachers, error: teacherError } = await this.supabase
        .from('employees')
        .select('id, name')
        .eq('status', '재직');

      if (teacherError) {
        console.error('Error fetching teachers:', teacherError);
      }

      // 4. Calculate statistics per student
      const studentStatsMap = new Map<string, {
        studentId: string;
        studentName: string;
        department: string;
        classNames: Set<string>;
        teacherIds: Set<string>;
        attendanceSum: number;
        attendanceCount: number;
        homeworkSum: number;
        homeworkCount: number;
        focusSum: number;
        focusCount: number;
        testScores: number[];
        expectedTests: number;
      }>();

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

      // Convert to teacher-student combinations
      const studentStats = new Map<string, AtRiskStudent>();

      studentStatsMap.forEach((stats, studentId) => {
        stats.teacherIds.forEach(teacherId => {
          const key = `${studentId}_${teacherId}`;
          const teacherName = teachers?.find(t => t.id === teacherId)?.name || '선생님';
          
          // Calculate averages
          const attendanceAvg = stats.attendanceCount > 0 ? stats.attendanceSum / stats.attendanceCount : 5;
          const homeworkAvg = stats.homeworkCount > 0 ? stats.homeworkSum / stats.homeworkCount : 5;
          const focusAvg = stats.focusCount > 0 ? stats.focusSum / stats.focusCount : 5;
          
          // Add test scores
          const studentTestScores: number[] = [];
          testLogs?.forEach(test => {
            if (test.student_id === studentId && test.test_score !== null) {
              studentTestScores.push(test.test_score);
            }
          });
          
          const testScore = studentTestScores.length > 0 
            ? studentTestScores.reduce((a, b) => a + b, 0) / studentTestScores.length 
            : null;
          const missingTests = Math.max(0, 1 - studentTestScores.length);
          
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
          
          // Only include high and medium risk students
          if (riskLevel === 'high' || riskLevel === 'medium') {
            studentStats.set(key, {
              studentId: stats.studentId,
              studentName: stats.studentName,
              className: Array.from(stats.classNames).join(', '),
              teacherId,
              teacherName,
              department: stats.department,
              riskLevel,
              factors: {
                attendanceAvg,
                homeworkAvg,
                focusAvg,
                testScore,
                missingTests
              },
              totalScore
            });
          }
        });
      });

      // Group by teacher and select top 3 at-risk students
      const teacherGroupMap = new Map<string, TeacherGroup>();
      
      studentStats.forEach(student => {
        if (!teacherGroupMap.has(student.teacherId)) {
          teacherGroupMap.set(student.teacherId, {
            teacherId: student.teacherId,
            teacherName: student.teacherName,
            students: []
          });
        }
        teacherGroupMap.get(student.teacherId)!.students.push(student);
      });
      
      // Sort but DO NOT limit to top 3 per teacher
      // Show all at-risk students
      const finalGroups: TeacherGroup[] = [];
      teacherGroupMap.forEach(group => {
        group.students.sort((a, b) => a.totalScore - b.totalScore);
        // Remove the slice(0, 3) to show all students
        // group.students = group.students.slice(0, 3);
        finalGroups.push(group);
      });
      
      // Sort by teacher name
      finalGroups.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ko'));
      
      return finalGroups;
    } catch (error) {
      console.error('Error calculating at-risk students:', error);
      throw error;
    }
  }

  /**
   * Save monthly snapshot of at-risk students
   */
  async saveMonthlySnapshot(): Promise<void> {
    try {
      const teacherGroups = await this.calculateAtRiskStudents();
      
      // Get the last day of current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const snapshotDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      
      // Prepare snapshot records
      const snapshots: AtRiskSnapshot[] = [];
      
      teacherGroups.forEach(group => {
        group.students.forEach(student => {
          snapshots.push({
            snapshot_date: snapshotDate,
            student_id: student.studentId,
            student_name: student.studentName,
            teacher_id: student.teacherId,
            teacher_name: student.teacherName,
            class_names: student.className,
            department: student.department || null,
            risk_level: student.riskLevel,
            total_score: student.totalScore,
            attendance_avg: student.factors.attendanceAvg,
            homework_avg: student.factors.homeworkAvg,
            focus_avg: student.factors.focusAvg,
            test_score: student.factors.testScore,
            missing_tests: student.factors.missingTests
          });
        });
      });
      
      // Delete existing snapshots for this month (to avoid duplicates)
      const { error: deleteError } = await this.supabase
        .from('at_risk_students_snapshots')
        .delete()
        .eq('snapshot_date', snapshotDate);
      
      if (deleteError) {
        console.error('Error deleting existing snapshots:', deleteError);
      }
      
      // Insert new snapshots
      if (snapshots.length > 0) {
        const { error: insertError } = await this.supabase
          .from('at_risk_students_snapshots')
          .insert(snapshots);
        
        if (insertError) {
          console.error('Error inserting snapshots:', insertError);
          throw insertError;
        }
        
        console.log(`Saved ${snapshots.length} at-risk student snapshots for ${snapshotDate}`);
      } else {
        console.log(`No at-risk students to snapshot for ${snapshotDate}`);
      }
    } catch (error) {
      console.error('Error saving monthly snapshot:', error);
      throw error;
    }
  }

  /**
   * Get historical snapshots for a specific month
   */
  async getHistoricalSnapshots(year: number, month: number): Promise<AtRiskSnapshot[]> {
    try {
      // Calculate the last day of the month correctly
      const lastDay = new Date(year, month, 0).getDate(); // month is 1-based, so month=9 gives us Sept's last day
      
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const { data, error } = await this.supabase
        .from('at_risk_students_snapshots')
        .select('*')
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)
        .order('risk_level')
        .order('total_score');
      
      if (error) {
        console.error('Error fetching historical snapshots:', error.message || error);
        throw new Error(error.message || 'Failed to fetch historical snapshots');
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting historical snapshots:', error instanceof Error ? error.message : error);
      throw error instanceof Error ? error : new Error('Failed to get historical snapshots');
    }
  }

  /**
   * Compare snapshots between two months
   */
  async compareSnapshots(year1: number, month1: number, year2: number, month2: number) {
    try {
      const [snapshots1, snapshots2] = await Promise.all([
        this.getHistoricalSnapshots(year1, month1),
        this.getHistoricalSnapshots(year2, month2)
      ]);
      
      const comparison = {
        month1: { year: year1, month: month1, total: snapshots1.length, byRiskLevel: {} as any },
        month2: { year: year2, month: month2, total: snapshots2.length, byRiskLevel: {} as any },
        studentChanges: [] as any[]
      };
      
      // Count by risk level for each month
      ['high', 'medium', 'low'].forEach(level => {
        comparison.month1.byRiskLevel[level] = snapshots1.filter(s => s.risk_level === level).length;
        comparison.month2.byRiskLevel[level] = snapshots2.filter(s => s.risk_level === level).length;
      });
      
      // Track individual student changes
      const studentMap1 = new Map(snapshots1.map(s => [s.student_id, s]));
      const studentMap2 = new Map(snapshots2.map(s => [s.student_id, s]));
      
      studentMap1.forEach((snapshot1, studentId) => {
        const snapshot2 = studentMap2.get(studentId);
        if (snapshot2) {
          if (snapshot1.risk_level !== snapshot2.risk_level || 
              Math.abs(snapshot1.total_score - snapshot2.total_score) > 0.5) {
            comparison.studentChanges.push({
              studentId,
              studentName: snapshot1.student_name,
              month1RiskLevel: snapshot1.risk_level,
              month2RiskLevel: snapshot2.risk_level,
              scoreChange: snapshot2.total_score - snapshot1.total_score
            });
          }
        }
      });
      
      return comparison;
    } catch (error) {
      console.error('Error comparing snapshots:', error);
      throw error;
    }
  }

  /**
   * Get at-risk students count for statistics
   * Note: This only counts students that are displayed (top 3 per teacher)
   * For actual total count, use getAllAtRiskCount()
   */
  async getAtRiskCount(): Promise<number> {
    try {
      const groups = await this.calculateAtRiskStudents();
      const uniqueStudents = new Set<string>();
      
      groups.forEach(group => {
        group.students.forEach(student => {
          if (student.riskLevel === 'high' || student.riskLevel === 'medium') {
            uniqueStudents.add(student.studentId);
          }
        });
      });
      
      return uniqueStudents.size;
    } catch (error) {
      console.error('Error getting at-risk count:', error);
      return 0;
    }
  }

  /**
   * Get ALL at-risk students count (not limited to top 3 per teacher)
   * This gives the actual total count of all at-risk students
   */
  async getAllAtRiskCount(): Promise<{ total: number; byDept: Record<string, number> }> {
    try {
      // Calculate date range (1 month ago to today)
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch study logs for the past month
      const { data: studyLogs, error: studyError } = await this.supabase
        .from('study_logs')
        .select(`
          student_id,
          attendance_status,
          homework,
          focus,
          date,
          students!inner(id, name, status, department)
        `)
        .gte('date', monthAgoStr)
        .lte('date', todayStr)
        .eq('students.status', '재원');

      if (studyError) {
        console.error('Error fetching study logs:', studyError);
        throw studyError;
      }

      // Fetch test logs for the past month
      const { data: testLogs } = await this.supabase
        .from('test_logs')
        .select(`
          student_id,
          test_score,
          date
        `)
        .gte('date', monthAgoStr)
        .lte('date', todayStr);

      // Calculate statistics per student
      const studentStatsMap = new Map<string, {
        department: string;
        attendanceSum: number;
        attendanceCount: number;
        homeworkSum: number;
        homeworkCount: number;
        focusSum: number;
        focusCount: number;
        testScores: number[];
      }>();

      // Aggregate study logs data
      studyLogs?.forEach(log => {
        const studentId = log.student_id;
        const student = log.students as any;
        
        if (!studentStatsMap.has(studentId)) {
          studentStatsMap.set(studentId, {
            department: student.department || '미분류',
            attendanceSum: 0,
            attendanceCount: 0,
            homeworkSum: 0,
            homeworkCount: 0,
            focusSum: 0,
            focusCount: 0,
            testScores: []
          });
        }
        
        const stats = studentStatsMap.get(studentId)!;
        
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
          studentStatsMap.get(test.student_id)!.testScores.push(test.test_score);
        }
      });

      // Count at-risk students
      const atRiskByDept: Record<string, Set<string>> = {};
      let totalAtRisk = 0;

      studentStatsMap.forEach((stats, studentId) => {
        // Calculate averages
        const attendanceAvg = stats.attendanceCount > 0 ? stats.attendanceSum / stats.attendanceCount : 5;
        const homeworkAvg = stats.homeworkCount > 0 ? stats.homeworkSum / stats.homeworkCount : 5;
        const focusAvg = stats.focusCount > 0 ? stats.focusSum / stats.focusCount : 5;
        
        const testScore = stats.testScores.length > 0 
          ? stats.testScores.reduce((a, b) => a + b, 0) / stats.testScores.length 
          : null;
        const missingTests = Math.max(0, 1 - stats.testScores.length);
        
        // Calculate total risk score
        let totalScore = (attendanceAvg + homeworkAvg + focusAvg) / 3;
        if (testScore !== null) {
          totalScore = (totalScore * 3 + (testScore / 20)) / 4;
        }
        
        // Determine if at-risk (high or medium only) - 더 엄격한 기준
        const isAtRisk = totalScore < 2.5 || attendanceAvg < 2 || homeworkAvg < 2 || missingTests > 2 ||  // 고위험
                         totalScore < 3.3 || attendanceAvg < 3 || homeworkAvg < 3 || (testScore !== null && testScore < 60) || missingTests > 1;  // 중위험
        
        if (isAtRisk) {
          totalAtRisk++;
          const dept = stats.department;
          if (!atRiskByDept[dept]) {
            atRiskByDept[dept] = new Set();
          }
          atRiskByDept[dept].add(studentId);
        }
      });

      // Convert sets to counts
      const byDept: Record<string, number> = {};
      Object.entries(atRiskByDept).forEach(([dept, studentSet]) => {
        byDept[dept] = studentSet.size;
      });

      return { total: totalAtRisk, byDept };
    } catch (error) {
      console.error('Error getting all at-risk count:', error);
      return { total: 0, byDept: {} };
    }
  }
}

export const atRiskSnapshotService = new AtRiskSnapshotService();