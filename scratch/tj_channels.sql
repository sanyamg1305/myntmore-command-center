-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.tj_channel_assignments (
    channel text NOT NULL PRIMARY KEY,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.profiles(id),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.tj_channel_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.tj_channel_assignments;
CREATE POLICY "Allow authenticated read access" 
ON public.tj_channel_assignments FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update" ON public.tj_channel_assignments;
CREATE POLICY "Allow authenticated insert/update" 
ON public.tj_channel_assignments FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
