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
            referencedRelation: "tickets"
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
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_approver: string | null
          assigned_resolver: string | null
          centre_code: string
          city: string
          created_at: string
          escalated_at: string | null
          id: string
          is_anonymous: boolean
          is_sla_breached: boolean | null
          issue_category: string
          issue_date: Json
          issue_description: string
          last_activity_at: string | null
          resolution_notes: string | null
          resolution_time_hours: number | null
          resolved_at: string | null
          resource_id: string | null
          severity: string
          sla_target_hours: number | null
          status: string
          submitted_at: string
          submitted_by: string | null
          submitted_by_user_id: string | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_approver?: string | null
          assigned_resolver?: string | null
          centre_code: string
          city: string
          created_at?: string
          escalated_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_sla_breached?: boolean | null
          issue_category: string
          issue_date: Json
          issue_description: string
          last_activity_at?: string | null
          resolution_notes?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          resource_id?: string | null
          severity: string
          sla_target_hours?: number | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          submitted_by_user_id?: string | null
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_approver?: string | null
          assigned_resolver?: string | null
          centre_code?: string
          city?: string
          created_at?: string
          escalated_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_sla_breached?: boolean | null
          issue_category?: string
          issue_date?: Json
          issue_description?: string
          last_activity_at?: string | null
          resolution_notes?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          resource_id?: string | null
          severity?: string
          sla_target_hours?: number | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          submitted_by_user_id?: string | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
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
      ticket_timeline: {
        Row: {
          id: string;
          ticket_id: string;
          event_type: string;
          old_value: string | null;
          new_value: string | null;
          performed_by: string | null;
          performed_by_name: string | null;
          performed_by_role: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          event_type: string;
          old_value?: string | null;
          new_value?: string | null;
          performed_by?: string | null;
          performed_by_name?: string | null;
          performed_by_role?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          event_type?: string;
          old_value?: string | null;
          new_value?: string | null;
          performed_by?: string | null;
          performed_by_name?: string | null;
          performed_by_role?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_timeline_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      ticket_assignees: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          role: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id: string;
          role: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string;
          role?: string;
          assigned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_assignees_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_assignees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    }
    Views: {
      ticket_analytics: {
        Row: {
          assigned_approver: string | null
          assigned_resolver: string | null
          assigned_tickets: number | null
          avg_resolution_hours: number | null
          centre_code: string | null
          city: string | null
          closed_tickets: number | null
          date_created: string | null
          in_progress_tickets: number | null
          open_tickets: number | null
          resolved_tickets: number | null
          sev1_tickets: number | null
          sev2_tickets: number | null
          sev3_tickets: number | null
          sla_breached_tickets: number | null
          total_tickets: number | null
          unassigned_tickets: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_ticket_analytics: {
        Args: Record<PropertyKey, never>
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
