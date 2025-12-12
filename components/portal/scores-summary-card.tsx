"use client"

import { Award } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TestScoreWithAvg {
  id: string
  date: string
  test: string
  test_type: string | null
  test_score: number
  class_id: string | null
  class_name: string | null
  note: string | null
  class_avg: number | null
  overall_avg: number | null
}

interface ScoresSummaryCardProps {
  scores: TestScoreWithAvg[]
  maxDisplay?: number
}

// 점수에 따른 색상
function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600"
  if (score >= 80) return "text-blue-600"
  if (score >= 70) return "text-yellow-600"
  if (score >= 60) return "text-orange-600"
  return "text-red-600"
}

export function ScoresSummaryCard({ scores, maxDisplay = 3 }: ScoresSummaryCardProps) {
  // Empty State
  if (!scores || scores.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          최근 테스트 성적
        </h3>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">아직 테스트 기록이 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">
            첫 테스트 결과가 기대됩니다!
          </p>
        </div>
      </div>
    )
  }

  // 최근 N개 표시
  const recentScores = scores.slice(0, maxDisplay)

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-amber-500" />
        최근 테스트 성적
      </h3>
      <div className="space-y-3">
        {recentScores.map((score) => (
          <div key={score.id} className="space-y-1">
            {/* 시험명, 유형, 날짜 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {score.test}
                </span>
                {score.test_type && (
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                    {score.test_type}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(score.date).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* 점수와 평균 */}
            <div className="flex items-center gap-3 text-sm">
              {/* 본인 점수 */}
              <div className="flex items-center gap-1">
                <span className={cn("font-bold", getScoreColor(score.test_score))}>
                  {score.test_score}점
                </span>
              </div>

              {/* 구분선 */}
              <span className="text-gray-300">|</span>

              {/* 반 평균 */}
              {score.class_avg !== null && (
                <span className="text-gray-500 text-xs">
                  반 <span className="font-medium">{score.class_avg}</span>
                </span>
              )}

              {/* 전체 평균 */}
              {score.overall_avg !== null && (
                <span className="text-gray-500 text-xs">
                  전체 <span className="font-medium">{score.overall_avg}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 더 보기 힌트 */}
      {scores.length > maxDisplay && (
        <p className="text-xs text-gray-400 text-center mt-3 pt-2 border-t">
          학습 탭에서 전체 {scores.length}개 기록 확인
        </p>
      )}
    </div>
  )
}
