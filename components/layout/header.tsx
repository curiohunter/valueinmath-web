"use client"

import { Bell, User, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser, withdrawUser } from "@/actions/auth-actions"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import GlobalChatButton from "@/components/chat/GlobalChatButton"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "@/components/layout/notification-bell"

export function Header({ setChatOpen }: { setChatOpen: (open: boolean) => void }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { user } = await getCurrentUser()
      console.log('Header: User 로드됨:', user)
      setUser(user)
    })()
  }, [])

  return (
    <>
      <header className="border-b bg-background">
        <div className="flex h-16 items-center px-6">
          <div className="flex flex-1 items-center gap-4 md:gap-8">{/* 전체 검색 입력 필드 제거 */}</div>
          <div className="flex items-center gap-2">
            <NotificationBell user={user} />
            <GlobalChatButton user={user} asHeaderIcon onClick={() => {
              console.log('Header: 채팅 버튼 클릭됨!');
              setChatOpen(true);
            }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  프로필
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {/* TODO: 로그아웃 함수 연결 */}}>
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  )
}

// 읽기 전용 프로필 다이얼로그 컴포넌트
function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState("")
  // 2단계 다이얼로그 상태
  const [withdrawStep, setWithdrawStep] = useState<0 | 1 | 2>(0) // 0: 닫힘, 1: 1차, 2: 2차
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => {
    if (!open) return
    (async () => {
      const { user } = await getCurrentUser()
      if (user) {
        setProfile(user.profile || {})
        setEmail(user.email || "")
      }
    })()
  }, [open])

  // 1차 다이얼로그 열기
  function openWithdrawStep1() {
    setWithdrawStep(1)
  }
  // 1차에서 "예" 클릭 시 2차로
  function handleWithdrawStep1Yes() {
    setWithdrawStep(2)
  }
  // 1차에서 "아니오" 클릭 시 닫기
  function handleWithdrawStep1No() {
    setWithdrawStep(0)
  }
  // 2차에서 "취소" 클릭 시 닫기
  function handleWithdrawStep2Cancel() {
    setWithdrawStep(0)
  }
  // 2차에서 "탈퇴하기" 클릭 시(테스트용)
  async function handleWithdraw() {
    setWithdrawing(true)
    try {
      const res = await withdrawUser()
      if (res?.success) {
        window.location.href = "/login"
      } else {
        alert(res?.error || "탈퇴 중 오류가 발생했습니다.")
      }
    } catch (e) {
      alert("탈퇴 중 예기치 않은 오류가 발생했습니다.")
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>내 프로필</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <span className="font-semibold">이름:</span> {profile?.name || "-"}
            </div>
            <div>
              <span className="font-semibold">이메일:</span> {email}
            </div>
            <div>
              <span className="font-semibold">직책:</span> {profile?.position || "-"}
            </div>
            <div>
              <span className="font-semibold">부서:</span> {profile?.department || "-"}
            </div>
          </div>
          <div className="pt-4 border-t flex justify-end">
            <Button variant="destructive" onClick={openWithdrawStep1}>
              사이트 탈퇴
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* 1차 경고 다이얼로그 */}
      <AlertDialog open={withdrawStep === 1} onOpenChange={v => setWithdrawStep(v ? 1 : 0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말로 탈퇴하시겠습니까?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="py-2 text-sm text-destructive font-semibold">
            이 작업은 <b>되돌릴 수 없습니다.</b> 그래도 진행하시겠습니까?
          </p>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleWithdrawStep1No} disabled={withdrawing}>
              아니오
            </Button>
            <Button variant="destructive" onClick={handleWithdrawStep1Yes} disabled={withdrawing}>
              예
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 2차 최종 확인 다이얼로그 */}
      <AlertDialog open={withdrawStep === 2} onOpenChange={v => setWithdrawStep(v ? 2 : 0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>최종 확인</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="py-2">탈퇴 시 계정 및 모든 데이터가 <b>즉시 삭제</b>되며, 복구할 수 없습니다.<br />계속 진행하시겠습니까?</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWithdrawStep2Cancel} disabled={withdrawing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={withdrawing} className="bg-destructive text-white">
              {withdrawing ? "탈퇴 중..." : "탈퇴하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
