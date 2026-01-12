"use server"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

interface RegistrationResult {
    success: boolean
    message?: string
    employeeId?: string
    warning?: {
        type: "role_mismatch"
        suggestedRole: "parent" | "student"
        message: string
    }
}

// 직원 연락처 확인
export async function checkEmployeePhone(phone: string): Promise<RegistrationResult> {
    const adminClient = getSupabaseAdmin()
    const cleanPhone = phone.replace(/-/g, "")

    // employees 테이블에서 연락처 확인 (재직 중인 직원만)
    const { data: employee, error } = await adminClient
        .from("employees")
        .select("id, name, phone, auth_id, status")
        .eq("phone", cleanPhone)
        .eq("status", "재직")
        .single()

    if (error || !employee) {
        return {
            success: false,
            message: "등록된 직원 정보가 없습니다.\n원장님께 직원 등록을 요청해주세요."
        }
    }

    // 이미 다른 계정과 연결된 경우
    if (employee.auth_id) {
        return {
            success: false,
            message: "이미 가입된 연락처입니다.\n기존 계정으로 로그인해주세요."
        }
    }

    return { success: true, employeeId: employee.id }
}

export async function checkPhoneAndRole(phone: string, role: "parent" | "student"): Promise<RegistrationResult> {
    const adminClient = getSupabaseAdmin()
    const cleanPhone = phone.replace(/-/g, "")

    // Search students table using Admin Client to bypass RLS
    const { data: matches, error } = await adminClient
        .from("students")
        .select("student_phone, parent_phone, parent_phone2")
        .or(`student_phone.eq.${cleanPhone},parent_phone.eq.${cleanPhone},parent_phone2.eq.${cleanPhone}`)

    if (error) {
        console.error("Phone check error:", error)
        return { success: false, message: "시스템 오류가 발생했습니다." }
    }

    if (!matches || matches.length === 0) {
        return { success: false, message: "학원에 등록된 정보가 없습니다.\n데스크로 문의해주세요." }
    }

    // Intelligent Role Suggestion Logic
    const hasParentMatch = matches.some((m: any) => m.parent_phone === cleanPhone || m.parent_phone2 === cleanPhone)
    const hasStudentMatch = matches.some((m: any) => m.student_phone === cleanPhone)

    if (role === "student" && hasParentMatch && !hasStudentMatch) {
        return {
            success: true,
            warning: {
                type: "role_mismatch",
                suggestedRole: "parent",
                message: "입력하신 번호는 학부모님 연락처로 확인됩니다.\n학부모님으로 가입하시겠습니까? (권장)"
            }
        }
    }

    if (role === "parent" && hasStudentMatch && !hasParentMatch) {
        return {
            success: true,
            warning: {
                type: "role_mismatch",
                suggestedRole: "student",
                message: "입력하신 번호는 학생 연락처로 확인됩니다.\n학생 본인이신가요?"
            }
        }
    }

    return { success: true }
}

export async function registerUser(formData: any) {
    const supabase = await createClient()
    const { name, email, password, phone, role } = formData
    const cleanPhone = phone.replace(/-/g, "")

    // 1. Re-validate Phone (Security)
    const { success } = await checkPhoneAndRole(cleanPhone, role)
    if (!success) {
        return { error: "유효하지 않은 정보입니다." }
    }

    // 2. Sign Up (Must use Public/User context)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                phone: cleanPhone,
                role,
                approval_status: 'approved', // Auto-approve
            },
        },
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: "회원가입 실패" }

    const userId = authData.user.id

    // 3. Update Profile (Phone)
    await supabase.from("profiles").update({ phone: cleanPhone }).eq("id", userId)

    // 4. Auto-Match Logic
    await matchStudentToUser(userId, cleanPhone, role)

    return { success: true }
}

export async function completeRegistration(userId: string, formData: any) {
    const supabase = await createClient()
    const adminClient = getSupabaseAdmin()
    const { name, phone, role } = formData
    const cleanPhone = phone.replace(/-/g, "")

    // 직원인 경우
    if (role === "employee") {
        // 1. Validate Employee Phone
        const checkResult = await checkEmployeePhone(cleanPhone)
        if (!checkResult.success) {
            return { error: checkResult.message }
        }

        // 2. Update Profile
        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                name,
                phone: cleanPhone,
                role,
                approval_status: 'approved'
            })
            .eq("id", userId)

        if (profileError) return { error: profileError.message }

        // 3. Link Employee to User (auth_id 연결)
        const { error: employeeError } = await adminClient
            .from("employees")
            .update({ auth_id: userId })
            .eq("id", checkResult.employeeId!)

        if (employeeError) {
            console.error("Employee link error:", employeeError)
            return { error: "직원 정보 연결에 실패했습니다." }
        }

        return { success: true }
    }

    // 학생/학부모인 경우
    // 1. Validate Phone
    const { success } = await checkPhoneAndRole(cleanPhone, role)
    if (!success) {
        return { error: "학원에 등록된 정보가 없습니다. 데스크로 문의해주세요." }
    }

    // 2. Update Profile (User context)
    const { error: profileError } = await supabase
        .from("profiles")
        .update({
            name,
            phone: cleanPhone,
            role,
            approval_status: 'approved'
        })
        .eq("id", userId)

    if (profileError) return { error: profileError.message }

    // 3. Auto-Match Logic
    await matchStudentToUser(userId, cleanPhone, role)

    return { success: true }
}

// Helper function to match students - uses ADMIN client
async function matchStudentToUser(userId: string, phone: string, role: string) {
    const adminClient = getSupabaseAdmin()

    // Lookup students (Admin)
    const { data: students } = await adminClient
        .from("students")
        .select("id, student_phone, parent_phone, parent_phone2")
        .or(`student_phone.eq.${phone},parent_phone.eq.${phone},parent_phone2.eq.${phone}`)

    if (students && students.length > 0) {
        let studentsToLink: string[] = []

        if (role === "parent") {
            studentsToLink = students
                .filter((s: any) => s.parent_phone === phone || s.parent_phone2 === phone)
                .map((s: any) => s.id)
        } else {
            const selfMatch = students.find((s: any) => s.student_phone === phone)
            if (selfMatch) {
                studentsToLink = [selfMatch.id]
            } else {
                studentsToLink = students
                    .filter((s: any) => s.parent_phone === phone || s.parent_phone2 === phone)
                    .map((s: any) => s.id)
            }
        }

        studentsToLink = Array.from(new Set(studentsToLink))

        if (studentsToLink.length > 0) {
            const links = studentsToLink.map((sid: string, idx: number) => ({
                profile_id: userId,
                student_id: sid,
                is_primary: idx === 0
            }))

            // Admin insert into profile_students
            await adminClient.from("profile_students").insert(links)

            // Admin update profile student_id
            await adminClient.from("profiles").update({ student_id: studentsToLink[0] }).eq("id", userId)
        }
    }
}
