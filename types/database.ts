export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      academy_monthly_stats: {
        Row: {
          active_students_by_dept: Json | null
          active_students_mom_change: number | null
          active_students_total: number | null
          collected_at: string | null
          consultations_by_dept: Json | null
          consultations_total: number | null
          consultations_yoy_change: number | null
          created_at: string | null
          enrollment_conversion_rate: number | null
          entrance_tests_by_dept: Json | null
          entrance_tests_total: number | null
          id: string
          month: number
          new_enrollments_by_dept: Json | null
          new_enrollments_total: number | null
          test_conversion_rate: number | null
          updated_at: string | null
          withdrawals_by_dept: Json | null
          withdrawals_total: number | null
          withdrawals_yoy_change: number | null
          year: number
        }
        Insert: {
          active_students_by_dept?: Json | null
          active_students_mom_change?: number | null
          active_students_total?: number | null
          collected_at?: string | null
          consultations_by_dept?: Json | null
          consultations_total?: number | null
          consultations_yoy_change?: number | null
          created_at?: string | null
          enrollment_conversion_rate?: number | null
          entrance_tests_by_dept?: Json | null
          entrance_tests_total?: number | null
          id?: string
          month: number
          new_enrollments_by_dept?: Json | null
          new_enrollments_total?: number | null
          test_conversion_rate?: number | null
          updated_at?: string | null
          withdrawals_by_dept?: Json | null
          withdrawals_total?: number | null
          withdrawals_yoy_change?: number | null
          year: number
        }
        Update: {
          active_students_by_dept?: Json | null
          active_students_mom_change?: number | null
          active_students_total?: number | null
          collected_at?: string | null
          consultations_by_dept?: Json | null
          consultations_total?: number | null
          consultations_yoy_change?: number | null
          created_at?: string | null
          enrollment_conversion_rate?: number | null
          entrance_tests_by_dept?: Json | null
          entrance_tests_total?: number | null
          id?: string
          month?: number
          new_enrollments_by_dept?: Json | null
          new_enrollments_total?: number | null
          test_conversion_rate?: number | null
          updated_at?: string | null
          withdrawals_by_dept?: Json | null
          withdrawals_total?: number | null
          withdrawals_yoy_change?: number | null
          year?: number
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "learning_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          consultation_date: string
          consultation_method:
          | Database["public"]["Enums"]["consultation_method_enum"]
          | null
          consultation_status:
          | Database["public"]["Enums"]["consultation_status_enum"]
          | null
          consultation_type:
          | Database["public"]["Enums"]["consultation_type_enum"]
          | null
          content: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          consultation_date: string
          consultation_method?:
          | Database["public"]["Enums"]["consultation_method_enum"]
          | null
          consultation_status?:
          | Database["public"]["Enums"]["consultation_status_enum"]
          | null
          consultation_type?:
          | Database["public"]["Enums"]["consultation_type_enum"]
          | null
          content?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          consultation_date?: string
          consultation_method?:
          | Database["public"]["Enums"]["consultation_method_enum"]
          | null
          consultation_status?:
          | Database["public"]["Enums"]["consultation_status_enum"]
          | null
          consultation_type?:
          | Database["public"]["Enums"]["consultation_type_enum"]
          | null
          content?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          auth_id: string | null
          created_at: string | null
          department: string | null
          experience: string | null
          hire_date: string | null
          id: string
          is_public: boolean | null
          last_updated_date: string | null
          name: string
          notes: string | null
          phone: string | null
          philosophy: string | null
          position: string | null
          resign_date: string | null
          status: string | null
          subjects: string[] | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          experience?: string | null
          hire_date?: string | null
          id?: string
          is_public?: boolean | null
          last_updated_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          philosophy?: string | null
          position?: string | null
          resign_date?: string | null
          status?: string | null
          subjects?: string[] | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          experience?: string | null
          hire_date?: string | null
          id?: string
          is_public?: boolean | null
          last_updated_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          philosophy?: string | null
          position?: string | null
          resign_date?: string | null
          status?: string | null
          subjects?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_comments: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          is_edited: boolean
          parent_id: string | null
          record_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          record_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          record_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "learning_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_comments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "learning_records"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_records: {
        Row: {
          attendance_status: string
          class_date: string
          class_type: string
          created_at: string | null
          employee_id: string | null
          end_time: string
          id: string
          learning_content: string | null
          start_time: string
          student_id: string | null
          test_score: number | null
          updated_at: string | null
        }
        Insert: {
          attendance_status: string
          class_date: string
          class_type: string
          created_at?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          learning_content?: string | null
          start_time: string
          student_id?: string | null
          test_score?: number | null
          updated_at?: string | null
        }
        Update: {
          attendance_status?: string
          class_date?: string
          class_type?: string
          created_at?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          learning_content?: string | null
          start_time?: string
          student_id?: string | null
          test_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          is_read: boolean
          related_id: string | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          is_all_day: boolean | null
          location: string | null
          recurrence_rule: string | null
          related_id: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          related_id?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          related_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      school_exam_scores: {
        Row: {
          created_at: string | null
          exam_id: string | null
          id: string
          math_score: number | null
          rank_in_class: number | null
          rank_in_school: number | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_id?: string | null
          id?: string
          math_score?: number | null
          rank_in_class?: number | null
          rank_in_school?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_id?: string | null
          id?: string
          math_score?: number | null
          rank_in_class?: number | null
          rank_in_school?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_exam_scores_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_exams: {
        Row: {
          created_at: string | null
          exam_date: string
          exam_name: string
          grade: number
          id: string
          school_name: string
          semester: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          exam_date: string
          exam_name: string
          grade: number
          id?: string
          school_name: string
          semester: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          exam_date?: string
          exam_name?: string
          grade?: number
          id?: string
          school_name?: string
          semester?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string | null
          created_by_type: string
          department: string | null
          end_date: string | null
          first_contact_date: string | null
          grade: number | null
          has_sibling: boolean | null
          id: string
          lead_source: string | null
          name: string
          notes: string | null
          parent_phone: string | null
          payment_phone: string | null
          school: string | null
          school_type: string | null
          start_date: string | null
          status: string
          student_phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_type?: string
          department?: string | null
          end_date?: string | null
          first_contact_date?: string | null
          grade?: number | null
          has_sibling?: boolean | null
          id?: string
          lead_source?: string | null
          name: string
          notes?: string | null
          parent_phone?: string | null
          payment_phone?: string | null
          school?: string | null
          school_type?: string | null
          start_date?: string | null
          status: string
          student_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_type?: string
          department?: string | null
          end_date?: string | null
          first_contact_date?: string | null
          grade?: number | null
          has_sibling?: boolean | null
          id?: string
          lead_source?: string | null
          name?: string
          notes?: string | null
          parent_phone?: string | null
          payment_phone?: string | null
          school?: string | null
          school_type?: string | null
          start_date?: string | null
          status?: string
          student_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          created_at: string | null
          exam_date: string
          id: string
          memo: string | null
          score: number | null
          student_id: string | null
          test_level: Database["public"]["Enums"]["test_level_enum"] | null
          test_name: string
          test_result: Database["public"]["Enums"]["test_result_enum"] | null
          test_status: Database["public"]["Enums"]["test_status_enum"] | null
          test_type: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_date: string
          id?: string
          memo?: string | null
          score?: number | null
          student_id?: string | null
          test_level?: Database["public"]["Enums"]["test_level_enum"] | null
          test_name: string
          test_result?: Database["public"]["Enums"]["test_result_enum"] | null
          test_status?: Database["public"]["Enums"]["test_status_enum"] | null
          test_type?: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_date?: string
          id?: string
          memo?: string | null
          score?: number | null
          student_id?: string | null
          test_level?: Database["public"]["Enums"]["test_level_enum"] | null
          test_name?: string
          test_result?: Database["public"]["Enums"]["test_result_enum"] | null
          test_status?: Database["public"]["Enums"]["test_status_enum"] | null
          test_type?: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_academy_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_students: number
          total_employees: number
          total_consultations: number
          new_students_this_month: number
        }[]
      }
      get_monthly_stats: {
        Args: {
          target_year: number
          target_month: number
        }
        Returns: {
          active_students_total: number
          active_students_mom_change: number
          active_students_by_dept: Json
          new_enrollments_total: number
          new_enrollments_by_dept: Json
          enrollment_conversion_rate: number
          withdrawals_total: number
          withdrawals_yoy_change: number
          withdrawals_by_dept: Json
          consultations_total: number
          consultations_yoy_change: number
          consultations_by_dept: Json
          entrance_tests_total: number
          entrance_tests_by_dept: Json
          test_conversion_rate: number
        }[]
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      attendance_status_enum: ["출석", "지각", "결석", "보강"]
      class_type_enum: ["정규수업", "보강", "특강"]
      comparison_period_enum: ["monthly", "quarterly", "yearly", "custom"]
      consultation_method_enum: ["대면", "전화", "문자"]
      consultation_status_enum: ["예정", "완료", "취소"]
      consultation_type_enum: [
        "신규상담",
        "입학후상담",
        "입테후상담",
        "등록유도",
        "정기상담",
        "퇴원상담",
      ]
      event_type_enum: [
        "notice",
        "work",
        "makeup",
        "absence",
        "entrance_test",
        "new_consultation",
        "new_enrollment",
        "regular_consultation",
        "school_exam",
        "last_minute_makeup",
        "holiday",
        "project",
        "consultation",
        "after_enrollment_consultation",
        "after_test_consultation",
        "enrollment_guidance",
        "withdrawal_consultation",
      ]
      makeup_status_enum: ["scheduled", "completed", "cancelled"]
      makeup_type_enum: ["absence", "additional"]
      test_level_enum: [
        "초3-1",
        "초3-2",
        "초4-1",
        "초4-2",
        "초5-1",
        "초5-2",
        "초6-1",
        "초6-2",
        "중1-1",
        "중1-2",
        "중2-1",
        "중2-2",
        "중3-1",
        "중3-2",
        "공통수학1",
        "공통수학2",
        "대수",
        "미적분",
        "확통",
      ]
      test_result_enum: ["합격", "불합격"]
      test_status_enum: ["테스트예정", "결과상담대기", "결과상담완료"]
      test_type_enum: [
        "과정총괄테스트",
        "내용암기테스트",
        "단원테스트",
        "모의고사",
        "서술형평가",
        "수학경시대회",
        "오답테스트",
        "내신기출유사",
        "내신기출",
        "학교시험점수",
      ]
    }
  }
} as const
