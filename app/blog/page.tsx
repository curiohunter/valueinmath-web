import { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogPagination } from '@/components/blog/blog-pagination'

export const metadata: Metadata = {
  title: '블로그 | 밸류인수학학원',
  description: '광진구 수학전문학원 밸류인수학의 학습 팁, 수학 공부법, 학원 소식을 블로그에서 만나보세요.',
  openGraph: {
    title: '블로그 | 밸류인수학학원',
    description: '광진구 수학전문학원 밸류인수학의 학습 팁, 수학 공부법, 학원 소식',
    url: 'https://valueinmath.com/blog',
    siteName: '밸류인수학학원',
    locale: 'ko_KR',
    type: 'website',
  },
}

const POSTS_PER_PAGE = 9

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10))
  const offset = (currentPage - 1) * POSTS_PER_PAGE

  const supabase = getSupabaseAdmin()

  // Total count for pagination
  const { count } = await supabase
    .from('content_posts')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'blog')
    .eq('status', 'published')

  const totalPages = Math.ceil((count || 0) / POSTS_PER_PAGE)

  // Fetch posts for current page
  const { data: posts } = await supabase
    .from('content_posts')
    .select('id, title, summary, slug, hashtags, published_at, created_at, view_count')
    .eq('content_type', 'blog')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + POSTS_PER_PAGE - 1)

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            BLOG
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              밸류인
            </span>{' '}
            블로그
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            수학 학습 팁, 공부법, 학원 소식을 전합니다.
          </p>
        </div>

        {/* Posts Grid */}
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.id}
                title={post.title || '제목 없음'}
                summary={post.summary}
                slug={post.slug || post.id}
                publishedAt={post.published_at}
                createdAt={post.created_at}
                viewCount={post.view_count || 0}
                hashtags={post.hashtags || []}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              아직 게시된 글이 없습니다.
            </p>
          </div>
        )}

        {/* Pagination */}
        <BlogPagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </section>
  )
}
