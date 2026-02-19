-- Invite code required for registration (no email confirmation; code gates signup)

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INT DEFAULT NULL,
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invite_codes IS 'Codes required to register. max_uses NULL = unlimited; expires_at NULL = never expires.';

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only service role / backend can manage codes; anon cannot read (validation is in trigger)
CREATE POLICY "invite_codes_service_only"
  ON public.invite_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Validate code: exists, not expired, under max_uses
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN FALSE;
  END IF;
  SELECT code, max_uses, use_count, expires_at INTO r
  FROM public.invite_codes
  WHERE code = trim(p_code)
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  IF r.max_uses IS NOT NULL AND r.use_count >= r.max_uses THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

-- Consume one use of the code (call after user is created)
CREATE OR REPLACE FUNCTION public.use_invite_code(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN;
  END IF;
  UPDATE public.invite_codes
  SET use_count = use_count + 1
  WHERE code = trim(p_code);
END;
$$;

-- Require and validate invite code on signup (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.auth_require_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_code TEXT;
BEGIN
  inv_code := NEW.raw_user_meta_data->>'invite_code';
  IF inv_code IS NULL OR trim(inv_code) = '' THEN
    RAISE EXCEPTION 'Invite code is required to register'
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.validate_invite_code(inv_code) THEN
    RAISE EXCEPTION 'Invalid or expired invite code'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_require_invite_code_trigger ON auth.users;
CREATE TRIGGER auth_require_invite_code_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auth_require_invite_code();

-- After user is created, consume one use of the code
CREATE OR REPLACE FUNCTION public.auth_use_invite_code_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.use_invite_code(NEW.raw_user_meta_data->>'invite_code');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_use_invite_code_after_insert_trigger ON auth.users;
CREATE TRIGGER auth_use_invite_code_after_insert_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auth_use_invite_code_after_insert();

-- Seed one default invite code (change or add more via Supabase dashboard / SQL)
INSERT INTO public.invite_codes (code, max_uses, expires_at)
VALUES ('treeflow', NULL, NULL)
ON CONFLICT (code) DO NOTHING;
