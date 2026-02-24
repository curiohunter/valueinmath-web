import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/portal/', '/api/', '/login', '/auth/'],
      },
    ],
    sitemap: 'https://valueinmath.com/sitemap.xml',
  }
}
