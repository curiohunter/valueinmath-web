"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  approval_status?: string;
  name?: string;
  position?: string;
  department?: string;
  [key: string]: any;
}

interface Employee {
  id: string;
  name: string;
  auth_id: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  employee: Employee | null;
  isLoading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  employee: null,
  isLoading: true,
  isApproved: false,
  isAdmin: false,
  isEmployee: false,
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  const loadAuthState = useCallback(async () => {
    try {
      // 1. 세션 확인 (클라이언트 컴포넌트 최적화)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setProfile(null);
        setEmployee(null);
        return;
      }

      setUser(session.user);

      // 2. 프로필 조회 (병렬 처리)
      const [profileResult, employeeResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("employees")
          .select("*")
          .eq("auth_id", session.user.id)
          .maybeSingle()
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      if (employeeResult.data) {
        setEmployee(employeeResult.data);
      }
    } catch (error) {
      // Silent fail - auth state will be null
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // 초기 로드
    loadAuthState();

    // Auth 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadAuthState();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setEmployee(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadAuthState]);

  const value: AuthContextType = {
    user,
    profile,
    employee,
    isLoading,
    isApproved: profile?.approval_status === 'approved',
    isAdmin: employee?.position === '원장' || employee?.position === '부원장',
    isEmployee: !!employee,
    refreshAuth: loadAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}