import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Calendar } from 'lucide-react'

async function getLatestPosts() {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('content_posts')
    .select('id, title, summary, slug, hashtags, published_at, created_at')
    .eq('content_type', 'blog')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(3)

  return data || []
}

export async function BlogSection() {
  const posts = await getLatestPosts()

  if (posts.length === 0) return null

  return (
    <section className="py-20 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            BLOG
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              최신
            </span>{' '}
            블로그
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            수학 학습 팁과 밸류인수학의 소식을 전합니다.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {posts.map((post) => {
            const dateStr = post.published_at || post.created_at
            const formattedDate = new Date(dateStr).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'Asia/Seoul',
            })

            return (
              <Link
                key={post.id}
                href={`/blog/${encodeURIComponent(post.slug || post.id)}`}
              >
                <Card className="group h-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Tags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.hashtags.slice(0, 2).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {post.title || '제목 없음'}
                    </h3>

                    {/* Summary */}
                    {post.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-grow mb-4">
                        {post.summary}
                      </p>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Calendar className="h-3.5 w-3.5" />
                      {formattedDate}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/blog">
            <Button
              variant="outline"
              size="lg"
              className="group"
            >
              블로그 더 보기
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
