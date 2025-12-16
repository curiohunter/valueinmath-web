import { redirect } from "next/navigation"

// 회원가입 페이지는 더 이상 사용하지 않음 - 로그인 페이지로 리다이렉트
export default function SignupPage() {
  redirect("/login")
}
