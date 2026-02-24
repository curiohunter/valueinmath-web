'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BLOG_TOPICS,
  BLOG_TONES,
  BLOG_LENGTHS,
  type BlogTopic,
  type BlogTone,
  type BlogLength,
} from '@/services/blog-ai-service'

interface AIBlogGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface GeneratedContent {
  title: string
  summary: string
  body: string
  hashtags: string[]
}

type Step = 'settings' | 'preview'

export function AIBlogGenerator({ open, onOpenChange, onSaved }: AIBlogGeneratorProps) {
  // Settings
  const [topic, setTopic] = useState<BlogTopic>('study_tips')
  const [customTopic, setCustomTopic] = useState('')
  const [tone, setTone] = useState<BlogTone>('professional')
  const [length, setLength] = useState<BlogLength>('medium')
  const [includeReviews, setIncludeReviews] = useState(true)

  // State
  const [step, setStep] = useState<Step>('settings')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generated, setGenerated] = useState<GeneratedContent | null>(null)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/content-posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          customTopic: topic === 'free_topic' ? customTopic : undefined,
          tone,
          length,
          includeReviews,
        }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'AI 생성 실패')
      }

      setGenerated(result.data)
      setStep('preview')
      toast.success('블로그 글이 생성되었습니다.')
    } catch (error) {
      console.error('AI 생성 오류:', error)
      toast.error(error instanceof Error ? error.message : 'AI 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }, [topic, customTopic, tone, length, includeReviews])

  const handleSaveDraft = useCallback(async () => {
    if (!generated) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/content-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'blog',
          status: 'draft',
          title: generated.title,
          summary: generated.summary,
          body: generated.body,
          hashtags: generated.hashtags,
          ai_generated: true,
          ai_prompt_used: `topic:${topic}, tone:${tone}, length:${length}`,
          slug: generated.title
            .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60)
            .toLowerCase(),
        }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '저장 실패')
      }

      toast.success('초안으로 저장되었습니다.')
      onSaved()
      handleClose()
    } catch (error) {
      console.error('저장 오류:', error)
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }, [generated, topic, tone, length, onSaved])

  const handleClose = useCallback(() => {
    setStep('settings')
    setGenerated(null)
    setCustomTopic('')
    onOpenChange(false)
  }, [onOpenChange])

  const updateGenerated = useCallback(
    (field: keyof GeneratedContent, value: string | string[]) => {
      if (!generated) return
      setGenerated({ ...generated, [field]: value })
    },
    [generated]
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 블로그 생성
            {step === 'preview' && (
              <Badge variant="secondary" className="ml-2">미리보기</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'settings' ? (
          <div className="space-y-6 py-4">
            {/* Topic */}
            <div className="space-y-2">
              <Label>주제</Label>
              <Select value={topic} onValueChange={(v) => setTopic(v as BlogTopic)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOG_TOPICS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} — {t.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {topic === 'free_topic' && (
                <Input
                  placeholder="원하는 주제를 입력하세요..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>톤</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as BlogTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOG_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <Label>길이</Label>
              <Select value={length} onValueChange={(v) => setLength(v as BlogLength)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOG_LENGTHS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Include Reviews */}
            <div className="flex items-center justify-between">
              <div>
                <Label>실제 후기 포함</Label>
                <p className="text-sm text-muted-foreground">
                  마케팅 동의된 후기를 콘텐츠에 자연스럽게 반영합니다.
                </p>
              </div>
              <Switch checked={includeReviews} onCheckedChange={setIncludeReviews} />
            </div>

            {/* Generate Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || (topic === 'free_topic' && !customTopic.trim())}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI가 글을 쓰고 있습니다...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  블로그 글 생성
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Preview step */
          generated && (
            <div className="space-y-4 py-4">
              {/* Editable title */}
              <div className="space-y-1.5">
                <Label>제목</Label>
                <Input
                  value={generated.title}
                  onChange={(e) => updateGenerated('title', e.target.value)}
                />
              </div>

              {/* Editable summary */}
              <div className="space-y-1.5">
                <Label>요약</Label>
                <Textarea
                  value={generated.summary}
                  onChange={(e) => updateGenerated('summary', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Editable body */}
              <div className="space-y-1.5">
                <Label>본문 (마크다운)</Label>
                <Textarea
                  value={generated.body}
                  onChange={(e) => updateGenerated('body', e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {/* Editable hashtags */}
              <div className="space-y-1.5">
                <Label>해시태그 (쉼표로 구분)</Label>
                <Input
                  value={generated.hashtags.join(', ')}
                  onChange={(e) =>
                    updateGenerated(
                      'hashtags',
                      e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                    )
                  }
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {generated.hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('settings')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  다시 설정
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  재생성
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  초안 저장
                </Button>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
