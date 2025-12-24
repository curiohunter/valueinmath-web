"use server"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

interface RegistrationResult {
    success: boolean
    message?: string
    warning?: {
        type: "role_mismatch"
        suggestedRole: "parent" | "student"
        message: string
    }
}

export async function checkPhoneAndRole(phone: string, role: "parent" | "student"): Promise<RegistrationResult> {
    const adminClient = getSupabaseAdmin()
    const cleanPhone = phone.replace(/-/g, "")

    // Search students table using Admin Client to bypass RLS
    const { data: matches, error } = await adminClient
        .from("students")
        .select("student_phone, parent_phone")
        .or(`student_phone.eq.${cleanPhone},parent_phone.eq.${cleanPhone}`)

    if (error) {
        console.error("Phone check error:", error)
        return { success: false, message: "시스템 오류가 발생했습니다." }
    }

    if (!matches || matches.length === 0) {
        return { success: false, message: "학원에 등록된 정보가 없습니다.\n데스크로 문의해주세요." }
    }

    // Intelligent Role Suggestion Logic
    const hasParentMatch = matches.some((m: any) => m.parent_phone === cleanPhone)
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
    const { name, phone, role } = formData
    const cleanPhone = phone.replace(/-/g, "")

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
        .select("id, student_phone, parent_phone")
        .or(`student_phone.eq.${phone},parent_phone.eq.${phone}`)

    if (students && students.length > 0) {
        let studentsToLink: string[] = []

        if (role === "parent") {
            studentsToLink = students
                .filter((s: any) => s.parent_phone === phone)
                .map((s: any) => s.id)
        } else {
            const selfMatch = students.find((s: any) => s.student_phone === phone)
            if (selfMatch) {
                studentsToLink = [selfMatch.id]
            } else {
                studentsToLink = students
                    .filter((s: any) => s.parent_phone === phone)
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
