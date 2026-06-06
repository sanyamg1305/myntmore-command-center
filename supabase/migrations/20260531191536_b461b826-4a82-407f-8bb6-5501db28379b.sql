
-- INVITES: ensure no direct table grants; only RPC access
REVOKE ALL ON public.invites FROM anon, authenticated;
GRANT ALL ON public.invites TO service_role;

-- CLIENT_ALERTS
DROP POLICY IF EXISTS alerts_all_auth_write ON public.client_alerts;
CREATE POLICY alerts_admin_or_assigned_write ON public.client_alerts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned(auth.uid(), client_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_assigned(auth.uid(), client_id));

-- CLIENT_CONTEXT_NOTES
DROP POLICY IF EXISTS notes_all_auth_write ON public.client_context_notes;
CREATE POLICY notes_insert_auth ON public.client_context_notes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY notes_update_author_or_admin ON public.client_context_notes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY notes_delete_author_or_admin ON public.client_context_notes
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- CLIENT_HEALTH_SCORES
DROP POLICY IF EXISTS health_all_auth_write ON public.client_health_scores;
CREATE POLICY health_admin_or_assigned_write ON public.client_health_scores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned(auth.uid(), client_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_assigned(auth.uid(), client_id));

-- HOT_LEADS
DROP POLICY IF EXISTS leads_open ON public.hot_leads;
CREATE POLICY leads_insert_owner ON public.hot_leads
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY leads_update_owner_or_admin ON public.hot_leads
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY leads_delete_owner_or_admin ON public.hot_leads
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY leads_select_auth ON public.hot_leads
  FOR SELECT TO authenticated USING (true);

-- MYNTMORE_PROCESSES
DROP POLICY IF EXISTS processes_open ON public.myntmore_processes;
CREATE POLICY processes_select_auth ON public.myntmore_processes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY processes_insert_self ON public.myntmore_processes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY processes_update_owner_or_admin ON public.myntmore_processes
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY processes_delete_owner_or_admin ON public.myntmore_processes
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- TARGETS: read for all auth, write admin-only
DROP POLICY IF EXISTS targets_all_auth ON public.targets;
DROP POLICY IF EXISTS targets_all_auth_write ON public.targets;
-- keep targets_all_auth_read
CREATE POLICY targets_admin_write ON public.targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
