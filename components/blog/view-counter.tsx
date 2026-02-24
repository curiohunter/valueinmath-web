'use client'

import { useEffect } from 'react'

interface ViewCounterProps {
  postId: string
}

export function ViewCounter({ postId }: ViewCounterProps) {
  useEffect(() => {
    const cookieKey = `blog_viewed_${postId}`
    if (document.cookie.includes(cookieKey)) return

    document.cookie = `${cookieKey}=1; path=/; max-age=86400; SameSite=Lax`

    fetch('/api/blog/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    }).catch(() => {})
  }, [postId])

  return null
}
