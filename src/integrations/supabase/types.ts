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
      assignment_log: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_from: string | null
          assigned_to: string
          assignment_type: string
          id: string
          ticket_id: string
          workload_at_assignment: number | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to: string
          assignment_type?: string
          id?: string
          ticket_id: string
          workload_at_assignment?: number | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string
          assignment_type?: string
          id?: string
          ticket_id?: string
          workload_at_assignment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_log_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          ticket_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          ticket_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          ticket_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_attachments: {
        Row: {
          comment_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          comment_id: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          comment_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author: string
          author_role: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author: string
          author_role: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_log: {
        Row: {
          escalated_at: string
          escalated_by: string | null
          escalated_to: string | null
          escalation_details: Json | null
          escalation_type: string
          id: string
          response_details: Json | null
          response_received_at: string | null
          ticket_id: string
        }
        Insert: {
          escalated_at?: string
          escalated_by?: string | null
          escalated_to?: string | null
          escalation_details?: Json | null
          escalation_type: string
          id?: string
          response_details?: Json | null
          response_received_at?: string | null
          ticket_id: string
        }
        Update: {
          escalated_at?: string
          escalated_by?: string | null
          escalated_to?: string | null
          escalation_details?: Json | null
          escalation_type?: string
          id?: string
          response_details?: Json | null
          response_received_at?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_log_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          calculated_at: string
          id: string
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          id?: string
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          id?: string
          metric_type?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      status_transitions: {
        Row: {
          allowed_roles: string[]
          created_at: string | null
          from_status: Database["public"]["Enums"]["ticket_status_new"]
          id: string
          requires_comment: boolean | null
          to_status: Database["public"]["Enums"]["ticket_status_new"]
        }
        Insert: {
          allowed_roles: string[]
          created_at?: string | null
          from_status: Database["public"]["Enums"]["ticket_status_new"]
          id?: string
          requires_comment?: boolean | null
          to_status: Database["public"]["Enums"]["ticket_status_new"]
        }
        Update: {
          allowed_roles?: string[]
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["ticket_status_new"]
          id?: string
          requires_comment?: boolean | null
          to_status?: Database["public"]["Enums"]["ticket_status_new"]
        }
        Relationships: []
      }
      test_center_details: {
        Row: {
          address: string | null
          created_at: string
          id: number
          test_center_city: string | null
          test_center_code: number | null
          test_center_name: string | null
          test_center_poc: string | null
          test_center_state: string | null
          test_center_zone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: number
          test_center_city?: string | null
          test_center_code?: number | null
          test_center_name?: string | null
          test_center_poc?: string | null
          test_center_state?: string | null
          test_center_zone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: number
          test_center_city?: string | null
          test_center_code?: number | null
          test_center_name?: string | null
          test_center_poc?: string | null
          test_center_state?: string | null
          test_center_zone?: string | null
        }
        Relationships: []
      }
      ticket_admin_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          ticket_admin_id: string
          ticket_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          ticket_admin_id: string
          ticket_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          ticket_admin_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_admin_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_admin_assignments_ticket_admin_id_fkey"
            columns: ["ticket_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_admin_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_admin_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assignees: {
        Row: {
          assigned_at: string | null
          id: string
          performed_by: string | null
          role: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          performed_by?: string | null
          role: string
          ticket_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          performed_by?: string | null
          role?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignees_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action_type: string
          details: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          performed_at: string
          performed_by: string
          performed_by_role: string
          ticket_id: string
        }
        Insert: {
          action_type: string
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by: string
          performed_by_role: string
          ticket_id: string
        }
        Update: {
          action_type?: string
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string
          performed_by_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_timeline: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          performed_by_name: string | null
          performed_by_role: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_timeline_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_timeline_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_timeline_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          awign_app_ticket_id: string | null
          centre_code: string
          city: string
          created_at: string
          deleted: boolean
          escalated_at: string | null
          id: string
          is_anonymous: boolean
          is_sla_breached: boolean | null
          is_testing: boolean | null
          issue_category: string
          issue_date: Json
          issue_description: string
          last_activity_at: string | null
          last_reopened_at: string | null
          reopen_count: number | null
          reopened_by: string | null
          resolution_notes: string | null
          resolution_time_hours: number | null
          resolved_at: string | null
          resource_id: string
          severity: string
          sla_target_hours: number | null
          status: Database["public"]["Enums"]["ticket_status_new"]
          status_changed_at: string | null
          status_changed_by: string | null
          submitted_at: string
          submitted_by: string | null
          submitted_by_user_id: string | null
          ticket_number: string
          updated_at: string
          user_dependency_started_at: string | null
        }
        Insert: {
          awign_app_ticket_id?: string | null
          centre_code: string
          city: string
          created_at?: string
          deleted?: boolean
          escalated_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_sla_breached?: boolean | null
          is_testing?: boolean | null
          issue_category: string
          issue_date: Json
          issue_description: string
          last_activity_at?: string | null
          last_reopened_at?: string | null
          reopen_count?: number | null
          reopened_by?: string | null
          resolution_notes?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          resource_id: string
          severity: string
          sla_target_hours?: number | null
          status: Database["public"]["Enums"]["ticket_status_new"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          submitted_at?: string
          submitted_by?: string | null
          submitted_by_user_id?: string | null
          ticket_number: string
          updated_at?: string
          user_dependency_started_at?: string | null
        }
        Update: {
          awign_app_ticket_id?: string | null
          centre_code?: string
          city?: string
          created_at?: string
          deleted?: boolean
          escalated_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_sla_breached?: boolean | null
          is_testing?: boolean | null
          issue_category?: string
          issue_date?: Json
          issue_description?: string
          last_activity_at?: string | null
          last_reopened_at?: string | null
          reopen_count?: number | null
          reopened_by?: string | null
          resolution_notes?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          resource_id?: string
          severity?: string
          sla_target_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status_new"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          submitted_at?: string
          submitted_by?: string | null
          submitted_by_user_id?: string | null
          ticket_number?: string
          updated_at?: string
          user_dependency_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          centre_code: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          last_activity_at: string | null
          last_login_at: string | null
          mobile_number: string
          name: string
          pin: string
          pin_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          centre_code?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          last_login_at?: string | null
          mobile_number: string
          name: string
          pin: string
          pin_hash: string
          role?: string
          updated_at?: string
        }
        Update: {
          centre_code?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          last_login_at?: string | null
          mobile_number?: string
          name?: string
          pin?: string
          pin_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      ticket_analytics: {
        Row: {
          assigned_to_approver: number | null
          assigned_to_resolver: number | null
          city: string | null
          severity: string | null
          status: Database["public"]["Enums"]["ticket_status_new"] | null
          ticket_count: number | null
        }
        Relationships: []
      }
      ticket_details_view: {
        Row: {
          assigned_approver: string | null
          assigned_approver_name: string | null
          assigned_approver_role: string | null
          assigned_resolver: string | null
          assigned_resolver_name: string | null
          assigned_resolver_role: string | null
          assigned_ticket_admin: string | null
          assigned_ticket_admin_name: string | null
          assigned_ticket_admin_role: string | null
          awign_app_ticket_id: string | null
          centre_code: string | null
          city: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          issue_category: string | null
          issue_date: Json | null
          issue_description: string | null
          last_reopened_at: string | null
          reopen_count: number | null
          reopened_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resource_id: string | null
          severity: string | null
          status: Database["public"]["Enums"]["ticket_status_new"] | null
          status_changed_at: string | null
          status_changed_by: string | null
          submitted_at: string | null
          submitted_by: string | null
          submitted_by_user_id: string | null
          ticket_number: string | null
          updated_at: string | null
          user_dependency_started_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_resolve_user_dependency_tickets: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_past_user_dependency_tickets: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      log_ticket_history: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_new_value?: string
          p_old_value?: string
          p_performed_by?: string
          p_performed_by_role?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      log_timeline_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_new_value?: string
          p_old_value?: string
          p_performed_by?: string
          p_performed_by_name?: string
          p_performed_by_role?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      login_with_mobile_pin: {
        Args: { p_mobile_number: string; p_pin: string }
        Returns: {
          centre_code: string
          city: string
          id: string
          is_active: boolean
          mobile_number: string
          name: string
          role: string
        }[]
      }
      refresh_ticket_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      register_user_with_mobile_pin: {
        Args: {
          p_centre_code?: string
          p_city?: string
          p_mobile_number: string
          p_name: string
          p_pin: string
        }
        Returns: {
          centre_code: string
          city: string
          error_message: string
          id: string
          is_active: boolean
          mobile_number: string
          name: string
          role: string
          success: boolean
        }[]
      }
      validate_assignment_permission: {
        Args: { p_assignment_role: string; p_user_role: string }
        Returns: boolean
      }
      validate_status_transition: {
        Args: {
          p_from_status: Database["public"]["Enums"]["ticket_status_new"]
          p_ticket_id: string
          p_to_status: Database["public"]["Enums"]["ticket_status_new"]
          p_user_role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ticket_status_new:
        | "open"
        | "in_progress"
        | "send_for_approval"
        | "approved"
        | "resolved"
        | "ops_input_required"
        | "user_dependency"
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
      ticket_status_new: [
        "open",
        "in_progress",
        "send_for_approval",
        "approved",
        "resolved",
        "ops_input_required",
        "user_dependency",
      ],
    },
  },
} as const
