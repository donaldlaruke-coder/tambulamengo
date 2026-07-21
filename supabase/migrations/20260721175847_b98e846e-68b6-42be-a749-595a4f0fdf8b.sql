
ALTER TABLE public.kit_order_items
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS kit_order_items_picked_up_at_idx
  ON public.kit_order_items (picked_up_at);
