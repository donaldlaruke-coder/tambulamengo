
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.transaction_type AS ENUM ('donation', 'kit_purchase');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE public.payment_method AS ENUM ('mtn_momo', 'airtel_money', 'bank');

-- ============ TABLES ============

CREATE TABLE public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.donors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'UGX',
  payment_method public.payment_method NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  provider_reference TEXT,
  internal_reference TEXT NOT NULL UNIQUE,
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  donor_display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX ON public.transactions (status, created_at DESC);
CREATE INDEX ON public.transactions (type, status);
GRANT SELECT, INSERT ON public.transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kit_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  size_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kit_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_products TO authenticated;
GRANT ALL ON public.kit_products TO service_role;
ALTER TABLE public.kit_products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kit_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  kit_product_id UUID NOT NULL REFERENCES public.kit_products(id),
  size TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price BIGINT NOT NULL,
  fulfillment_status TEXT NOT NULL DEFAULT 'ordered'
);
GRANT SELECT, INSERT ON public.kit_order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_order_items TO authenticated;
GRANT ALL ON public.kit_order_items TO service_role;
ALTER TABLE public.kit_order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaign_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  campaign_name TEXT NOT NULL DEFAULT 'Tambula Mengo',
  tagline TEXT,
  story TEXT,
  goal_amount BIGINT NOT NULL,
  event_date DATE NOT NULL,
  event_details TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.campaign_settings TO authenticated;
GRANT ALL ON public.campaign_settings TO service_role;
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ ROLE FUNCTION ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ POLICIES ============

-- donors: guest inserts allowed; only admins read/modify (to protect PII)
CREATE POLICY "donors_insert_anyone" ON public.donors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "donors_admin_read" ON public.donors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "donors_admin_write" ON public.donors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "donors_admin_delete" ON public.donors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transactions: anyone can create a pending transaction; anyone can read CONFIRMED ones (public board);
-- admins read/modify all.
CREATE POLICY "transactions_public_confirmed_read"
  ON public.transactions FOR SELECT TO anon, authenticated
  USING (status = 'confirmed');
CREATE POLICY "transactions_admin_read_all"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "transactions_insert_anyone"
  ON public.transactions FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');
CREATE POLICY "transactions_admin_update"
  ON public.transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "transactions_admin_delete"
  ON public.transactions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow reading own just-created pending transaction by internal_reference (needed for polling)
-- We keep this off RLS and instead expose a security-definer RPC below.

-- kit_products: public read active; admins manage
CREATE POLICY "kits_public_read_active" ON public.kit_products FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "kits_admin_all_read" ON public.kit_products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "kits_admin_write" ON public.kit_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "kits_admin_update" ON public.kit_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "kits_admin_delete" ON public.kit_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- kit_order_items: insert with a pending transaction; admins read
CREATE POLICY "koi_insert_anyone" ON public.kit_order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "koi_admin_read" ON public.kit_order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "koi_admin_update" ON public.kit_order_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "koi_admin_delete" ON public.kit_order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- campaign_settings: public read; admins update
CREATE POLICY "campaign_public_read" ON public.campaign_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "campaign_admin_update" ON public.campaign_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaign_admin_insert" ON public.campaign_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: user reads own; admin reads all
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles_admin_read_all" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ SECURITY DEFINER RPC for polling a pending transaction ============
CREATE OR REPLACE FUNCTION public.get_transaction_status(_internal_reference TEXT)
RETURNS TABLE (
  internal_reference TEXT,
  status public.transaction_status,
  amount BIGINT,
  type public.transaction_type,
  confirmed_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.internal_reference, t.status, t.amount, t.type, t.confirmed_at
  FROM public.transactions t
  WHERE t.internal_reference = _internal_reference
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_transaction_status(TEXT) TO anon, authenticated;

-- ============ Aggregate stats RPC (fast public read) ============
CREATE OR REPLACE FUNCTION public.get_campaign_stats()
RETURNS TABLE (
  total_raised BIGINT,
  donor_count BIGINT,
  donation_count BIGINT,
  average_donation BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(amount), 0)::BIGINT AS total_raised,
    COUNT(DISTINCT donor_id)::BIGINT AS donor_count,
    COUNT(*)::BIGINT AS donation_count,
    COALESCE(AVG(amount), 0)::BIGINT AS average_donation
  FROM public.transactions
  WHERE status = 'confirmed' AND type = 'donation'
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_stats() TO anon, authenticated;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_settings;

-- ============ SEED ============
INSERT INTO public.campaign_settings (id, campaign_name, tagline, story, goal_amount, event_date, event_details, bank_name, bank_account_name, bank_account_number)
VALUES (
  1,
  'Tambula Mengo',
  'Akwana Akira Ayomba — Make friends and never foes.',
  'For 130 years Mengo Senior School has shaped generations of Ugandan leaders. Tambula Mengo is our sponsored walk-and-run to raise funds for the next chapter — new learning spaces, bursaries, and safer facilities for every student who walks through our gates.',
  18000000000,
  '2026-08-15',
  'Join the Tambula Mengo walk & run on Saturday, 15 August. Kits collected from the school pavilion the week before. Route details announced closer to the day.',
  'Stanbic Bank Uganda',
  'Mengo Senior School — Tambula Mengo',
  '9030099999999'
);

INSERT INTO public.kit_products (name, description, price, size_options, active)
VALUES (
  'Tambula Mengo Run Kit',
  'Official event kit — branded t-shirt, race number and wristband. Collected at the school pavilion the week before the walk.',
  30000,
  '["S","M","L","XL","XXL"]'::jsonb,
  true
);
