export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type_enum"] | null
          google_calendar_id: string | null
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type_enum"] | null
          google_calendar_id?: string | null
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"] | null
          google_calendar_id?: string | null
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          monthly_fee: number | null
          name: string
          subject: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          monthly_fee?: number | null
          name: string
          subject: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          monthly_fee?: number | null
          name?: string
          subject?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      claude_insights: {
        Row: {
          analysis_type: Database["public"]["Enums"]["claude_analysis_type"]
          confidence_score: number | null
          content: string
          created_at: string | null
          data_period: Json | null
          id: string
          metadata: Json | null
          recommendations: Json | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          analysis_type: Database["public"]["Enums"]["claude_analysis_type"]
          confidence_score?: number | null
          content: string
          created_at?: string | null
          data_period?: Json | null
          id?: string
          metadata?: Json | null
          recommendations?: Json | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          analysis_type?: Database["public"]["Enums"]["claude_analysis_type"]
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          data_period?: Json | null
          id?: string
          metadata?: Json | null
          recommendations?: Json | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          auth_id: string | null
          created_at: string | null
          department: string | null
          hire_date: string | null
          id: string
          last_updated_date: string | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          resign_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          last_updated_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          resign_date?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          last_updated_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          resign_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      global_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      message_read_status: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "global_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          month: number
          monthly_stats: Json | null
          report_content: string
          student_id: string | null
          teacher_comment: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          month: number
          monthly_stats?: Json | null
          report_content: string
          student_id?: string | null
          teacher_comment?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          month?: number
          monthly_stats?: Json | null
          report_content?: string
          student_id?: string | null
          teacher_comment?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
          status: string | null
          student_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          role: string
          status?: string | null
          student_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          status?: string | null
          student_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string | null
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          name: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id: string
          name?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          name?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string | null
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
          school: string | null
          school_type: string | null
          start_date: string | null
          status: string
          student_phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
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
          school?: string | null
          school_type?: string | null
          start_date?: string | null
          status: string
          student_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
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
          school?: string | null
          school_type?: string | null
          start_date?: string | null
          status?: string
          student_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          attendance_status: number | null
          book1: string | null
          book1log: string | null
          book2: string | null
          book2log: string | null
          class_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          focus: number | null
          homework: number | null
          id: string
          last_modified_by: string | null
          note: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_status?: number | null
          book1?: string | null
          book1log?: string | null
          book2?: string | null
          book2log?: string | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          focus?: number | null
          homework?: number | null
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_status?: number | null
          book1?: string | null
          book1log?: string | null
          book2?: string | null
          book2log?: string | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          focus?: number | null
          homework?: number | null
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      test_logs: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          last_modified_by: string | null
          note: string | null
          student_id: string | null
          test: string | null
          test_score: number | null
          test_type: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          test?: string | null
          test_score?: number | null
          test_type?: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          test?: string | null
          test_score?: number | null
          test_type?: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_logs_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_fees: {
        Row: {
          amount: number
          class_id: string | null
          class_type: string
          created_at: string | null
          id: string
          is_sibling: boolean | null
          month: number
          note: string | null
          payment_date: string | null
          payment_status: string | null
          student_id: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          amount: number
          class_id?: string | null
          class_type?: string
          created_at?: string | null
          id?: string
          is_sibling?: boolean | null
          month: number
          note?: string | null
          payment_date?: string | null
          payment_status?: string | null
          student_id?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          class_id?: string | null
          class_type?: string
          created_at?: string | null
          id?: string
          is_sibling?: boolean | null
          month?: number
          note?: string | null
          payment_date?: string | null
          payment_status?: string | null
          student_id?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tuition_fees_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_fees_student_id_fkey"
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
      [_ in never]: never
    }
    Enums: {
      claude_analysis_type: "trend" | "financial" | "marketing" | "student_mgmt"
      claude_report_type: "monthly" | "quarterly" | "yearly" | "custom"
      event_type_enum:
        | "notice"
        | "work"
        | "makeup"
        | "absence"
        | "entrance_test"
        | "new_consultation"
        | "new_enrollment"
        | "regular_consultation"
        | "school_exam"
        | "last_minute_makeup"
        | "holiday"
        | "project"
      test_level_enum:
        | "초3-1"
        | "초3-2"
        | "초4-1"
        | "초4-2"
        | "초5-1"
        | "초5-2"
        | "초6-1"
        | "초6-2"
        | "중1-1"
        | "중1-2"
        | "중2-1"
        | "중2-2"
        | "중3-1"
        | "중3-2"
        | "공통수학1"
        | "공통수학2"
        | "대수"
        | "미적분"
        | "확통"
      test_result_enum: "합격" | "불합격"
      test_status_enum: "테스트예정" | "결과상담대기" | "결과상담완료"
      test_type_enum:
        | "과정총괄테스트"
        | "내용암기테스트"
        | "단원테스트"
        | "모의고사"
        | "서술형평가"
        | "수학경시대회"
        | "오답테스트"
        | "내신기출유사"
        | "내신기출"
        | "학교시험점수"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never