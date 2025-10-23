import { StudentOverviewStats } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, ClipboardCheck, MessageSquare, Calendar, Target, TrendingUp } from "lucide-react"

interface OverviewStatsProps {
  stats: StudentOverviewStats
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  const statCards = [
    {
      title: "출석률",
      value: `${stats.attendance_rate}%`,
      icon: Calendar,
      description: `총 ${stats.total_study_logs}회 학습`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "평균 점수",
      value: `${stats.average_score}점`,
      icon: TrendingUp,
      description: `총 ${stats.total_tests}회 테스트`,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "상담",
      value: `${stats.total_consultations}회`,
      icon: MessageSquare,
      description: "진행된 상담",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      title: "보강 수업",
      value: `${stats.total_makeup_classes}회`,
      icon: BookOpen,
      description: "보강 수업 횟수",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "매쓰플랫 문제 풀이",
      value: `${stats.mathflat_total_problems}문제`,
      icon: Target,
      description: "총 풀이 문제 수",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
    {
      title: "매쓰플랫 정답률",
      value: `${stats.mathflat_accuracy_rate}%`,
      icon: ClipboardCheck,
      description: "평균 정답률",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">학습 현황</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
