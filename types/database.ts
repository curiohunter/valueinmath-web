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
      agents: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
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
          name: string
          subject: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          subject: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
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
      messages: {
        Row: {
          chat_id: string | null
          content: string | null
          created_at: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          chat_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          chat_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
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
          registration_date: string | null
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
          registration_date?: string | null
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
          registration_date?: string | null
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
          date: string
          focus: number | null
          homework: number | null
          id: string
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
          date: string
          focus?: number | null
          homework?: number | null
          id?: string
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
          date?: string
          focus?: number | null
          homework?: number | null
          id?: string
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
          date: string
          id: string
          note: string | null
          student_id: string | null
          test: string | null
          test_score: number | null
          test_type: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          note?: string | null
          student_id?: string | null
          test?: string | null
          test_score?: number | null
          test_type?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          note?: string | null
          student_id?: string | null
          test?: string | null
          test_score?: number | null
          test_type?: string | null
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
            foreignKeyName: "test_logs_student_id_fkey"
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
      get_unread_messages_count: {
        Args: { room_id: string; user_id: string } | { user_uuid: string }
        Returns: number
      }
      link_employee_to_user: {
        Args: {
          p_employee_id: string
          p_user_id: string
          p_employee_name: string
          p_position: string
          p_department: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
