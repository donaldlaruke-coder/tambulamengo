
-- 1. Campaign settings: restrict bank fields from public reads
DROP POLICY IF EXISTS campaign_public_read ON public.campaign_settings;
CREATE POLICY campaign_public_read_anon ON public.campaign_settings
  FOR SELECT TO anon USING (true);
CREATE POLICY campaign_admin_read ON public.campaign_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.campaign_settings FROM anon;
GRANT SELECT (id, campaign_name, tagline, story, goal_amount, event_date, event_details, updated_at)
  ON public.campaign_settings TO anon;

-- 2. Transactions: restrict payment-provider references from public reads
REVOKE SELECT ON public.transactions FROM anon;
GRANT SELECT (id, amount, type, payment_method, message, is_anonymous, donor_display_name,
              confirmed_at, created_at, currency, status, donor_id)
  ON public.transactions TO anon;

-- 3. Kit order items: require a fresh pending kit transaction
DROP POLICY IF EXISTS koi_insert_anyone ON public.kit_order_items;
CREATE POLICY koi_insert_valid_tx ON public.kit_order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id
      AND t.type = 'kit_purchase'
      AND t.status = 'pending'
      AND t.created_at > (now() - interval '15 minutes')
  ));

-- 4. Donors: replace always-true insert check with lightweight validation
DROP POLICY IF EXISTS donors_insert_anyone ON public.donors;
CREATE POLICY donors_insert_valid ON public.donors
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (name IS NOT NULL AND length(btrim(name)) > 0)
    OR (email IS NOT NULL AND length(btrim(email)) > 0)
    OR (phone IS NOT NULL AND length(btrim(phone)) > 0)
  );

-- 5. Convert SECURITY DEFINER helpers to SECURITY INVOKER where safe;
--    drop or lock down the rest.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_stats()
RETURNS TABLE(total_raised bigint, donor_count bigint, donation_count bigint, average_donation bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(amount), 0)::BIGINT,
    COUNT(DISTINCT donor_id)::BIGINT,
    COUNT(*)::BIGINT,
    COALESCE(AVG(amount), 0)::BIGINT
  FROM public.transactions
  WHERE status = 'confirmed' AND type = 'donation'
$$;

-- Unused / mock-only DEFINER functions: drop entirely (mock confirm moves to a server function)
DROP FUNCTION IF EXISTS public.get_transaction_status(text);
DROP FUNCTION IF EXISTS public.mock_confirm_transaction(text);

-- Trigger function stays SECURITY DEFINER (needed to seed the first admin),
-- but must not be callable directly by end users.
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM anon, authenticated;
