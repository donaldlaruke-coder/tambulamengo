import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const refSchema = z.object({ internal_reference: z.string().min(4).max(64) });

// Public: fetch bank transfer details for a freshly-created pending bank transaction.
// Bank fields are no longer readable directly from the public campaign_settings row.
export const getBankTransferDetails = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tx, error: txErr } = await supabaseAdmin
      .from("transactions")
      .select("id, status, payment_method, created_at, amount")
      .eq("internal_reference", data.internal_reference)
      .maybeSingle();
    if (txErr) throw new Error("lookup_failed");
    if (!tx || tx.payment_method !== "bank" || tx.status !== "pending") {
      throw new Error("not_found");
    }
    const { data: c, error: cErr } = await supabaseAdmin
      .from("campaign_settings")
      .select("bank_name, bank_account_name, bank_account_number")
      .eq("id", 1)
      .single();
    if (cErr) throw new Error("campaign_missing");
    return {
      bank_name: c.bank_name,
      bank_account_name: c.bank_account_name,
      bank_account_number: c.bank_account_number,
      amount: tx.amount,
    };
  });

// Public MOCK: confirms a pending mobile-money transaction. Removed together
// with the DB-level mock_confirm_transaction. Replace when real payment
// providers are wired.
export const mockConfirmTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("transactions")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("internal_reference", data.internal_reference)
      .eq("status", "pending")
      .in("payment_method", ["mtn_momo", "airtel_money"])
      .select("status")
      .maybeSingle();
    if (error) throw new Error("update_failed");
    return { status: updated?.status ?? null };
  });