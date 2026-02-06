"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Palette,
  Building2,
  Hash,
  Instagram,
  Youtube,
  Globe,
  MessageCircle,
  Loader2,
  Save,
  Plus,
  X,
  Users,
  School,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import MarketingTabs from "@/components/marketing/MarketingTabs"
import type {
  BrandSettings,
  BrandSettingsFormData,
  BrandTone,
  StudentDistribution,
} from "@/types/brand"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TONE_OPTIONS: { value: BrandTone; label: string; description: string }[] = [
  { value: "friendly", label: "친근함", description: "따뜻하고 친근한 어조" },
  { value: "professional", label: "전문적", description: "신뢰감 있는 전문가 어조" },
  { value: "warm", label: "따뜻함", description: "공감하고 배려하는 어조" },
]

export default function BrandingSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)

  // SWR로 데이터 로드 (캐싱 + 중복 요청 방지)
  const { data: settingsData, mutate: mutateSettings } = useSWR<{ success: boolean; data: BrandSettings | null }>(
    "/api/brand-settings",
    fetcher
  )
  const { data: statsData } = useSWR<{ success: boolean; data: StudentDistribution }>(
    "/api/brand-settings/stats",
    fetcher
  )

  const settings = settingsData?.data
  const stats = statsData?.data
  const isLoading = !settingsData || !statsData

  // 폼 상태
  const [academyName, setAcademyName] = useState("")
  const [slogan, setSlogan] = useState("")
  const [tagline, setTagline] = useState("")
  const [foundingStory, setFoundingStory] = useState("")
  const [philosophy, setPhilosophy] = useState("")
  const [differentiators, setDifferentiators] = useState<string[]>([])
  const [newDifferentiator, setNewDifferentiator] = useState("")
  const [tone, setTone] = useState<BrandTone>("friendly")
  const [hashtags, setHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState("")
  const [instagramHandle, setInstagramHandle] = useState("")
  const [blogUrl, setBlogUrl] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [naverPlaceUrl, setNaverPlaceUrl] = useState("")
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState("")

  // 설정 데이터가 로드되면 폼 상태 초기화
  useEffect(() => {
    if (settings) {
      setAcademyName(settings.academy_name)
      setSlogan(settings.slogan || "")
      setTagline(settings.tagline || "")
      setFoundingStory(settings.founding_story || "")
      setPhilosophy(settings.philosophy || "")
      setDifferentiators(settings.differentiators || [])
      setTone(settings.tone)
      setHashtags(settings.hashtags || [])
      setInstagramHandle(settings.instagram_handle || "")
      setBlogUrl(settings.blog_url || "")
      setYoutubeUrl(settings.youtube_url || "")
      setNaverPlaceUrl(settings.naver_place_url || "")
      setKakaoChannelUrl(settings.kakao_channel_url || "")
    }
  }, [settings])

  // 저장
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const formData: BrandSettingsFormData = {
        academy_name: academyName,
        slogan: slogan || null,
        tagline: tagline || null,
        founding_story: foundingStory || null,
        philosophy: philosophy || null,
        differentiators,
        tone,
        hashtags,
        instagram_handle: instagramHandle || null,
        blog_url: blogUrl || null,
        youtube_url: youtubeUrl || null,
        naver_place_url: naverPlaceUrl || null,
        kakao_channel_url: kakaoChannelUrl || null,
      }

      const res = await fetch("/api/brand-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (result.success) {
        toast.success("브랜딩 설정이 저장되었습니다.")
        mutateSettings()
      } else {
        toast.error(result.error || "저장 실패")
      }
    } catch (error) {
      console.error("저장 오류:", error)
      toast.error("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 차별점 추가
  const addDifferentiator = () => {
    if (newDifferentiator.trim()) {
      setDifferentiators([...differentiators, newDifferentiator.trim()])
      setNewDifferentiator("")
    }
  }

  // 차별점 삭제
  const removeDifferentiator = (index: number) => {
    setDifferentiators(differentiators.filter((_, i) => i !== index))
  }

  // 해시태그 추가
  const addHashtag = () => {
    if (newHashtag.trim()) {
      const tag = newHashtag.trim().replace(/^#/, "")
      if (!hashtags.includes(tag)) {
        setHashtags([...hashtags, tag])
      }
      setNewHashtag("")
    }
  }

  // 해시태그 삭제
  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <MarketingTabs />
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MarketingTabs />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">브랜딩 설정</h1>
            <p className="text-muted-foreground">
              학원의 브랜드 정체성을 설정합니다
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          저장
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 메인 설정 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>기본 정보</CardTitle>
              </div>
              <CardDescription>
                학원의 기본 브랜드 정보를 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="academyName">학원명</Label>
                <Input
                  id="academyName"
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  placeholder="밸류인수학학원"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slogan">슬로건</Label>
                <Input
                  id="slogan"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="수학의 가치를 발견하다"
                />
                <p className="text-xs text-muted-foreground">
                  학원의 핵심 가치를 담은 문장
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">태그라인</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="짧고 기억에 남는 문구"
                />
                <p className="text-xs text-muted-foreground">
                  광고나 홍보에 사용할 짧은 캐치프레이즈
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 브랜드 스토리 */}
          <Card>
            <CardHeader>
              <CardTitle>브랜드 스토리</CardTitle>
              <CardDescription>
                학원의 이야기와 철학을 담아주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="philosophy">교육 철학</Label>
                <Textarea
                  id="philosophy"
                  value={philosophy}
                  onChange={(e) => setPhilosophy(e.target.value)}
                  placeholder="우리 학원이 추구하는 교육의 방향..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foundingStory">창업 스토리</Label>
                <Textarea
                  id="foundingStory"
                  value={foundingStory}
                  onChange={(e) => setFoundingStory(e.target.value)}
                  placeholder="학원을 시작하게 된 계기, 원장님의 이야기..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 차별점 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <CardTitle>우리 학원만의 강점</CardTitle>
              </div>
              <CardDescription>
                다른 학원과 차별화되는 포인트를 추가하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {differentiators.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-sm py-1.5 px-3"
                  >
                    {item}
                    <button
                      onClick={() => removeDifferentiator(index)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDifferentiator}
                  onChange={(e) => setNewDifferentiator(e.target.value)}
                  placeholder="예: 1:1 맞춤 커리큘럼"
                  onKeyPress={(e) => e.key === "Enter" && addDifferentiator()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDifferentiator}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 브랜드 보이스 */}
          <Card>
            <CardHeader>
              <CardTitle>브랜드 보이스</CardTitle>
              <CardDescription>
                콘텐츠 생성 시 사용할 어조를 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>톤 & 매너</Label>
                <Select
                  value={tone}
                  onValueChange={(v) => setTone(v as BrandTone)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-muted-foreground ml-2">
                            - {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Label>기본 해시태그</Label>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {hashtags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      #{tag}
                      <button
                        onClick={() => removeHashtag(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    placeholder="해시태그 입력 (# 없이)"
                    onKeyPress={(e) => e.key === "Enter" && addHashtag()}
                  />
                  <Button type="button" variant="outline" onClick={addHashtag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SNS 연결 */}
          <Card>
            <CardHeader>
              <CardTitle>SNS & 온라인 채널</CardTitle>
              <CardDescription>학원의 온라인 채널을 연결하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    인스타그램
                  </Label>
                  <Input
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@valuein_math"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    네이버 블로그
                  </Label>
                  <Input
                    value={blogUrl}
                    onChange={(e) => setBlogUrl(e.target.value)}
                    placeholder="https://blog.naver.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Youtube className="h-4 w-4" />
                    유튜브
                  </Label>
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    네이버 플레이스
                  </Label>
                  <Input
                    value={naverPlaceUrl}
                    onChange={(e) => setNaverPlaceUrl(e.target.value)}
                    placeholder="https://map.naver.com/..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    카카오 채널
                  </Label>
                  <Input
                    value={kakaoChannelUrl}
                    onChange={(e) => setKakaoChannelUrl(e.target.value)}
                    placeholder="https://pf.kakao.com/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 통계 사이드바 */}
        <div className="space-y-6">
          {/* 재원생 분포 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">재원생 현황</CardTitle>
              </div>
              <CardDescription>
                현재 등록된 학생 분포 (자동 분석)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-4">
                  <div className="text-center py-3 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.total_active}명
                    </div>
                    <div className="text-sm text-muted-foreground">
                      총 재원생
                    </div>
                  </div>

                  <Separator />

                  {/* 학교 유형별 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      학교 유형별
                    </div>
                    {stats.by_school_type.map((item) => (
                      <div
                        key={item.school_type}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm">{item.school_type}</span>
                        <Badge variant="secondary">{item.count}명</Badge>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* 학년별 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      학년별
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {stats.by_grade.map((item) => (
                        <div
                          key={`${item.school_type}-${item.grade}`}
                          className="flex justify-between items-center text-sm"
                        >
                          <span>
                            {item.school_type === "초등학교"
                              ? `초${item.grade}`
                              : item.school_type === "중학교"
                              ? `중${item.grade}`
                              : `고${item.grade}`}
                          </span>
                          <span className="text-muted-foreground">
                            {item.count}명
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  데이터 없음
                </div>
              )}
            </CardContent>
          </Card>

          {/* 주요 학교 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">주요 학교</CardTitle>
              </div>
              <CardDescription>재원생이 많은 학교 TOP 10</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.top_schools && stats.top_schools.length > 0 ? (
                <div className="space-y-2">
                  {stats.top_schools.map((item, index) => (
                    <div
                      key={item.school}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">
                          {index + 1}
                        </span>
                        <span className="text-sm">{item.school}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.count}명
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  데이터 없음
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
