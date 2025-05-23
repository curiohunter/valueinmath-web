'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function listAllUsers() {
  const { data, error } = await supabaseServer.auth.admin.listUsers();
  if (error) throw error;
  return data.users;
} 