-- Change 1: Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  name text NOT NULL,
  icp_description text,
  message_narrative text,
  status text DEFAULT 'active', -- 'active' | 'paused' | 'completed'
  started_date date,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_open" ON public.campaigns FOR ALL USING (auth.role() = 'authenticated');

-- Change 1: Campaign Weekly Data Table
CREATE TABLE IF NOT EXISTS public.campaign_weekly_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id),
  client_id uuid REFERENCES public.clients(id),
  week_start date NOT NULL,
  week_end date NOT NULL,
  week_label text,
  conn_requests_sent integer DEFAULT 0,
  accepted integer DEFAULT 0,
  acceptance_rate numeric GENERATED ALWAYS AS (
    CASE WHEN conn_requests_sent > 0 
    THEN ROUND((accepted::numeric / conn_requests_sent) * 100, 1) 
    ELSE 0 END
  ) STORED,
  answered integer DEFAULT 0,
  response_rate numeric GENERATED ALWAYS AS (
    CASE WHEN accepted > 0 
    THEN ROUND((answered::numeric / accepted) * 100, 1) 
    ELSE 0 END
  ) STORED,
  positive_replies integer DEFAULT 0,
  negative_replies integer DEFAULT 0,
  hot_leads integer DEFAULT 0,
  meetings_booked integer DEFAULT 0,
  existing_conn_sent integer DEFAULT 0,
  existing_conn_replied integer DEFAULT 0,
  notes text,
  submitted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, week_start)
);

ALTER TABLE public.campaign_weekly_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_data_open" ON public.campaign_weekly_data FOR ALL USING (auth.role() = 'authenticated');

-- Change 6: Add columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS myntmore_start_date date,
ADD COLUMN IF NOT EXISTS starting_linkedin_followers integer DEFAULT 0;

-- Change 6: Client Notifications Table
CREATE TABLE IF NOT EXISTS public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  notification_type text NOT NULL, -- 'birthday' | 'work_anniversary'
  trigger_date date NOT NULL, -- the actual date this year it triggers
  message text NOT NULL,
  is_dismissed boolean DEFAULT false,
  dismissed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_open" ON public.client_notifications FOR ALL USING (auth.role() = 'authenticated');
