/**
 * LLM 추상화 레이어
 * - OpenAI 기본, 폴백 지원
 * - 비용 계산 및 로깅
 * - 멀티테넌시 확장 가능 구조
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

// ============================================
// 환경 설정
// ============================================

const config = {
  provider: (process.env.LLM_PROVIDER || 'anthropic') as 'openai' | 'anthropic',
  model: process.env.LLM_MODEL || 'claude-haiku-4-5-20251001',
  modelFallback: process.env.LLM_MODEL_FALLBACK || 'claude-sonnet-4-20250514',
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1500', 10),
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.LLM_TOP_P || '1.0'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
}

// ============================================
// 모델별 단가 테이블 (USD per 1M tokens) - 2025-06 기준
// ============================================

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic 시리즈
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  // GPT-5 시리즈
  'gpt-5-nano': { input: 0.05, output: 0.20 },
  'gpt-5-mini': { input: 0.40, output: 1.60 },
  // GPT-4 시리즈
  'gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  // 기본값 (알 수 없는 모델)
  'default': { input: 0.80, output: 4.00 },
}

// ============================================
// 비용 계산 함수
// ============================================

export function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
  return (tokensIn / 1_000_000 * pricing.input) + (tokensOut / 1_000_000 * pricing.output)
}

export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || MODEL_PRICING['default']
}

// ============================================
// 프롬프트 해시 생성 (버전 추적용)
// ============================================

export function generatePromptHash(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16)
}

// ============================================
// LLM 클라이언트 (OpenAI + Anthropic)
// ============================================

let openaiClient: OpenAI | null = null
let anthropicClient: Anthropic | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey })
  }
  return openaiClient
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    anthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
      maxRetries: 3,
    })
  }
  return anthropicClient
}

// ============================================
// LLM 생성 인터페이스
// ============================================

export interface GenerateTextParams {
  prompt: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface GenerateTextResult {
  text: string
  tokensInput: number
  tokensOutput: number
  model: string
  durationMs: number
  cost: number
  promptHash: string
}

// ============================================
// 메인 생성 함수
// ============================================

export async function generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
  const startTime = Date.now()
  const model = params.model || config.model
  const maxTokens = params.maxTokens || config.maxTokens
  const temperature = params.temperature || config.temperature
  const promptHash = generatePromptHash(params.prompt)

  // provider 결정: 모델명으로 자동 감지, 없으면 config
  const provider = model.startsWith('claude-') ? 'anthropic'
    : model.startsWith('gpt-') ? 'openai'
    : config.provider

  try {
    if (provider === 'anthropic') {
      return await generateWithAnthropic(params, model, maxTokens, temperature, promptHash, startTime)
    }
    return await generateWithOpenAI(params, model, maxTokens, temperature, promptHash, startTime)
  } catch (error: any) {
    // 폴백 모델로 재시도
    if (model !== config.modelFallback && config.modelFallback) {
      console.warn(`[LLM] Primary model ${model} failed, trying fallback ${config.modelFallback}:`, error.message)
      return generateText({ ...params, model: config.modelFallback })
    }
    throw error
  }
}

async function generateWithAnthropic(
  params: GenerateTextParams,
  model: string,
  maxTokens: number,
  temperature: number,
  promptHash: string,
  startTime: number,
): Promise<GenerateTextResult> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: params.prompt }],
  })

  const durationMs = Date.now() - startTime
  const tokensInput = response.usage?.input_tokens || 0
  const tokensOutput = response.usage?.output_tokens || 0
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  console.log('[LLM] Anthropic response:', {
    model,
    tokensInput,
    tokensOutput,
    textLength: text.length,
    stopReason: response.stop_reason,
  })

  return {
    text,
    tokensInput,
    tokensOutput,
    model,
    durationMs,
    cost: calculateCost(model, tokensInput, tokensOutput),
    promptHash,
  }
}

async function generateWithOpenAI(
  params: GenerateTextParams,
  model: string,
  maxTokens: number,
  temperature: number,
  promptHash: string,
  startTime: number,
): Promise<GenerateTextResult> {
  const client = getOpenAIClient()
  const isReasoningModel = model.includes('o1') || model.includes('o3') || model.includes('gpt-5')

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: params.prompt }],
    ...(isReasoningModel
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens, temperature, top_p: config.topP }
    ),
  })

  const durationMs = Date.now() - startTime
  const tokensInput = response.usage?.prompt_tokens || 0
  const tokensOutput = response.usage?.completion_tokens || 0
  const choice = response.choices[0]
  const text = choice?.message?.content || ''

  console.log('[LLM] OpenAI response:', {
    model,
    tokensInput,
    tokensOutput,
    textLength: text.length,
    finishReason: choice?.finish_reason,
  })

  return {
    text,
    tokensInput,
    tokensOutput,
    model,
    durationMs,
    cost: calculateCost(model, tokensInput, tokensOutput),
    promptHash,
  }
}

// ============================================
// 설정 조회 (디버깅용)
// ============================================

export function getLLMConfig() {
  return {
    provider: config.provider,
    model: config.model,
    modelFallback: config.modelFallback,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    hasOpenAIKey: !!config.openaiApiKey,
    hasAnthropicKey: !!config.anthropicApiKey,
  }
}

// ============================================
// 멀티테넌시 확장 (향후)
// ============================================

// TODO: 테넌트별 모델 설정 조회
// export async function getTenantModel(tenantId: string): Promise<string> {
//   const settings = await supabase
//     .from('tenant_settings')
//     .select('ai_engine_model')
//     .eq('tenant_id', tenantId)
//     .single()
//   return settings.data?.ai_engine_model || config.model
// }
