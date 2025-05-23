"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { linkEmployeeToUser, checkAdminAccess } from "@/actions/link-employee"

interface Employee {
  id: string
  name: string
  position: string
  department: string
  auth_id: string | null
}

interface User {
  id: string
  email: string
  name: string
}

export default function LinkEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // 관리자 권한 확인 및 데이터 로드
  useEffect(() => {
    async function checkAccessAndLoadData() {
      setIsLoading(true)

      // 관리자 권한 확인
      const { isAdmin, message } = await checkAdminAccess()
      setIsAdmin(isAdmin)

      if (!isAdmin) {
        setErrorMessage(message)
        setIsLoading(false)
        return
      }

      // 직원 목록 가져오기
      const { data: employeesData, error: empError } = await supabase.from("employees").select("*").order("name")

      if (empError) {
        console.error("Error fetching employees:", empError)
        setErrorMessage("직원 정보를 불러오는 중 오류가 발생했습니다.")
        setIsLoading(false)
        return
      }

      // 사용자 목록 가져오기
      const { data: authUsers, error: authError } = await supabase.from("profiles").select("id, name")

      if (authError) {
        console.error("Error fetching users:", authError)
        setErrorMessage("사용자 정보를 불러오는 중 오류가 발생했습니다.")
        setIsLoading(false)
        return
      }

      // 사용자 이메일 정보 가져오기 (관리자만 가능)
      const { data: usersWithEmail, error: emailError } = await supabase.auth.admin.listUsers()

      let usersData: User[] = []

      if (emailError || !usersWithEmail) {
        // 관리자 API 접근 권한이 없는 경우, 이메일 없이 프로필 정보만 표시
        usersData = authUsers.map((user) => ({
          id: user.id,
          name: user.name || "이름 없음",
          email: "이메일 정보 없음",
        }))
      } else {
        // 프로필과 이메일 정보 결합
        usersData = usersWithEmail.users.map((user) => ({
          id: user.id,
          email: user.email || "이메일 없음",
          name: authUsers.find((p) => p.id === user.id)?.name || user.user_metadata?.name || "이름 없음",
        }))
      }

      setEmployees(employeesData || [])
      setUsers(usersData)
      setIsLoading(false)
    }

    checkAccessAndLoadData()
  }, [])

  // 직원과 사용자 연결 처리
  const handleLinkUser = async (employeeId: string, userId: string | null) => {
    try {
      const result = await linkEmployeeToUser(employeeId, userId)

      if (result.success) {
        toast({
          title: "연결 성공",
          description: "직원과 사용자 계정이 성공적으로 연결되었습니다.",
        })

        // 직원 목록 업데이트
        setEmployees((prev) => prev.map((emp) => (emp.id === employeeId ? { ...emp, auth_id: userId } : emp)))
      } else {
        throw new Error(result.error || "연결 실패")
      }
    } catch (error) {
      console.error("Error linking employee and user:", error)
      toast({
        title: "연결 실패",
        description: "직원과 사용자 계정 연결 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 로딩 중 표시
  if (isLoading) {
    return <div className="p-8 text-center">로딩 중...</div>
  }

  // 관리자가 아닌 경우 접근 거부 메시지 표시
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>접근 권한 없음</AlertTitle>
          <AlertDescription>
            {errorMessage || "이 페이지에 접근할 권한이 없습니다. 관리자에게 문의하세요."}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push("/")}>홈으로 돌아가기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>직원과 사용자 계정 연결</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-4">
              <p>등록된 직원이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원 이름</TableHead>
                  <TableHead>직책</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>연결 상태</TableHead>
                  <TableHead>사용자 계정</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const linkedUser = users.find((u) => u.id === employee.auth_id)

                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position || "-"}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        {employee.auth_id ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            <span>연결됨</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">연결되지 않음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {linkedUser ? (
                          <div>
                            <div>{linkedUser.name}</div>
                            <div className="text-xs text-muted-foreground">{linkedUser.email}</div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={employee.auth_id || ""}
                          onValueChange={(value) => handleLinkUser(employee.id, value || null)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="계정 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unlink">연결 해제</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
