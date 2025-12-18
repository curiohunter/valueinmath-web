"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Users, Plus, Pencil, Trash2, Trophy, DollarSign, ChevronLeft, ChevronRight, Search } from "lucide-react"
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
import type { MarketingActivity } from "@/services/marketing-service"

interface ReferralTabProps {
  // 추천 데이터
  referrals: StudentReferral[]
  referralStats: ReferralStats | null
  topReferrers: TopReferrer[]
  pendingRewards: StudentReferral[]
  loadingReferrals: boolean
  // 마케팅 활동 데이터
  marketingActivities?: MarketingActivity[]

  // 핸들러들
  onOpenCreateModal: () => void
  onOpenEditModal: (referral: StudentReferral) => void
  onDeleteReferral: (referralId: string) => void
  onChangeStatus: (referralId: string, status: ReferralStatus) => void
  onOpenRewardModal: (referral: StudentReferral) => void
}

// 유형별 색상
const getReferralTypeColor = (type: string) => {
  switch (type) {
    case '학부모추천':
      return "bg-pink-100 text-pink-700 border-pink-200"
    case '학생추천':
      return "bg-sky-100 text-sky-700 border-sky-200"
    case '형제자매':
      return "bg-violet-100 text-violet-700 border-violet-200"
    case '지인추천':
      return "bg-amber-100 text-amber-700 border-amber-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

// 상태별 배지 스타일
const getStatusBadgeStyle = (status: ReferralStatus) => {
  switch (status) {
    case '등록완료':
      return "bg-emerald-100 text-emerald-700 border-emerald-300"
    case '테스트완료':
      return "bg-blue-100 text-blue-700 border-blue-300"
    case '상담중':
      return "bg-amber-100 text-amber-700 border-amber-300"
    case '미등록':
      return "bg-gray-100 text-gray-500 border-gray-300"
    default:
      return "bg-gray-100 text-gray-700 border-gray-300"
  }
}

const ITEMS_PER_PAGE = 10

export function ReferralTab({
  referrals,
  referralStats,
  topReferrers,
  pendingRewards,
  loadingReferrals,
  marketingActivities = [],
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteReferral,
  onChangeStatus,
  onOpenRewardModal,
}: ReferralTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [referrerSearch, setReferrerSearch] = useState("")
  const [referredSearch, setReferredSearch] = useState("")

  // 마케팅 활동 ID로 타이틀 찾기
  const getActivityTitle = (activityId: string | null): string | null => {
    if (!activityId) return null
    const activity = marketingActivities.find(a => a.id === activityId)
    return activity?.title || null
  }

  // 정렬 및 필터링 (최신순 + 검색)
  const filteredAndSortedReferrals = useMemo(() => {
    let result = [...referrals]

    // 최신순 정렬
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 추천인 검색
    if (referrerSearch.trim()) {
      result = result.filter(r =>
        r.referrer_name_snapshot.toLowerCase().includes(referrerSearch.toLowerCase())
      )
    }

    // 피추천인 검색
    if (referredSearch.trim()) {
      result = result.filter(r =>
        r.referred_name_snapshot.toLowerCase().includes(referredSearch.toLowerCase())
      )
    }

    return result
  }, [referrals, referrerSearch, referredSearch])

  // 페이지네이션
  const totalPages = Math.ceil(filteredAndSortedReferrals.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedReferrals = filteredAndSortedReferrals.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // 검색 시 페이지 리셋
  const handleReferrerSearch = (value: string) => {
    setReferrerSearch(value)
    setCurrentPage(1)
  }

  const handleReferredSearch = (value: string) => {
    setReferredSearch(value)
    setCurrentPage(1)
  }

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
            <CardTitle className="text-sm">추천 내역 ({filteredAndSortedReferrals.length}건)</CardTitle>
            <Button size="sm" onClick={onOpenCreateModal}>
              <Plus className="w-4 h-4 mr-1" />
              추천 등록
            </Button>
          </div>

          {/* 검색 필터 */}
          <div className="flex gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="추천인 이름 검색..."
                value={referrerSearch}
                onChange={(e) => handleReferrerSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="피추천인 이름 검색..."
                value={referredSearch}
                onChange={(e) => handleReferredSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedReferrals.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">추천인</th>
                      <th className="text-left p-2 font-medium">피추천인</th>
                      <th className="text-center p-2 font-medium">추천일</th>
                      <th className="text-center p-2 font-medium">유형</th>
                      <th className="text-center p-2 font-medium">상태</th>
                      <th className="text-center p-2 font-medium">이벤트</th>
                      <th className="text-right p-2 font-medium">보상</th>
                      <th className="text-center p-2 font-medium">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReferrals.map((referral) => (
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
                          <Badge className={cn("text-[11px] font-medium", getReferralTypeColor(referral.referral_type))}>
                            {REFERRAL_TYPE_LABELS[referral.referral_type]}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Select
                            value={referral.referral_status}
                            onValueChange={(value) => onChangeStatus(referral.id, value as ReferralStatus)}
                          >
                            <SelectTrigger className={cn(
                              "h-7 w-[90px] text-[11px] font-medium border",
                              getStatusBadgeStyle(referral.referral_status)
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="상담중">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  상담중
                                </span>
                              </SelectItem>
                              <SelectItem value="테스트완료">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  테스트완료
                                </span>
                              </SelectItem>
                              <SelectItem value="등록완료">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  등록완료
                                </span>
                              </SelectItem>
                              <SelectItem value="미등록">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                                  미등록
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-center">
                          {referral.marketing_activity_id ? (
                            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                              {getActivityTitle(referral.marketing_activity_id) || "연결됨"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredAndSortedReferrals.length)} / {filteredAndSortedReferrals.length}건
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </Button>
                    <span className="text-sm px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-50" />
              {referrerSearch || referredSearch ? (
                <p className="text-sm">검색 결과가 없습니다.</p>
              ) : (
                <>
                  <p className="text-sm">등록된 추천이 없습니다.</p>
                  <Button onClick={onOpenCreateModal} variant="outline" size="sm" className="mt-3">
                    <Plus className="w-4 h-4 mr-1" />
                    첫 추천 등록하기
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
