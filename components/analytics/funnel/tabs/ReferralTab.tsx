"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Users, Plus, Pencil, Trash2, Trophy, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getReferralStatusColor,
  REFERRAL_TYPE_LABELS,
  REFERRAL_STATUS_LABELS,
  REWARD_TYPE_LABELS,
  type StudentReferral,
  type ReferralStatus,
  type RewardType,
  type ReferralStats,
  type TopReferrer,
} from "@/services/referral-service"

interface ReferralTabProps {
  // 추천 데이터
  referrals: StudentReferral[]
  referralStats: ReferralStats | null
  topReferrers: TopReferrer[]
  pendingRewards: StudentReferral[]
  loadingReferrals: boolean

  // 핸들러들
  onOpenCreateModal: () => void
  onOpenEditModal: (referral: StudentReferral) => void
  onDeleteReferral: (referralId: string) => void
  onChangeStatus: (referralId: string, status: ReferralStatus) => void
  onOpenRewardModal: (referral: StudentReferral) => void
}

export function ReferralTab({
  referrals,
  referralStats,
  topReferrers,
  pendingRewards,
  loadingReferrals,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteReferral,
  onChangeStatus,
  onOpenRewardModal,
}: ReferralTabProps) {
  if (loadingReferrals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{referralStats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">전체 추천</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{referralStats?.enrolledCount || 0}</div>
            <p className="text-xs text-muted-foreground">등록 완료</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{referralStats?.successRate || 0}%</div>
            <p className="text-xs text-muted-foreground">추천 성공률</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {(referralStats?.totalRewardAmount || 0).toLocaleString()}원
            </div>
            <p className="text-xs text-muted-foreground">지급된 보상 총액</p>
          </CardContent>
        </Card>
      </div>

      {/* 추천왕 & 보상 대기 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 추천왕 TOP 5 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              추천왕 TOP 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topReferrers.length > 0 ? (
              <div className="space-y-2">
                {topReferrers.map((referrer, idx) => (
                  <div key={referrer.student_id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0 && "bg-yellow-100 text-yellow-700",
                        idx === 1 && "bg-gray-100 text-gray-700",
                        idx === 2 && "bg-orange-100 text-orange-700",
                        idx > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{referrer.student_name}</span>
                      <Badge variant="outline" className="text-[10px]">{referrer.student_status}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{referrer.referral_count}명 추천</div>
                      <div className="text-xs text-muted-foreground">
                        성공 {referrer.enrolled_count}명 ({referrer.success_rate}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">추천 데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 보상 대기 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              보상 대기 ({pendingRewards.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRewards.length > 0 ? (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {pendingRewards.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium">{referral.referrer_name_snapshot}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="font-medium">{referral.referred_name_snapshot}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          등록일: {referral.enrolled_date}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onOpenRewardModal(referral)}>
                        <DollarSign className="w-3 h-3 mr-1" />
                        보상 지급
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">대기 중인 보상이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 추천 등록 버튼 & 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm">추천 내역</CardTitle>
            <Button size="sm" onClick={onOpenCreateModal}>
              <Plus className="w-4 h-4 mr-1" />
              추천 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2">추천인</th>
                    <th className="text-left p-2">피추천인</th>
                    <th className="text-center p-2">추천일</th>
                    <th className="text-center p-2">유형</th>
                    <th className="text-center p-2">상태</th>
                    <th className="text-right p-2">보상</th>
                    <th className="text-center p-2">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="border-b hover:bg-muted/30">
                      <td className="p-2">
                        <div className="font-medium">{referral.referrer_name_snapshot}</div>
                        {referral.referrer_student && (
                          <div className="text-xs text-muted-foreground">
                            {referral.referrer_student.school_type} {referral.referrer_student.grade}학년
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{referral.referred_name_snapshot}</div>
                        {referral.referred_student && (
                          <div className="text-xs text-muted-foreground">
                            {referral.referred_student.school_type} {referral.referred_student.grade}학년
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-center text-muted-foreground">{referral.referral_date}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {REFERRAL_TYPE_LABELS[referral.referral_type]}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Select
                          value={referral.referral_status}
                          onValueChange={(value) => onChangeStatus(referral.id, value as ReferralStatus)}
                        >
                          <SelectTrigger className="h-7 text-xs w-24">
                            <Badge variant="outline" className={cn("text-[10px]", getReferralStatusColor(referral.referral_status))}>
                              {REFERRAL_STATUS_LABELS[referral.referral_status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="상담중">상담 중</SelectItem>
                            <SelectItem value="테스트완료">테스트 완료</SelectItem>
                            <SelectItem value="등록완료">등록 완료</SelectItem>
                            <SelectItem value="미등록">미등록</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-right">
                        {referral.reward_given ? (
                          <div>
                            <div className="text-green-600 font-medium">
                              {referral.reward_amount.toLocaleString()}원
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {REWARD_TYPE_LABELS[referral.reward_type as RewardType] || referral.reward_type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          {referral.referral_status === '등록완료' && !referral.reward_given && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => onOpenRewardModal(referral)}
                              title="보상 지급"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onOpenEditModal(referral)}
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onDeleteReferral(referral.id)}
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">등록된 추천이 없습니다.</p>
              <Button onClick={onOpenCreateModal} variant="outline" size="sm" className="mt-3">
                <Plus className="w-4 h-4 mr-1" />
                첫 추천 등록하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
