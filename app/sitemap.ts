import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const BASE_URL = 'https://valueinmath.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseAdmin()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // Dynamic blog posts
  const { data: posts } = await supabase
    .from('content_posts')
    .select('slug, updated_at')
    .eq('content_type', 'blog')
    .eq('status', 'published')
    .not('slug', 'is', null)

  const blogPages: MetadataRoute.Sitemap = (posts || []).map((post) => ({
    url: `${BASE_URL}/blog/${encodeURIComponent(post.slug!)}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPages]
}
