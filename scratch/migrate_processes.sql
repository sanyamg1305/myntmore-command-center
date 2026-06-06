-- Phase 1: Update Departments
UPDATE public.profiles SET department = 'both' WHERE department IS NOT NULL;
UPDATE public.invites SET department = 'both' WHERE department IS NOT NULL;

-- Phase 2: Create Processes Tables
CREATE TABLE public.myntmore_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    owner_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.process_weekly_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES public.myntmore_processes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    update_text TEXT NOT NULL,
    submitted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(process_id, week_start)
);

-- RLS Policies
ALTER TABLE public.myntmore_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_weekly_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.myntmore_processes
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for all authenticated users" ON public.myntmore_processes
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON public.process_weekly_updates
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for all authenticated users" ON public.process_weekly_updates
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
