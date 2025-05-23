"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/actions/auth-actions"

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState("")

  useEffect(() => {
    (async () => {
      const { user } = await getCurrentUser()
      if (user) {
        setProfile(user.profile || {})
        setEmail(user.email || "")
      }
    })()
  }, [])

  if (!profile) return null

  return (
    <div className="max-w-lg mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">내 프로필</h1>
      <div className="space-y-4">
        <div>
          <span className="font-semibold">이름:</span> {profile.name || "-"}
        </div>
        <div>
          <span className="font-semibold">이메일:</span> {email}
        </div>
        <div>
          <span className="font-semibold">직책:</span> {profile.position || "-"}
        </div>
        <div>
          <span className="font-semibold">부서:</span> {profile.department || "-"}
        </div>
      </div>
    </div>
  )
} 