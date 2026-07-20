
CREATE OR REPLACE FUNCTION public.mock_confirm_transaction(_internal_reference TEXT)
RETURNS public.transaction_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status public.transaction_status;
BEGIN
  -- Only mock-confirms mobile-money payments; bank stays pending for manual admin review.
  UPDATE public.transactions
     SET status = 'confirmed', confirmed_at = now()
   WHERE internal_reference = _internal_reference
     AND status = 'pending'
     AND payment_method IN ('mtn_momo', 'airtel_money')
   RETURNING status INTO _status;
  RETURN _status;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mock_confirm_transaction(TEXT) TO anon, authenticated;
