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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actionables: {
        Row: {
          assignee_id: string | null
          assigner_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          title: string
          week_start: string | null
        }
        Insert: {
          assignee_id?: string | null
          assigner_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          title: string
          week_start?: string | null
        }
        Update: {
          assignee_id?: string | null
          assigner_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          title?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actionables_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actionables_assigner_id_fkey"
            columns: ["assigner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actionables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_weekly_data: {
        Row: {
          acceptance_rate: number | null
          accepted: number | null
          answered: number | null
          campaign_id: string | null
          client_id: string | null
          conn_requests_sent: number | null
          created_at: string | null
          existing_conn_replied: number | null
          existing_conn_sent: number | null
          hot_leads: number | null
          id: string
          meetings_booked: number | null
          negative_replies: number | null
          notes: string | null
          positive_replies: number | null
          response_rate: number | null
          submitted_by: string | null
          week_end: string
          week_label: string | null
          week_start: string
        }
        Insert: {
          acceptance_rate?: number | null
          accepted?: number | null
          answered?: number | null
          campaign_id?: string | null
          client_id?: string | null
          conn_requests_sent?: number | null
          created_at?: string | null
          existing_conn_replied?: number | null
          existing_conn_sent?: number | null
          hot_leads?: number | null
          id?: string
          meetings_booked?: number | null
          negative_replies?: number | null
          notes?: string | null
          positive_replies?: number | null
          response_rate?: number | null
          submitted_by?: string | null
          week_end: string
          week_label?: string | null
          week_start: string
        }
        Update: {
          acceptance_rate?: number | null
          accepted?: number | null
          answered?: number | null
          campaign_id?: string | null
          client_id?: string | null
          conn_requests_sent?: number | null
          created_at?: string | null
          existing_conn_replied?: number | null
          existing_conn_sent?: number | null
          hot_leads?: number | null
          id?: string
          meetings_booked?: number | null
          negative_replies?: number | null
          notes?: string | null
          positive_replies?: number | null
          response_rate?: number | null
          submitted_by?: string | null
          week_end?: string
          week_label?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_weekly_data_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_weekly_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_weekly_data_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          icp_description: string | null
          id: string
          message_narrative: string | null
          name: string
          started_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          icp_description?: string | null
          id?: string
          message_narrative?: string | null
          name: string
          started_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          icp_description?: string | null
          id?: string
          message_narrative?: string | null
          name?: string
          started_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_alerts: {
        Row: {
          alert_message: string | null
          alert_type: string | null
          client_id: string | null
          created_at: string | null
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          week_start: string | null
        }
        Insert: {
          alert_message?: string | null
          alert_type?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          week_start?: string | null
        }
        Update: {
          alert_message?: string | null
          alert_type?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          client_id: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_context_notes: {
        Row: {
          client_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_context_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_context_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health_scores: {
        Row: {
          client_id: string | null
          health_score: number | null
          id: string
          on_track_streak: number | null
          posts_on_target_streak: number | null
          previous_score: number | null
          score_breakdown: Json | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          client_id?: string | null
          health_score?: number | null
          id?: string
          on_track_streak?: number | null
          posts_on_target_streak?: number | null
          previous_score?: number | null
          score_breakdown?: Json | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          client_id?: string | null
          health_score?: number | null
          id?: string
          on_track_streak?: number | null
          posts_on_target_streak?: number | null
          previous_score?: number | null
          score_breakdown?: Json | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_health_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          client_id: string | null
          created_at: string | null
          dismissed_by: string | null
          event_date: string | null
          id: string
          is_dismissed: boolean | null
          message: string
          notification_type: string
          trigger_date: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          dismissed_by?: string | null
          event_date?: string | null
          id?: string
          is_dismissed?: boolean | null
          message: string
          notification_type: string
          trigger_date: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          dismissed_by?: string | null
          event_date?: string | null
          id?: string
          is_dismissed?: boolean | null
          message?: string
          notification_type?: string
          trigger_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_settings: {
        Row: {
          active_content_metrics: string[] | null
          active_leadgen_metrics: string[] | null
          client_id: string | null
          custom_targets: Json | null
          id: string
          updated_at: string | null
        }
        Insert: {
          active_content_metrics?: string[] | null
          active_leadgen_metrics?: string[] | null
          client_id?: string | null
          custom_targets?: Json | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          active_content_metrics?: string[] | null
          active_leadgen_metrics?: string[] | null
          client_id?: string | null
          custom_targets?: Json | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birthday: string | null
          company: string | null
          content_manager_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          leadgen_manager_id: string | null
          myntmore_start_date: string | null
          name: string
          starting_linkedin_followers: number | null
          status: string | null
        }
        Insert: {
          birthday?: string | null
          company?: string | null
          content_manager_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          leadgen_manager_id?: string | null
          myntmore_start_date?: string | null
          name: string
          starting_linkedin_followers?: number | null
          status?: string | null
        }
        Update: {
          birthday?: string | null
          company?: string | null
          content_manager_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          leadgen_manager_id?: string | null
          myntmore_start_date?: string | null
          name?: string
          starting_linkedin_followers?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_content_manager_id_fkey"
            columns: ["content_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_leadgen_manager_id_fkey"
            columns: ["leadgen_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number | null
          category: string | null
          id: string
          month: string
          notes: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          id?: string
          month: string
          notes?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          id?: string
          month?: string
          notes?: string | null
        }
        Relationships: []
      }
      finance_data: {
        Row: {
          client_id: string | null
          date_received: string | null
          id: string
          month: string
          monthly_fee: number | null
          notes: string | null
          payment_status: string | null
        }
        Insert: {
          client_id?: string | null
          date_received?: string | null
          id?: string
          month: string
          monthly_fee?: number | null
          notes?: string | null
          payment_status?: string | null
        }
        Update: {
          client_id?: string | null
          date_received?: string | null
          id?: string
          month?: string
          monthly_fee?: number | null
          notes?: string | null
          payment_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_initiative_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          initiative_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          initiative_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          initiative_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_initiative_comments_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "growth_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_initiatives: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_effort: string | null
          estimated_impact: string | null
          id: string
          owner_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_effort?: string | null
          estimated_impact?: string | null
          id?: string
          owner_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_effort?: string | null
          estimated_impact?: string | null
          id?: string
          owner_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      high_scores: {
        Row: {
          achieved_week: string | null
          client_id: string | null
          id: string
          lifetime_high: number | null
          metric_id: string
          metric_name: string | null
          previous_high: number | null
          updated_at: string | null
        }
        Insert: {
          achieved_week?: string | null
          client_id?: string | null
          id?: string
          lifetime_high?: number | null
          metric_id: string
          metric_name?: string | null
          previous_high?: number | null
          updated_at?: string | null
        }
        Update: {
          achieved_week?: string | null
          client_id?: string | null
          id?: string
          lifetime_high?: number | null
          metric_id?: string
          metric_name?: string | null
          previous_high?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "high_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_leads: {
        Row: {
          company: string | null
          created_at: string | null
          deal_value: number | null
          id: string
          lead_name: string
          notes: string | null
          owner_id: string | null
          probability: number | null
          source: string | null
          status: string | null
          updated_at: string | null
          weighted_value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          deal_value?: number | null
          id?: string
          lead_name: string
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          weighted_value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          deal_value?: number | null
          id?: string
          lead_name?: string
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          weighted_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hot_leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          blockers: string | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          percent_complete: number | null
          status: string | null
          target_date: string | null
          week_updates: Json | null
        }
        Insert: {
          blockers?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          percent_complete?: number | null
          status?: string | null
          target_date?: string | null
          week_updates?: Json | null
        }
        Update: {
          blockers?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          percent_complete?: number | null
          status?: string | null
          target_date?: string | null
          week_updates?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          department: string
          email: string
          full_name: string
          id: string
          invited_by: string | null
          role: string | null
          status: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          department: string
          email: string
          full_name: string
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_weekly_data: {
        Row: {
          created_at: string | null
          id: string
          instagram: Json | null
          linkedin: Json | null
          quora: Json | null
          reddit: Json | null
          submitted_by: string | null
          website: Json | null
          week_end: string
          week_label: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram?: Json | null
          linkedin?: Json | null
          quora?: Json | null
          reddit?: Json | null
          submitted_by?: string | null
          website?: Json | null
          week_end: string
          week_label?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram?: Json | null
          linkedin?: Json | null
          quora?: Json | null
          reddit?: Json | null
          submitted_by?: string | null
          website?: Json | null
          week_end?: string
          week_label?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "mm_weekly_data_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      myntmore_processes: {
        Row: {
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          owner_id: string | null
          priority: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "myntmore_processes_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myntmore_processes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myntmore_processes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      process_weekly_updates: {
        Row: {
          created_at: string | null
          id: string
          process_id: string | null
          submitted_by: string | null
          update_text: string
          week_label: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          process_id?: string | null
          submitted_by?: string | null
          update_text: string
          week_label?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          process_id?: string | null
          submitted_by?: string | null
          update_text?: string
          week_label?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_weekly_updates_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "myntmore_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_weekly_updates_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          disabled: boolean | null
          email: string | null
          full_name: string | null
          id: string
          invite_status: string | null
          invited_by: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          disabled?: boolean | null
          email?: string | null
          full_name?: string | null
          id: string
          invite_status?: string | null
          invited_by?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          disabled?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          invite_status?: string | null
          invited_by?: string | null
          role?: string | null
        }
        Relationships: []
      }
      sales_weekly_data: {
        Row: {
          cold_email: Json | null
          created_at: string | null
          id: string
          jahnvi_outreach: Json | null
          meeting_tracker: Json | null
          shirin_outreach: Json | null
          submitted_by: string | null
          tj_outreach: Json | null
          week_end: string
          week_label: string | null
          week_start: string
        }
        Insert: {
          cold_email?: Json | null
          created_at?: string | null
          id?: string
          jahnvi_outreach?: Json | null
          meeting_tracker?: Json | null
          shirin_outreach?: Json | null
          submitted_by?: string | null
          tj_outreach?: Json | null
          week_end: string
          week_label?: string | null
          week_start: string
        }
        Update: {
          cold_email?: Json | null
          created_at?: string | null
          id?: string
          jahnvi_outreach?: Json | null
          meeting_tracker?: Json | null
          shirin_outreach?: Json | null
          submitted_by?: string | null
          tj_outreach?: Json | null
          week_end?: string
          week_label?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_weekly_data_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          metric_id: string
          period: string
          target_type: string | null
          target_value: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          metric_id: string
          period: string
          target_type?: string | null
          target_value?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          metric_id?: string
          period?: string
          target_type?: string | null
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tj_channel_assignments: {
        Row: {
          channel: string
          id: string
          owner_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          channel: string
          id?: string
          owner_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          channel?: string
          id?: string
          owner_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tj_channel_assignments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tj_channel_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tj_weekly_data: {
        Row: {
          created_at: string | null
          email_newsletter: Json | null
          id: string
          instagram: Json | null
          linkedin_newsletter: Json | null
          podcast: Json | null
          submitted_by: string | null
          video_pipeline: Json | null
          week_end: string
          week_label: string | null
          week_start: string
          youtube: Json | null
        }
        Insert: {
          created_at?: string | null
          email_newsletter?: Json | null
          id?: string
          instagram?: Json | null
          linkedin_newsletter?: Json | null
          podcast?: Json | null
          submitted_by?: string | null
          video_pipeline?: Json | null
          week_end: string
          week_label?: string | null
          week_start: string
          youtube?: Json | null
        }
        Update: {
          created_at?: string | null
          email_newsletter?: Json | null
          id?: string
          instagram?: Json | null
          linkedin_newsletter?: Json | null
          podcast?: Json | null
          submitted_by?: string | null
          video_pipeline?: Json | null
          week_end?: string
          week_label?: string | null
          week_start?: string
          youtube?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tj_weekly_data_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_data: {
        Row: {
          client_id: string | null
          content_metrics: Json | null
          content_submitted_at: string | null
          content_submitted_by: string | null
          created_at: string | null
          id: string
          leadgen_metrics: Json | null
          leadgen_submitted_at: string | null
          leadgen_submitted_by: string | null
          week_end: string
          week_label: string | null
          week_start: string
        }
        Insert: {
          client_id?: string | null
          content_metrics?: Json | null
          content_submitted_at?: string | null
          content_submitted_by?: string | null
          created_at?: string | null
          id?: string
          leadgen_metrics?: Json | null
          leadgen_submitted_at?: string | null
          leadgen_submitted_by?: string | null
          week_end: string
          week_label?: string | null
          week_start: string
        }
        Update: {
          client_id?: string | null
          content_metrics?: Json | null
          content_submitted_at?: string | null
          content_submitted_by?: string | null
          created_at?: string | null
          id?: string
          leadgen_metrics?: Json | null
          leadgen_submitted_at?: string | null
          leadgen_submitted_by?: string | null
          week_end?: string
          week_label?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_data_content_submitted_by_fkey"
            columns: ["content_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_data_leadgen_submitted_by_fkey"
            columns: ["leadgen_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _token: string }; Returns: boolean }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          department: string
          email: string
          full_name: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
