import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

// 타입 정의
// (실제 프로젝트의 Database 타입에 맞게 조정 필요)
type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
type EmployeeRow = Database['public']['Tables']['employees']['Row'];
type ScheduleGoalRow = Database['public']['Tables']['schedule_goals']['Row'];
type ScheduleMomentRow = Database['public']['Tables']['schedule_moments']['Row'];

export type ScheduleComplete = ScheduleRow & {
  parent_schedules?: ScheduleRow[];
  follow_up_schedules?: ScheduleRow[];
  schedule_employees?: (Database['public']['Tables']['schedule_employees']['Row'] & {
    employees?: EmployeeRow;
  })[];
  direct_goals?: ScheduleGoalRow[];
  connected_goals?: ScheduleGoalRow[];
  direct_moments?: ScheduleMomentRow[];
  connected_moments?: ScheduleMomentRow[];
  hasParent?: boolean;
  hasFollowUps?: boolean;
  relationshipType?: 'parent' | 'followup' | 'standalone' | 'middle';
};

export function useScheduleComplete(scheduleId: string | null) {
  return useSWR(
    scheduleId ? ['schedule-complete', scheduleId] : null,
    async () => {
      if (!scheduleId) return null;
      const supabase = getSupabaseBrowserClient();

      // 병렬로 모든 관련 데이터 조회
      const [
        scheduleData,
        parentRelations,
        followUpRelations,
        employeesData,
        directGoals,
        connectedGoalsData,
        directMoments,
        connectedMomentsData
      ] = await Promise.all([
        supabase.from('schedules').select('*').eq('id', scheduleId).single(),
        supabase.from('schedule_follow_ups').select('parent_schedule_id, schedules!parent_schedule_id(*)').eq('follow_up_schedule_id', scheduleId),
        supabase.from('schedule_follow_ups').select('follow_up_schedule_id, schedules!follow_up_schedule_id(*)').eq('parent_schedule_id', scheduleId),
        supabase.from('schedule_employees').select('*, employees(*)').eq('schedule_id', scheduleId),
        supabase.from('schedule_goals').select('*').eq('schedule_id', scheduleId),
        supabase.from('schedule_goal_connections').select('*, schedule_goals(*)').eq('schedule_id', scheduleId),
        supabase.from('schedule_moments').select('*').eq('schedule_id', scheduleId),
        supabase.from('schedule_moment_connections').select('*, schedule_moments(*)').eq('schedule_id', scheduleId)
      ]);

      if (scheduleData.error) throw scheduleData.error;

      const result: ScheduleComplete = {
        ...scheduleData.data,
        parent_schedules: parentRelations.data?.map(r => r.schedules).filter(Boolean) || [],
        follow_up_schedules: followUpRelations.data?.map(r => r.schedules).filter(Boolean) || [],
        schedule_employees: employeesData.data || [],
        direct_goals: directGoals.data || [],
        connected_goals: connectedGoalsData.data?.map(c => c.schedule_goals).filter(Boolean) || [],
        direct_moments: directMoments.data || [],
        connected_moments: connectedMomentsData.data?.map(c => c.schedule_moments).filter(Boolean) || [],
      };

      // 관계 메타 정보 추가
      result.hasParent = (result.parent_schedules?.length || 0) > 0;
      result.hasFollowUps = (result.follow_up_schedules?.length || 0) > 0;
      if (result.hasFollowUps && result.hasParent) result.relationshipType = 'middle';
      else if (result.hasFollowUps) result.relationshipType = 'parent';
      else if (result.hasParent) result.relationshipType = 'followup';
      else result.relationshipType = 'standalone';

      return result;
    }
  );
} 