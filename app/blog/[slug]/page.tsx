import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Eye } from 'lucide-react'
import { BlogContent } from '@/components/blog/blog-content'
import { ViewCounter } from '@/components/blog/view-counter'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

async function getPost(slug: string) {
  const supabase = getSupabaseAdmin()
  const decodedSlug = decodeURIComponent(slug)

  const { data } = await supabase
    .from('content_posts')
    .select('*')
    .eq('slug', decodedSlug)
    .eq('content_type', 'blog')
    .eq('status', 'published')
    .single()

  return data
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return { title: '글을 찾을 수 없습니다 | 밸류인수학학원' }
  }

  return {
    title: `${post.title} | 밸류인수학학원 블로그`,
    description: post.summary || post.body?.slice(0, 160) || '',
    openGraph: {
      title: post.title || '',
      description: post.summary || post.body?.slice(0, 160) || '',
      url: `https://valueinmath.com/blog/${encodeURIComponent(post.slug || post.id)}`,
      siteName: '밸류인수학학원',
      locale: 'ko_KR',
      type: 'article',
      publishedTime: post.published_at || post.created_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title || '',
      description: post.summary || post.body?.slice(0, 160) || '',
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const dateStr = post.published_at || post.created_at
  const formattedDate = new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  })

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="mb-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            블로그 목록
          </Button>
        </Link>

        {/* Header */}
        <header className="mb-10">
          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.hashtags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            {post.title}
          </h1>

          {post.summary && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              {post.summary}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pb-6 border-b border-gray-200 dark:border-gray-700">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              조회 {(post.view_count || 0).toLocaleString()}
            </span>
          </div>
        </header>

        {/* View counter (cookie-based dedup) */}
        <ViewCounter postId={post.id} />

        {/* Body */}
        {post.body && <BlogContent content={post.body} />}

        {/* Footer navigation */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <Link href="/blog">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              블로그 목록으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
