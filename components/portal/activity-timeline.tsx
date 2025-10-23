import { ActivityTimelineItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, ClipboardCheck, FileText, Calendar, MessageSquare, Target } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface ActivityTimelineProps {
  activities: ActivityTimelineItem[]
}

const activityIcons = {
  study: BookOpen,
  test: ClipboardCheck,
  exam: FileText,
  makeup: Calendar,
  consultation: MessageSquare,
  mathflat: Target,
}

const activityColors = {
  study: "bg-blue-500",
  test: "bg-green-500",
  exam: "bg-purple-500",
  makeup: "bg-orange-500",
  consultation: "bg-pink-500",
  mathflat: "bg-cyan-500",
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">최근 활동이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type]
              const colorClass = activityColors[activity.type]

              return (
                <div key={activity.id} className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4 border-b last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold">{activity.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {activity.date
                          ? format(new Date(activity.date), "M월 d일", { locale: ko })
                          : "날짜 미정"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
