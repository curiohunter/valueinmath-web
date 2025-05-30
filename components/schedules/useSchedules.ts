import useSWR from 'swr';
import { supabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

export function useSchedules() {
  return useSWR('schedules', async () => {
    const { data, error } = await supabaseClient
      .from('schedules')
      .select('*')
      .order('start_datetime', { ascending: true });
    if (error) throw error;
    return data as Database['public']['Tables']['schedules']['Row'][];
  });
} 