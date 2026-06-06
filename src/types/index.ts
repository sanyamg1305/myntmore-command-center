import type { Database } from '@/integrations/supabase/types'

// Table row types
export type Client = Database['public']['Tables']['clients']['Row']
export type WeeklyData = Database['public']['Tables']['weekly_data']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
// Named MetricTarget to avoid conflict with lucide-react's Target icon
export type MetricTarget = Database['public']['Tables']['targets']['Row']
export type HealthScore = Database['public']['Tables']['client_health_scores']['Row']
export type Actionable = Database['public']['Tables']['actionables']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type CampaignWeeklyData = Database['public']['Tables']['campaign_weekly_data']['Row']
export type ContextNote = Database['public']['Tables']['client_context_notes']['Row']
export type HighScore = Database['public']['Tables']['high_scores']['Row']
export type HotLead = Database['public']['Tables']['hot_leads']['Row']
export type MyntmoreProcess = Database['public']['Tables']['myntmore_processes']['Row']
export type ProcessUpdate = Database['public']['Tables']['process_weekly_updates']['Row']
export type SalesWeeklyData = Database['public']['Tables']['sales_weekly_data']['Row']
export type TjWeeklyData = Database['public']['Tables']['tj_weekly_data']['Row']
export type MmWeeklyData = Database['public']['Tables']['mm_weekly_data']['Row']
export type ClientAlert = Database['public']['Tables']['client_alerts']['Row']
export type ClientNotification = Database['public']['Tables']['client_notifications']['Row']
export type ClientSettings = Database['public']['Tables']['client_settings']['Row']

// Joined/extended row types (Supabase selects with joins return these shapes)
export type ContextNoteWithAuthor = ContextNote & { author: Pick<Profile, 'full_name'> | null }
export type ProcessWithOwner = MyntmoreProcess & { owner: Pick<Profile, 'full_name'> | null }
export type ActionableRow = Actionable & {
  assignee?: Pick<Profile, 'id' | 'full_name'> | null
  clients?: Pick<Client, 'id' | 'name'> | null
}
export type ClientAlertRow = ClientAlert & {
  clients?: { name: string; company: string | null } | null
}
export type ClientWithManagers = Client & {
  content_manager?: Pick<Profile, 'full_name'> | null
  leadgen_manager?: Pick<Profile, 'full_name'> | null
}

// Dashboard notification shape (computed client-side)
export interface AppNotification {
  id: string
  type: 'birthday' | 'anniversary' | 'happiness_low' | 'happiness_drop'
  clientId: string
  clientName: string
  message: string
  daysUntil?: number
  severity: 'info' | 'warning' | 'critical'
}

// Partial weekly_data row (used in month-summary queries that select only a subset of columns)
export type WeeklyDataSummary = Pick<WeeklyData, 'week_start' | 'week_label' | 'content_metrics' | 'leadgen_metrics' | 'client_id' | 'content_submitted_at' | 'leadgen_submitted_at'>

// Json field as a typed record (Supabase stores these as objects in practice)
export type JsonRecord = Record<string, unknown>
