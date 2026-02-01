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
      ai_global_limits: {
        Row: {
          created_at: string | null
          date: string
          id: string
          total_cost_usd: number | null
          total_requests: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          total_cost_usd?: number | null
          total_requests?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          total_cost_usd?: number | null
          total_requests?: number | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          created_at: string | null
          daily_cost_usd: number | null
          daily_count: number | null
          date: string
          hour_bucket: number | null
          hourly_count: number | null
          id: string
          last_request_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_cost_usd?: number | null
          daily_count?: number | null
          date?: string
          hour_bucket?: number | null
          hourly_count?: number | null
          id?: string
          last_request_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_cost_usd?: number | null
          daily_count?: number | null
          date?: string
          hour_bucket?: number | null
          hourly_count?: number | null
          id?: string
          last_request_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          employee_id: string | null
          employee_name_snapshot: string | null
          error_message: string | null
          estimated_cost_usd: number | null
          feature: string
          id: string
          metadata: Json | null
          model: string
          price_input_per_million: number | null
          price_output_per_million: number | null
          provider: string
          success: boolean
          target_id: string | null
          target_name_snapshot: string | null
          target_type: string | null
          tokens_input: number
          tokens_output: number
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          employee_id?: string | null
          employee_name_snapshot?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature: string
          id?: string
          metadata?: Json | null
          model: string
          price_input_per_million?: number | null
          price_output_per_million?: number | null
          provider?: string
          success?: boolean
          target_id?: string | null
          target_name_snapshot?: string | null
          target_type?: string | null
          tokens_input?: number
          tokens_output?: number
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          employee_id?: string | null
          employee_name_snapshot?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature?: string
          id?: string
          metadata?: Json | null
          model?: string
          price_input_per_million?: number | null
          price_output_per_million?: number | null
          provider?: string
          success?: boolean
          target_id?: string | null
          target_name_snapshot?: string | null
          target_type?: string | null
          tokens_input?: number
          tokens_output?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      at_risk_students_snapshots: {
        Row: {
          attendance_avg: number | null
          class_names: string | null
          created_at: string | null
          department: string | null
          focus_avg: number | null
          homework_avg: number | null
          id: string
          missing_tests: number | null
          risk_level: string
          snapshot_date: string
          student_id: string | null
          student_name: string
          teacher_id: string | null
          teacher_name: string
          test_score: number | null
          total_score: number
        }
        Insert: {
          attendance_avg?: number | null
          class_names?: string | null
          created_at?: string | null
          department?: string | null
          focus_avg?: number | null
          homework_avg?: number | null
          id?: string
          missing_tests?: number | null
          risk_level: string
          snapshot_date: string
          student_id?: string | null
          student_name: string
          teacher_id?: string | null
          teacher_name: string
          test_score?: number | null
          total_score: number
        }
        Update: {
          attendance_avg?: number | null
          class_names?: string | null
          created_at?: string | null
          department?: string | null
          focus_avg?: number | null
          homework_avg?: number | null
          id?: string
          missing_tests?: number | null
          risk_level?: string
          snapshot_date?: string
          student_id?: string | null
          student_name?: string
          teacher_id?: string | null
          teacher_name?: string
          test_score?: number | null
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "at_risk_students_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "at_risk_students_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "at_risk_students_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "at_risk_students_snapshots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
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
          makeup_class_id: string | null
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
          makeup_class_id?: string | null
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
          makeup_class_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_makeup_class_id_fkey"
            columns: ["makeup_class_id"]
            isOneToOne: false
            referencedRelation: "makeup_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          created_at: string | null
          created_by: string | null
          id: string
          participated_at: string | null
          referrer_name_snapshot: string | null
          referrer_student_id: string | null
          reward_amount: number | null
          reward_amount_type: string | null
          reward_applied_tuition_id: string | null
          reward_notes: string | null
          reward_paid_at: string | null
          reward_status: string | null
          student_id: string
          student_name_snapshot: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          participated_at?: string | null
          referrer_name_snapshot?: string | null
          referrer_student_id?: string | null
          reward_amount?: number | null
          reward_amount_type?: string | null
          reward_applied_tuition_id?: string | null
          reward_notes?: string | null
          reward_paid_at?: string | null
          reward_status?: string | null
          student_id: string
          student_name_snapshot?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          participated_at?: string | null
          referrer_name_snapshot?: string | null
          referrer_student_id?: string | null
          reward_amount?: number | null
          reward_amount_type?: string | null
          reward_applied_tuition_id?: string | null
          reward_notes?: string | null
          reward_paid_at?: string | null
          reward_status?: string | null
          student_id?: string
          student_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_referrer_student_id_fkey"
            columns: ["referrer_student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "campaign_participants_referrer_student_id_fkey"
            columns: ["referrer_student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "campaign_participants_referrer_student_id_fkey"
            columns: ["referrer_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_reward_applied_tuition_id_fkey"
            columns: ["reward_applied_tuition_id"]
            isOneToOne: false
            referencedRelation: "tuition_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "campaign_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "campaign_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments_history: {
        Row: {
          action_date: string
          action_type: Database["public"]["Enums"]["enrollment_action_type"]
          class_id: string | null
          class_name_snapshot: string | null
          created_at: string | null
          created_by: string | null
          created_by_name_snapshot: string | null
          from_class_id: string | null
          from_class_name_snapshot: string | null
          id: string
          notes: string | null
          reason: string | null
          student_id: string | null
          student_name_snapshot: string
          to_class_id: string | null
          to_class_name_snapshot: string | null
        }
        Insert: {
          action_date?: string
          action_type: Database["public"]["Enums"]["enrollment_action_type"]
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name_snapshot?: string | null
          from_class_id?: string | null
          from_class_name_snapshot?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          student_id?: string | null
          student_name_snapshot: string
          to_class_id?: string | null
          to_class_name_snapshot?: string | null
        }
        Update: {
          action_date?: string
          action_type?: Database["public"]["Enums"]["enrollment_action_type"]
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name_snapshot?: string | null
          from_class_id?: string | null
          from_class_name_snapshot?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          student_id?: string | null
          student_name_snapshot?: string
          to_class_id?: string | null
          to_class_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_history_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_history_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_enrollments_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_enrollments_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_history_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string | null
          day_of_week: string
          end_time: string
          id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          day_of_week: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          day_of_week?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
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
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
          closed_at: string | null
          closed_reason: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          monthly_fee: number | null
          name: string
          subject: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_fee?: number | null
          name: string
          subject: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
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
      comment_llm_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_code: string | null
          estimated_cost_usd: number | null
          generated_content: string | null
          id: string
          model: string
          month: number
          price_input_per_million: number | null
          price_output_per_million: number | null
          prompt_hash: string | null
          protocol_version: string | null
          provider: string
          reason: string | null
          regeneration_count: number | null
          student_id: string
          success: boolean
          teacher_id: string
          tokens_input: number
          tokens_output: number
          year: number
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          estimated_cost_usd?: number | null
          generated_content?: string | null
          id?: string
          model: string
          month: number
          price_input_per_million?: number | null
          price_output_per_million?: number | null
          prompt_hash?: string | null
          protocol_version?: string | null
          provider: string
          reason?: string | null
          regeneration_count?: number | null
          student_id: string
          success: boolean
          teacher_id: string
          tokens_input: number
          tokens_output: number
          year: number
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          estimated_cost_usd?: number | null
          generated_content?: string | null
          id?: string
          model?: string
          month?: number
          price_input_per_million?: number | null
          price_output_per_million?: number | null
          prompt_hash?: string | null
          protocol_version?: string | null
          provider?: string
          reason?: string | null
          regeneration_count?: number | null
          student_id?: string
          success?: boolean
          teacher_id?: string
          tokens_input?: number
          tokens_output?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_llm_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "comment_llm_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "comment_llm_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_llm_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_protocols: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          grade_band: string | null
          id: string
          is_active: boolean | null
          phrase: string
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          grade_band?: string | null
          id?: string
          is_active?: boolean | null
          phrase: string
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          grade_band?: string | null
          id?: string
          is_active?: boolean | null
          phrase?: string
          severity?: string | null
          updated_at?: string | null
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
      comments: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          parent_id: string
          parent_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          parent_id: string
          parent_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          parent_id?: string
          parent_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_requests: {
        Row: {
          content: string
          counselor_id: string | null
          created_at: string
          id: string
          method: string
          requester_id: string
          status: string
          student_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          counselor_id?: string | null
          created_at?: string
          id?: string
          method: string
          requester_id: string
          status?: string
          student_id: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          counselor_id?: string | null
          created_at?: string
          id?: string
          method?: string
          requester_id?: string
          status?: string
          student_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_requests_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consultation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consultation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          ai_analyzed_at: string | null
          ai_churn_risk:
            | Database["public"]["Enums"]["consultation_churn_risk"]
            | null
          ai_decision_maker:
            | Database["public"]["Enums"]["consultation_decision_maker"]
            | null
          ai_hurdle: Database["public"]["Enums"]["consultation_hurdle"] | null
          ai_readiness:
            | Database["public"]["Enums"]["consultation_readiness"]
            | null
          ai_sentiment:
            | Database["public"]["Enums"]["consultation_sentiment"]
            | null
          calendar_event_id: string | null
          content: string | null
          counselor_id: string
          counselor_name_snapshot: string | null
          created_at: string | null
          date: string
          id: string
          method: Database["public"]["Enums"]["consultation_method_enum"]
          next_action: string | null
          next_calendar_event_id: string | null
          next_date: string | null
          outcome:
            | Database["public"]["Enums"]["consultation_outcome_type"]
            | null
          outcome_date: string | null
          outcome_notes: string | null
          status: Database["public"]["Enums"]["consultation_status_enum"] | null
          student_id: string
          student_name_snapshot: string | null
          type: Database["public"]["Enums"]["consultation_type_enum"]
          updated_at: string | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_churn_risk?:
            | Database["public"]["Enums"]["consultation_churn_risk"]
            | null
          ai_decision_maker?:
            | Database["public"]["Enums"]["consultation_decision_maker"]
            | null
          ai_hurdle?: Database["public"]["Enums"]["consultation_hurdle"] | null
          ai_readiness?:
            | Database["public"]["Enums"]["consultation_readiness"]
            | null
          ai_sentiment?:
            | Database["public"]["Enums"]["consultation_sentiment"]
            | null
          calendar_event_id?: string | null
          content?: string | null
          counselor_id: string
          counselor_name_snapshot?: string | null
          created_at?: string | null
          date: string
          id?: string
          method: Database["public"]["Enums"]["consultation_method_enum"]
          next_action?: string | null
          next_calendar_event_id?: string | null
          next_date?: string | null
          outcome?:
            | Database["public"]["Enums"]["consultation_outcome_type"]
            | null
          outcome_date?: string | null
          outcome_notes?: string | null
          status?:
            | Database["public"]["Enums"]["consultation_status_enum"]
            | null
          student_id: string
          student_name_snapshot?: string | null
          type: Database["public"]["Enums"]["consultation_type_enum"]
          updated_at?: string | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_churn_risk?:
            | Database["public"]["Enums"]["consultation_churn_risk"]
            | null
          ai_decision_maker?:
            | Database["public"]["Enums"]["consultation_decision_maker"]
            | null
          ai_hurdle?: Database["public"]["Enums"]["consultation_hurdle"] | null
          ai_readiness?:
            | Database["public"]["Enums"]["consultation_readiness"]
            | null
          ai_sentiment?:
            | Database["public"]["Enums"]["consultation_sentiment"]
            | null
          calendar_event_id?: string | null
          content?: string | null
          counselor_id?: string
          counselor_name_snapshot?: string | null
          created_at?: string | null
          date?: string
          id?: string
          method?: Database["public"]["Enums"]["consultation_method_enum"]
          next_action?: string | null
          next_calendar_event_id?: string | null
          next_date?: string | null
          outcome?:
            | Database["public"]["Enums"]["consultation_outcome_type"]
            | null
          outcome_date?: string | null
          outcome_notes?: string | null
          status?:
            | Database["public"]["Enums"]["consultation_status_enum"]
            | null
          student_id?: string
          student_name_snapshot?: string | null
          type?: Database["public"]["Enums"]["consultation_type_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_next_calendar_event_id_fkey"
            columns: ["next_calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consultations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
          philosophy: string | null
          phone: string | null
          position: string | null
          resign_date: string | null
          status: string
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
          philosophy?: string | null
          phone?: string | null
          position?: string | null
          resign_date?: string | null
          status: string
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
          philosophy?: string | null
          phone?: string | null
          position?: string | null
          resign_date?: string | null
          status?: string
          subjects?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      entrance_tests: {
        Row: {
          calendar_event_id: string | null
          created_at: string | null
          id: number
          notes: string | null
          recommended_class: string | null
          status: Database["public"]["Enums"]["test_status_enum"] | null
          student_id: string | null
          test_date: string | null
          test_result: Database["public"]["Enums"]["test_result_enum"] | null
          test1_level: Database["public"]["Enums"]["test_level_enum"] | null
          test1_score: number | null
          test2_level: Database["public"]["Enums"]["test_level_enum"] | null
          test2_score: number | null
          updated_at: string | null
        }
        Insert: {
          calendar_event_id?: string | null
          created_at?: string | null
          id?: number
          notes?: string | null
          recommended_class?: string | null
          status?: Database["public"]["Enums"]["test_status_enum"] | null
          student_id?: string | null
          test_date?: string | null
          test_result?: Database["public"]["Enums"]["test_result_enum"] | null
          test1_level?: Database["public"]["Enums"]["test_level_enum"] | null
          test1_score?: number | null
          test2_level?: Database["public"]["Enums"]["test_level_enum"] | null
          test2_score?: number | null
          updated_at?: string | null
        }
        Update: {
          calendar_event_id?: string | null
          created_at?: string | null
          id?: number
          notes?: string | null
          recommended_class?: string | null
          status?: Database["public"]["Enums"]["test_status_enum"] | null
          student_id?: string | null
          test_date?: string | null
          test_result?: Database["public"]["Enums"]["test_result_enum"] | null
          test1_level?: Database["public"]["Enums"]["test_level_enum"] | null
          test1_score?: number | null
          test2_level?: Database["public"]["Enums"]["test_level_enum"] | null
          test2_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrance_tests_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrance_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "entrance_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "entrance_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          participant_id: string
          participant_type: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          participant_id: string
          participant_type: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          participant_id?: string
          participant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          days_since_previous: number | null
          event_date: string | null
          event_type: string
          from_stage: string | null
          id: string
          metadata: Json | null
          student_id: string
          to_stage: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          days_since_previous?: number | null
          event_date?: string | null
          event_type: string
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          student_id: string
          to_stage?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          days_since_previous?: number | null
          event_date?: string | null
          event_type?: string
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          student_id?: string
          to_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "funnel_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "funnel_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_channel_mapping: {
        Row: {
          default_channel: Database["public"]["Enums"]["marketing_channel"]
          description: string | null
          lead_source: string
        }
        Insert: {
          default_channel: Database["public"]["Enums"]["marketing_channel"]
          description?: string | null
          lead_source: string
        }
        Update: {
          default_channel?: Database["public"]["Enums"]["marketing_channel"]
          description?: string | null
          lead_source?: string
        }
        Relationships: []
      }
      learning_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_public: boolean | null
          month: number
          student_id: string
          teacher_id: string
          updated_at: string
          year: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          month: number
          student_id: string
          teacher_id: string
          updated_at?: string
          year: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          month?: number
          student_id?: string
          teacher_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "learning_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "learning_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_comments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      makeup_classes: {
        Row: {
          absence_calendar_event_id: string | null
          absence_date: string | null
          absence_reason:
            | Database["public"]["Enums"]["absence_reason_enum"]
            | null
          class_id: string | null
          class_name_snapshot: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          makeup_calendar_event_id: string | null
          makeup_date: string | null
          makeup_type: Database["public"]["Enums"]["makeup_type_enum"]
          notes: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["makeup_status_enum"]
          student_id: string
          student_name_snapshot: string | null
          updated_at: string | null
        }
        Insert: {
          absence_calendar_event_id?: string | null
          absence_date?: string | null
          absence_reason?:
            | Database["public"]["Enums"]["absence_reason_enum"]
            | null
          class_id?: string | null
          class_name_snapshot?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          makeup_calendar_event_id?: string | null
          makeup_date?: string | null
          makeup_type?: Database["public"]["Enums"]["makeup_type_enum"]
          notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["makeup_status_enum"]
          student_id: string
          student_name_snapshot?: string | null
          updated_at?: string | null
        }
        Update: {
          absence_calendar_event_id?: string | null
          absence_date?: string | null
          absence_reason?:
            | Database["public"]["Enums"]["absence_reason_enum"]
            | null
          class_id?: string | null
          class_name_snapshot?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          makeup_calendar_event_id?: string | null
          makeup_date?: string | null
          makeup_type?: Database["public"]["Enums"]["makeup_type_enum"]
          notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["makeup_status_enum"]
          student_id?: string
          student_name_snapshot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "makeup_classes_absence_calendar_event_id_fkey"
            columns: ["absence_calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_makeup_calendar_event_id_fkey"
            columns: ["makeup_calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "makeup_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "makeup_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_attributions: {
        Row: {
          activity_id: string | null
          attribution_type: Database["public"]["Enums"]["attribution_type"]
          confidence_score: number | null
          conversion_type: string | null
          converted_at: string | null
          created_at: string | null
          id: string
          source: string
          student_id: string
          touched_at: string | null
        }
        Insert: {
          activity_id?: string | null
          attribution_type?: Database["public"]["Enums"]["attribution_type"]
          confidence_score?: number | null
          conversion_type?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          source?: string
          student_id: string
          touched_at?: string | null
        }
        Update: {
          activity_id?: string | null
          attribution_type?: Database["public"]["Enums"]["attribution_type"]
          confidence_score?: number | null
          conversion_type?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          source?: string
          student_id?: string
          touched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_attributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "marketing_attributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "marketing_attributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          campaign_type: string
          channel: string | null
          cost_amount: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          policy_target: string | null
          reach_count: number | null
          reward_amount: number | null
          reward_amount_type: string | null
          reward_description: string | null
          reward_type: string | null
          start_date: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          campaign_type: string
          channel?: string | null
          cost_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          policy_target?: string | null
          reach_count?: number | null
          reward_amount?: number | null
          reward_amount_type?: string | null
          reward_description?: string | null
          reward_type?: string | null
          start_date: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          campaign_type?: string
          channel?: string | null
          cost_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          policy_target?: string | null
          reach_count?: number | null
          reward_amount?: number | null
          reward_amount_type?: string | null
          reward_description?: string | null
          reward_type?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_insights: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_deadline: string | null
          detail: Json | null
          expires_at: string | null
          generated_at: string | null
          id: string
          insight_type: Database["public"]["Enums"]["insight_type"]
          priority: Database["public"]["Enums"]["insight_priority"] | null
          status: string | null
          suggested_action: string | null
          summary: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_deadline?: string | null
          detail?: Json | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type: Database["public"]["Enums"]["insight_type"]
          priority?: Database["public"]["Enums"]["insight_priority"] | null
          status?: string | null
          suggested_action?: string | null
          summary: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_deadline?: string | null
          detail?: Json | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type?: Database["public"]["Enums"]["insight_type"]
          priority?: Database["public"]["Enums"]["insight_priority"] | null
          status?: string | null
          suggested_action?: string | null
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_insights_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      mathflat_records: {
        Row: {
          book_title: string | null
          correct_count: number | null
          correct_rate: number | null
          created_at: string | null
          event_date: string | null
          id: string
          mathflat_type: string | null
          problem_solved: number | null
          student_id: string | null
          student_name: string | null
          updated_at: string | null
          wrong_count: number | null
        }
        Insert: {
          book_title?: string | null
          correct_count?: number | null
          correct_rate?: number | null
          created_at?: string | null
          event_date?: string | null
          id?: string
          mathflat_type?: string | null
          problem_solved?: number | null
          student_id?: string | null
          student_name?: string | null
          updated_at?: string | null
          wrong_count?: number | null
        }
        Update: {
          book_title?: string | null
          correct_count?: number | null
          correct_rate?: number | null
          created_at?: string | null
          event_date?: string | null
          id?: string
          mathflat_type?: string | null
          problem_solved?: number | null
          student_id?: string | null
          student_name?: string | null
          updated_at?: string | null
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mathflat_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mathflat_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mathflat_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          expires_at: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "monthly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "monthly_reports_student_id_fkey"
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
      payssam_logs: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          tuition_fee_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          tuition_fee_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          tuition_fee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payssam_logs_tuition_fee_id_fkey"
            columns: ["tuition_fee_id"]
            isOneToOne: false
            referencedRelation: "tuition_fees"
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
          student_names: string[] | null
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
          student_names?: string[] | null
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
          student_names?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile_students: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          profile_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          profile_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          profile_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "profile_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "profile_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          phone: string | null
          position: string | null
          role: string | null
          student_id: string | null
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
          phone?: string | null
          position?: string | null
          role?: string | null
          student_id?: string | null
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
          phone?: string | null
          position?: string | null
          role?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          student_id: string
          title: string
          trigger_data: Json | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          student_id: string
          title: string
          trigger_data?: Json | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          student_id?: string
          title?: string
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "risk_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "risk_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      school_exam_scores: {
        Row: {
          created_at: string | null
          created_by: string | null
          exam_type: string
          exam_year: number
          grade: number
          id: string
          notes: string | null
          school_exam_id: string | null
          school_name: string
          school_type: string
          score: number | null
          semester: number
          student_id: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          exam_type: string
          exam_year: number
          grade: number
          id?: string
          notes?: string | null
          school_exam_id?: string | null
          school_name: string
          school_type: string
          score?: number | null
          semester: number
          student_id: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          exam_type?: string
          exam_year?: number
          grade?: number
          id?: string
          notes?: string | null
          school_exam_id?: string | null
          school_name?: string
          school_type?: string
          score?: number | null
          semester?: number
          student_id?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_exam_scores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_scores_school_exam_id_fkey"
            columns: ["school_exam_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exam_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "school_exam_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
          created_by: string | null
          exam_type: string
          exam_year: number
          grade: number
          id: string
          is_collected: boolean | null
          is_uploaded_to_mathflat: boolean | null
          notes: string | null
          pdf_file_path: string | null
          pdf_file_size: number | null
          school_name: string
          school_type: string
          semester: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          exam_type: string
          exam_year: number
          grade: number
          id?: string
          is_collected?: boolean | null
          is_uploaded_to_mathflat?: boolean | null
          notes?: string | null
          pdf_file_path?: string | null
          pdf_file_size?: number | null
          school_name: string
          school_type: string
          semester: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          exam_type?: string
          exam_year?: number
          grade?: number
          id?: string
          is_collected?: boolean | null
          is_uploaded_to_mathflat?: boolean | null
          notes?: string | null
          pdf_file_path?: string | null
          pdf_file_size?: number | null
          school_name?: string
          school_type?: string
          semester?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          month: number
          target_grades: string[] | null
          target_school_types: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          month: number
          target_grades?: string[] | null
          target_school_types?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          month?: number
          target_grades?: string[] | null
          target_school_types?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_risk_scores: {
        Row: {
          achievement_score: number | null
          analysis_period_end: string | null
          analysis_period_start: string | null
          attendance_score: number | null
          calculation_batch_id: string | null
          data_points: number | null
          id: string
          interaction_score: number | null
          last_calculated_at: string | null
          previous_score: number | null
          risk_level: string | null
          score_change: number | null
          score_trend: string | null
          sentiment_score: number | null
          student_id: string
          total_risk_score: number | null
        }
        Insert: {
          achievement_score?: number | null
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          attendance_score?: number | null
          calculation_batch_id?: string | null
          data_points?: number | null
          id?: string
          interaction_score?: number | null
          last_calculated_at?: string | null
          previous_score?: number | null
          risk_level?: string | null
          score_change?: number | null
          score_trend?: string | null
          sentiment_score?: number | null
          student_id: string
          total_risk_score?: number | null
        }
        Update: {
          achievement_score?: number | null
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          attendance_score?: number | null
          calculation_batch_id?: string | null
          data_points?: number | null
          id?: string
          interaction_score?: number | null
          last_calculated_at?: string | null
          previous_score?: number | null
          risk_level?: string | null
          score_change?: number | null
          score_trend?: string | null
          sentiment_score?: number | null
          student_id?: string
          total_risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_risk_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_risk_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_risk_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          id: string
          code: string
          name: string
          name_en: string | null
          school_type: string
          province: string
          district: string | null
          address: string | null
          postal_code: string | null
          phone: string | null
          website: string | null
          coed_type: string | null
          foundation_type: string | null
          high_school_type: string | null
          established_date: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          name_en?: string | null
          school_type: string
          province: string
          district?: string | null
          address?: string | null
          postal_code?: string | null
          phone?: string | null
          website?: string | null
          coed_type?: string | null
          foundation_type?: string | null
          high_school_type?: string | null
          established_date?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          name_en?: string | null
          school_type?: string
          province?: string
          district?: string | null
          address?: string | null
          postal_code?: string | null
          phone?: string | null
          website?: string | null
          coed_type?: string | null
          foundation_type?: string | null
          high_school_type?: string | null
          established_date?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_schools: {
        Row: {
          id: string
          student_id: string
          school_id: string | null
          school_name_manual: string | null
          school_type: string | null
          grade: number | null
          is_current: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          school_id?: string | null
          school_name_manual?: string | null
          school_type?: string | null
          grade?: number | null
          is_current?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          school_id?: string | null
          school_name_manual?: string | null
          school_type?: string | null
          grade?: number | null
          is_current?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_schools_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      students: {
        Row: {
          created_at: string | null
          created_by_type: string | null
          department: string | null
          end_date: string | null
          first_contact_date: string | null
          funnel_stage: string | null
          funnel_stage_updated_at: string | null
          grade: number | null
          id: string
          is_active: boolean
          lead_source: string | null
          left_at: string | null
          left_reason: string | null
          name: string
          notes: string | null
          parent_phone: string | null
          parent_phone2: string | null
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
          created_by_type?: string | null
          department?: string | null
          end_date?: string | null
          first_contact_date?: string | null
          funnel_stage?: string | null
          funnel_stage_updated_at?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean
          lead_source?: string | null
          left_at?: string | null
          left_reason?: string | null
          name: string
          notes?: string | null
          parent_phone?: string | null
          parent_phone2?: string | null
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
          created_by_type?: string | null
          department?: string | null
          end_date?: string | null
          first_contact_date?: string | null
          funnel_stage?: string | null
          funnel_stage_updated_at?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean
          lead_source?: string | null
          left_at?: string | null
          left_reason?: string | null
          name?: string
          notes?: string | null
          parent_phone?: string | null
          parent_phone2?: string | null
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
      study_logs: {
        Row: {
          attendance_status: number | null
          book1: string | null
          book1log: string | null
          book2: string | null
          book2log: string | null
          class_id: string | null
          class_name_snapshot: string | null
          created_at: string | null
          created_by: string | null
          date: string
          focus: number | null
          homework: number | null
          id: string
          last_modified_by: string | null
          note: string | null
          student_id: string | null
          student_name_snapshot: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_status?: number | null
          book1?: string | null
          book1log?: string | null
          book2?: string | null
          book2log?: string | null
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          focus?: number | null
          homework?: number | null
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_status?: number | null
          book1?: string | null
          book1log?: string | null
          book2?: string | null
          book2log?: string | null
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          focus?: number | null
          homework?: number | null
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
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
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "study_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
          class_name_snapshot: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          last_modified_by: string | null
          note: string | null
          student_id: string | null
          student_name_snapshot: string | null
          test: string | null
          test_score: number | null
          test_type: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
          test?: string | null
          test_score?: number | null
          test_type?: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
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
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "test_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
      todos: {
        Row: {
          archived_at: string | null
          assigned_name: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_fees: {
        Row: {
          amount: number
          base_amount: number | null
          class_id: string | null
          class_name_snapshot: string | null
          class_type: string
          created_at: string | null
          discount_details: Json | null
          final_amount: number | null
          id: string
          is_sibling: boolean | null
          is_split_child: boolean | null
          month: number
          note: string | null
          parent_tuition_fee_id: string | null
          payment_status: string | null
          payssam_bill_id: string | null
          payssam_cancelled_at: string | null
          payssam_destroyed_at: string | null
          payssam_last_sync_at: string | null
          payssam_paid_at: string | null
          payssam_payment_method: string | null
          payssam_raw_response: Json | null
          payssam_request_status: string | null
          payssam_sent_at: string | null
          payssam_short_url: string | null
          payssam_transaction_id: string | null
          period_end_date: string | null
          period_start_date: string | null
          student_id: string | null
          student_name_snapshot: string | null
          total_discount: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          amount: number
          base_amount?: number | null
          class_id?: string | null
          class_name_snapshot?: string | null
          class_type?: string
          created_at?: string | null
          discount_details?: Json | null
          final_amount?: number | null
          id?: string
          is_sibling?: boolean | null
          is_split_child?: boolean | null
          month: number
          note?: string | null
          parent_tuition_fee_id?: string | null
          payment_status?: string | null
          payssam_bill_id?: string | null
          payssam_cancelled_at?: string | null
          payssam_destroyed_at?: string | null
          payssam_last_sync_at?: string | null
          payssam_paid_at?: string | null
          payssam_payment_method?: string | null
          payssam_raw_response?: Json | null
          payssam_request_status?: string | null
          payssam_sent_at?: string | null
          payssam_short_url?: string | null
          payssam_transaction_id?: string | null
          period_end_date?: string | null
          period_start_date?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
          total_discount?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          base_amount?: number | null
          class_id?: string | null
          class_name_snapshot?: string | null
          class_type?: string
          created_at?: string | null
          discount_details?: Json | null
          final_amount?: number | null
          id?: string
          is_sibling?: boolean | null
          is_split_child?: boolean | null
          month?: number
          note?: string | null
          parent_tuition_fee_id?: string | null
          payment_status?: string | null
          payssam_bill_id?: string | null
          payssam_cancelled_at?: string | null
          payssam_destroyed_at?: string | null
          payssam_last_sync_at?: string | null
          payssam_paid_at?: string | null
          payssam_payment_method?: string | null
          payssam_raw_response?: Json | null
          payssam_request_status?: string | null
          payssam_sent_at?: string | null
          payssam_short_url?: string | null
          payssam_transaction_id?: string | null
          period_end_date?: string | null
          period_start_date?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
          total_discount?: number | null
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
            foreignKeyName: "tuition_fees_parent_tuition_fee_id_fkey"
            columns: ["parent_tuition_fee_id"]
            isOneToOne: false
            referencedRelation: "tuition_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "tuition_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
      student_class_mapping: {
        Row: {
          class_id: string | null
          class_name: string | null
          class_rank: number | null
          name: string | null
          student_id: string | null
          subject: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_name_mapping: {
        Row: {
          name: string | null
          status: string | null
          student_category: string | null
          student_id: string | null
        }
        Insert: {
          name?: string | null
          status?: string | null
          student_category?: never
          student_id?: string | null
        }
        Update: {
          name?: string | null
          status?: string | null
          student_category?: never
          student_id?: string | null
        }
        Relationships: []
      }
      today_study_logs: {
        Row: {
          attendance_status: number | null
          book1: string | null
          book1log: string | null
          book2: string | null
          book2log: string | null
          class_id: string | null
          class_name_snapshot: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          focus: number | null
          homework: number | null
          id: string | null
          last_modified_by: string | null
          note: string | null
          student_id: string | null
          student_name_snapshot: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_status?: number | null
          book1?: string | null
          book1log?: string | null
          book2?: string | null
          book2log?: string | null
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          focus?: number | null
          homework?: number | null
          id?: string | null
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_status?: number | null
          book1?: string | null
          book1log?: string | null
          book2?: string | null
          book2log?: string | null
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          focus?: number | null
          homework?: number | null
          id?: string | null
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
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
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "study_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
      today_test_logs: {
        Row: {
          class_id: string | null
          class_name_snapshot: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          id: string | null
          last_modified_by: string | null
          note: string | null
          student_id: string | null
          student_name_snapshot: string | null
          test: string | null
          test_score: number | null
          test_type: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string | null
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
          test?: string | null
          test_score?: number | null
          test_type?: Database["public"]["Enums"]["test_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          class_name_snapshot?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string | null
          last_modified_by?: string | null
          note?: string | null
          student_id?: string | null
          student_name_snapshot?: string | null
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
            referencedRelation: "student_class_mapping"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "test_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_name_mapping"
            referencedColumns: ["student_id"]
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
    Functions: {
      auto_map_google_sheets_data: {
        Args: never
        Returns: {
          failed_count: number
          not_found_count: number
          processed_count: number
          success_count: number
        }[]
      }
      auto_map_google_sheets_data_v2: {
        Args: never
        Returns: {
          failed_count: number
          not_found_count: number
          processed_count: number
          success_count: number
        }[]
      }
      auto_map_google_sheets_data_v3: {
        Args: never
        Returns: {
          failed_count: number
          not_found_count: number
          processed_count: number
          success_count: number
        }[]
      }
      auto_map_study_logs_data: {
        Args: never
        Returns: {
          failed_count: number
          not_found_count: number
          processed_count: number
          success_count: number
        }[]
      }
      can_access_student: {
        Args: { target_student_id: string }
        Returns: boolean
      }
      get_bottleneck_details: {
        Args: never
        Returns: {
          avg_consultations: number
          avg_days_since_last_contact: number
          avg_phone: number
          avg_text: number
          avg_visit: number
          dropout_rate: number
          stage: string
          student_count: number
        }[]
      }
      get_cohort_enrolled_details: {
        Args: { p_cohort_month: string; p_lead_source?: string }
        Returns: {
          delayed_count: number
          grade: number
          grade_label: string
          same_month_count: number
          school_type: string
          total_count: number
        }[]
      }
      get_cohort_funnel_analysis: {
        Args: { p_lead_source?: string; p_start_date?: string }
        Returns: {
          avg_days_to_enroll: number
          cohort_date: string
          cohort_month: string
          enroll_month_0: number
          enroll_month_1: number
          enroll_month_2: number
          enroll_month_3: number
          enroll_total: number
          final_conversion_rate: number
          is_ongoing: boolean
          lead_source: string
          test_month_0: number
          test_month_1: number
          test_month_2: number
          test_month_3: number
          test_total: number
          total_students: number
        }[]
      }
      get_cohort_non_enrolled_details: {
        Args: { p_cohort_month: string; p_lead_source?: string }
        Returns: {
          grade: number
          grade_label: string
          school_type: string
          total_count: number
          with_test_count: number
          without_test_count: number
        }[]
      }
      get_followup_needed_students: {
        Args: { p_stage?: string }
        Returns: {
          ai_decision_maker: string
          ai_hurdle: string
          ai_readiness: string
          ai_sentiment: string
          days_since_last_contact: number
          first_contact_date: string
          funnel_stage: string
          grade: number
          id: string
          last_consultation_date: string
          lead_source: string
          name: string
          parent_phone: string
          phone_count: number
          school: string
          school_type: string
          status: string
          student_phone: string
          text_count: number
          total_consultations: number
          visit_count: number
        }[]
      }
      get_global_messages_with_names: {
        Args: never
        Returns: {
          content: string
          created_at: string
          id: string
          message_type: string
          updated_at: string
          user_id: string
          user_name: string
        }[]
      }
      get_lead_source_funnel_metrics: {
        Args: never
        Returns: {
          avg_consultations: number
          avg_days_to_enroll: number
          enrollments: number
          first_contacts: number
          lead_source: string
          tests: number
        }[]
      }
      get_test_logs_with_avg: {
        Args: { p_end_date: string; p_start_date: string; p_student_id: string }
        Returns: {
          class_avg: number
          class_id: string
          class_name: string
          date: string
          id: string
          note: string
          overall_avg: number
          test: string
          test_score: number
          test_type: string
        }[]
      }
      get_test_scores_with_averages: {
        Args: { p_student_id: string }
        Returns: {
          class_avg: number
          class_id: string
          class_name: string
          date: string
          id: string
          note: string
          overall_avg: number
          test: string
          test_score: number
          test_type: string
        }[]
      }
      get_unread_messages_count:
        | { Args: { room_id: string; user_id: string }; Returns: number }
        | { Args: { user_uuid: string }; Returns: number }
      get_user_parent_phone: { Args: never; Returns: string }
      increment_ai_usage: {
        Args: {
          p_cost: number
          p_date: string
          p_hour: number
          p_user_id: string
        }
        Returns: undefined
      }
      increment_global_ai_usage: {
        Args: { p_cost: number; p_date: string }
        Returns: undefined
      }
      insert_mapped_study_logs: {
        Args: never
        Returns: {
          error_count: number
          inserted_count: number
          skipped_count: number
        }[]
      }
      insert_mapped_test_logs: {
        Args: never
        Returns: {
          error_count: number
          inserted_count: number
          skipped_count: number
        }[]
      }
      link_employee_to_user: {
        Args: {
          p_department: string
          p_employee_id: string
          p_employee_name: string
          p_position: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { message_ids: string[] }
        Returns: undefined
      }
      normalize_fullwidth_text: {
        Args: { input_text: string }
        Returns: string
      }
      parse_discount_from_note: { Args: { note_text: string }; Returns: Json }
      save_at_risk_snapshot: { Args: never; Returns: undefined }
      save_monthly_academy_stats: { Args: never; Returns: undefined }
      save_monthly_snapshot: { Args: never; Returns: undefined }
      trigger_monthly_academy_stats: { Args: never; Returns: string }
      trigger_monthly_snapshot: { Args: never; Returns: string }
    }
    Enums: {
      absence_reason_enum:
        | "sick"
        | "travel"
        | "event"
        | "unauthorized"
        | "other"
      attribution_type:
        | "first_touch"
        | "last_touch"
        | "ai_inferred"
        | "multi_touch"
      claude_analysis_type: "trend" | "financial" | "marketing" | "student_mgmt"
      claude_report_type: "monthly" | "quarterly" | "yearly" | "custom"
      consultation_churn_risk: "critical" | "high" | "medium" | "low" | "none"
      consultation_decision_maker: "parent" | "student" | "both"
      consultation_hurdle:
        | "schedule_conflict"
        | "competitor_comparison"
        | "student_refusal"
        | "distance"
        | "timing_defer"
        | "price"
        | "none"
        | "emotional_distress"
        | "peer_relationship"
        | "curriculum_dissatisfaction"
        | "lack_of_attention"
        | "academic_stagnation"
      consultation_method_enum: "대면" | "전화" | "문자"
      consultation_outcome_type:
        | "enrolled"
        | "enrollment_scheduled"
        | "test_scheduled"
        | "deferred"
        | "rejected"
        | "lost"
      consultation_readiness: "high" | "medium" | "low"
      consultation_sentiment:
        | "very_positive"
        | "positive"
        | "neutral"
        | "negative"
      consultation_status_enum: "예정" | "완료" | "취소"
      consultation_type_enum:
        | "신규상담"
        | "입테유도"
        | "입학후상담"
        | "입테후상담"
        | "등록유도"
        | "정기상담"
        | "퇴원상담"
      enrollment_action_type:
        | "enrolled"
        | "transferred"
        | "withdrawn"
        | "class_closed"
      event_type_enum:
        | "notice"
        | "work"
        | "makeup"
        | "absence"
        | "entrance_test"
        | "new_consultation"
        | "test_guidance"
        | "new_enrollment"
        | "regular_consultation"
        | "school_exam"
        | "last_minute_makeup"
        | "holiday"
        | "project"
        | "consultation"
        | "after_enrollment_consultation"
        | "after_test_consultation"
        | "enrollment_guidance"
        | "withdrawal_consultation"
      insight_priority: "critical" | "high" | "medium" | "low"
      insight_type:
        | "channel_performance"
        | "seasonal_reminder"
        | "content_recommendation"
        | "timing_optimization"
        | "budget_allocation"
      makeup_status_enum: "scheduled" | "completed" | "cancelled"
      makeup_type_enum: "absence" | "additional"
      marketing_channel:
        | "blog_naver"
        | "blog_other"
        | "instagram"
        | "youtube"
        | "cafe_naver"
        | "cafe_other"
        | "kakao_channel"
        | "paid_ads"
        | "seminar"
        | "student_event"
        | "parent_event"
        | "referral"
        | "flyer"
        | "seasonal_campaign"
        | "partnership"
        | "other"
        | "cafe_mom"
      marketing_status: "planned" | "in_progress" | "completed" | "cancelled"
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_reason_enum: ["sick", "travel", "event", "unauthorized", "other"],
      attribution_type: [
        "first_touch",
        "last_touch",
        "ai_inferred",
        "multi_touch",
      ],
      claude_analysis_type: ["trend", "financial", "marketing", "student_mgmt"],
      claude_report_type: ["monthly", "quarterly", "yearly", "custom"],
      consultation_churn_risk: ["critical", "high", "medium", "low", "none"],
      consultation_decision_maker: ["parent", "student", "both"],
      consultation_hurdle: [
        "schedule_conflict",
        "competitor_comparison",
        "student_refusal",
        "distance",
        "timing_defer",
        "price",
        "none",
        "emotional_distress",
        "peer_relationship",
        "curriculum_dissatisfaction",
        "lack_of_attention",
        "academic_stagnation",
      ],
      consultation_method_enum: ["대면", "전화", "문자"],
      consultation_outcome_type: [
        "enrolled",
        "enrollment_scheduled",
        "test_scheduled",
        "deferred",
        "rejected",
        "lost",
      ],
      consultation_readiness: ["high", "medium", "low"],
      consultation_sentiment: [
        "very_positive",
        "positive",
        "neutral",
        "negative",
      ],
      consultation_status_enum: ["예정", "완료", "취소"],
      consultation_type_enum: [
        "신규상담",
        "입테유도",
        "입학후상담",
        "입테후상담",
        "등록유도",
        "정기상담",
        "퇴원상담",
      ],
      enrollment_action_type: [
        "enrolled",
        "transferred",
        "withdrawn",
        "class_closed",
      ],
      event_type_enum: [
        "notice",
        "work",
        "makeup",
        "absence",
        "entrance_test",
        "new_consultation",
        "test_guidance",
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
      ],
      insight_priority: ["critical", "high", "medium", "low"],
      insight_type: [
        "channel_performance",
        "seasonal_reminder",
        "content_recommendation",
        "timing_optimization",
        "budget_allocation",
      ],
      makeup_status_enum: ["scheduled", "completed", "cancelled"],
      makeup_type_enum: ["absence", "additional"],
      marketing_channel: [
        "blog_naver",
        "blog_other",
        "instagram",
        "youtube",
        "cafe_naver",
        "cafe_other",
        "kakao_channel",
        "paid_ads",
        "seminar",
        "student_event",
        "parent_event",
        "referral",
        "flyer",
        "seasonal_campaign",
        "partnership",
        "other",
        "cafe_mom",
      ],
      marketing_status: ["planned", "in_progress", "completed", "cancelled"],
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
      ],
      test_result_enum: ["합격", "불합격"],
      test_status_enum: ["테스트예정", "결과상담대기", "결과상담완료"],
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
      ],
    },
  },
} as const
