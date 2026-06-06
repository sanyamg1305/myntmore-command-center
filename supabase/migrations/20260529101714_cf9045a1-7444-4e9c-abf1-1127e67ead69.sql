
-- 1. Remove public-readable invites policy
DROP POLICY IF EXISTS "invites_read_by_token" ON public.invites;

-- 2. Secure RPC to fetch a single invite by token (safe fields only)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  email text,
  full_name text,
  department text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email, full_name, department, status
  FROM public.invites
  WHERE token = _token
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- 3. Secure RPC to mark an invite accepted (called by the newly signed-in user)
CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_email text;
  _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO _invite_email FROM public.invites WHERE token = _token AND status = 'pending';
  IF _invite_email IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();
  IF lower(_user_email) <> lower(_invite_email) THEN
    RETURN false;
  END IF;

  UPDATE public.invites SET status = 'accepted' WHERE token = _token;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;

-- 4. Tighten growth_initiatives INSERT to enforce created_by = auth.uid()
DROP POLICY IF EXISTS "All authenticated users can insert initiatives" ON public.growth_initiatives;
CREATE POLICY "Authenticated users can insert their own initiatives"
  ON public.growth_initiatives FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 5. Tighten growth_initiative_comments INSERT to enforce author_id = auth.uid()
DROP POLICY IF EXISTS "All authenticated users can insert comments" ON public.growth_initiative_comments;
CREATE POLICY "Authenticated users can insert their own comments"
  ON public.growth_initiative_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());
