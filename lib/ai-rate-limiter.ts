/**
 * AI API Rate Limiter
 * DB 기반 Rate Limiting으로 서버 재시작 시에도 유지
 * 비용 상한 및 요청 제한으로 API 남용 방지
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// 제한 설정 (환경변수로 오버라이드 가능)
// ============================================

export const RATE_LIMITS = {
  // 사용자별 제한
  HOURLY_REQUESTS: parseInt(process.env.AI_HOURLY_LIMIT || '10', 10),
  DAILY_REQUESTS: parseInt(process.env.AI_DAILY_LIMIT || '50', 10),
  DAILY_COST_USD: parseFloat(process.env.AI_DAILY_COST_LIMIT || '1.00'),

  // 글로벌 제한 (전체 시스템)
  GLOBAL_DAILY_REQUESTS: parseInt(process.env.AI_GLOBAL_DAILY_LIMIT || '500', 10),
  GLOBAL_DAILY_COST_USD: parseFloat(process.env.AI_GLOBAL_COST_LIMIT || '10.00'),
}

// ============================================
// 타입 정의
// ============================================

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  remaining?: {
    hourly: number
    daily: number
    dailyCostUsd: number
  }
  resetAt?: Date
}

export interface UsageRecord {
  userId: string
  costUsd: number
}

// ============================================
// Rate Limit 체크 함수
// ============================================

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0]
  const currentHour = new Date().getHours()

  try {
    // 1. 사용자별 일일 제한 조회/생성
    let { data: userLimit, error: userError } = await supabase
      .from('ai_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    // 오늘 레코드가 없으면 생성
    if (userError?.code === 'PGRST116') {
      const { data: newLimit, error: insertError } = await supabase
        .from('ai_rate_limits')
        .insert({
          user_id: userId,
          date: today,
          hour_bucket: currentHour,
          hourly_count: 0,
          daily_count: 0,
          daily_cost_usd: 0,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[RateLimiter] Insert error:', insertError)
        // DB 오류 시에도 일단 허용 (fail-open, 로깅으로 감지)
        return { allowed: true }
      }
      userLimit = newLimit
    } else if (userError) {
      console.error('[RateLimiter] Query error:', userError)
      return { allowed: true }
    }

    // 2. 시간대가 바뀌었으면 hourly_count 리셋
    if (userLimit.hour_bucket !== currentHour) {
      await supabase
        .from('ai_rate_limits')
        .update({ hour_bucket: currentHour, hourly_count: 0 })
        .eq('id', userLimit.id)
      userLimit.hourly_count = 0
    }

    // 3. 사용자별 제한 체크
    if (userLimit.hourly_count >= RATE_LIMITS.HOURLY_REQUESTS) {
      return {
        allowed: false,
        reason: `시간당 요청 제한 초과 (${RATE_LIMITS.HOURLY_REQUESTS}회). 잠시 후 다시 시도해주세요.`,
        remaining: {
          hourly: 0,
          daily: Math.max(0, RATE_LIMITS.DAILY_REQUESTS - userLimit.daily_count),
          dailyCostUsd: Math.max(0, RATE_LIMITS.DAILY_COST_USD - userLimit.daily_cost_usd),
        },
        resetAt: new Date(new Date().setMinutes(0, 0, 0) + 60 * 60 * 1000),
      }
    }

    if (userLimit.daily_count >= RATE_LIMITS.DAILY_REQUESTS) {
      return {
        allowed: false,
        reason: `일일 요청 제한 초과 (${RATE_LIMITS.DAILY_REQUESTS}회). 내일 다시 시도해주세요.`,
        remaining: {
          hourly: Math.max(0, RATE_LIMITS.HOURLY_REQUESTS - userLimit.hourly_count),
          daily: 0,
          dailyCostUsd: Math.max(0, RATE_LIMITS.DAILY_COST_USD - userLimit.daily_cost_usd),
        },
      }
    }

    if (userLimit.daily_cost_usd >= RATE_LIMITS.DAILY_COST_USD) {
      return {
        allowed: false,
        reason: `일일 비용 한도 초과. 내일 다시 시도해주세요.`,
        remaining: {
          hourly: Math.max(0, RATE_LIMITS.HOURLY_REQUESTS - userLimit.hourly_count),
          daily: Math.max(0, RATE_LIMITS.DAILY_REQUESTS - userLimit.daily_count),
          dailyCostUsd: 0,
        },
      }
    }

    // 4. 글로벌 제한 체크
    const { data: globalLimit } = await supabase
      .from('ai_global_limits')
      .select('*')
      .eq('date', today)
      .single()

    if (globalLimit) {
      if (globalLimit.total_requests >= RATE_LIMITS.GLOBAL_DAILY_REQUESTS) {
        return {
          allowed: false,
          reason: '서비스 일일 요청 한도에 도달했습니다. 내일 다시 시도해주세요.',
        }
      }

      if (globalLimit.total_cost_usd >= RATE_LIMITS.GLOBAL_DAILY_COST_USD) {
        return {
          allowed: false,
          reason: '서비스 일일 비용 한도에 도달했습니다. 내일 다시 시도해주세요.',
        }
      }
    }

    // 5. 허용
    return {
      allowed: true,
      remaining: {
        hourly: RATE_LIMITS.HOURLY_REQUESTS - userLimit.hourly_count - 1,
        daily: RATE_LIMITS.DAILY_REQUESTS - userLimit.daily_count - 1,
        dailyCostUsd: RATE_LIMITS.DAILY_COST_USD - userLimit.daily_cost_usd,
      },
    }
  } catch (error) {
    console.error('[RateLimiter] Unexpected error:', error)
    // 예외 시 fail-open (로깅으로 감지)
    return { allowed: true }
  }
}

// ============================================
// 사용량 기록 함수 (API 호출 후 실행)
// ============================================

export async function recordUsage(
  supabase: SupabaseClient,
  record: UsageRecord
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const currentHour = new Date().getHours()

  // 병렬로 두 RPC 함수 실행 (성능 최적화)
  const [userResult, globalResult] = await Promise.allSettled([
    // 1. 사용자별 카운터 업데이트
    supabase.rpc('increment_ai_usage', {
      p_user_id: record.userId,
      p_date: today,
      p_hour: currentHour,
      p_cost: record.costUsd,
    }),
    // 2. 글로벌 카운터 업데이트
    supabase.rpc('increment_global_ai_usage', {
      p_date: today,
      p_cost: record.costUsd,
    }),
  ])

  // 에러 로깅 (실패해도 API 응답은 정상 반환)
  if (userResult.status === 'rejected' || (userResult.status === 'fulfilled' && userResult.value.error)) {
    const error = userResult.status === 'rejected' ? userResult.reason : userResult.value.error
    console.error('[RateLimiter] User usage record failed:', error)
  }
  if (globalResult.status === 'rejected' || (globalResult.status === 'fulfilled' && globalResult.value.error)) {
    const error = globalResult.status === 'rejected' ? globalResult.reason : globalResult.value.error
    console.error('[RateLimiter] Global usage record failed:', error)
  }
}

// ============================================
// 사용량 증가 SQL 함수 (RPC용) - 마이그레이션으로 추가
// ============================================

export const USAGE_INCREMENT_SQL = `
-- 사용자별 사용량 증가 함수
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_date DATE,
  p_hour INTEGER,
  p_cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_rate_limits (user_id, date, hour_bucket, hourly_count, daily_count, daily_cost_usd, last_request_at)
  VALUES (p_user_id, p_date, p_hour, 1, 1, p_cost, NOW())
  ON CONFLICT (user_id, date) DO UPDATE SET
    hour_bucket = CASE
      WHEN ai_rate_limits.hour_bucket != p_hour THEN p_hour
      ELSE ai_rate_limits.hour_bucket
    END,
    hourly_count = CASE
      WHEN ai_rate_limits.hour_bucket != p_hour THEN 1
      ELSE ai_rate_limits.hourly_count + 1
    END,
    daily_count = ai_rate_limits.daily_count + 1,
    daily_cost_usd = ai_rate_limits.daily_cost_usd + p_cost,
    last_request_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 글로벌 사용량 증가 함수
CREATE OR REPLACE FUNCTION increment_global_ai_usage(
  p_date DATE,
  p_cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_global_limits (date, total_requests, total_cost_usd)
  VALUES (p_date, 1, p_cost)
  ON CONFLICT (date) DO UPDATE SET
    total_requests = ai_global_limits.total_requests + 1,
    total_cost_usd = ai_global_limits.total_cost_usd + p_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`
