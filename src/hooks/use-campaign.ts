import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBackendUrl } from "@/lib/backend-url";

export type CampaignSettings = {
  id: number;
  campaign_name: string;
  tagline: string | null;
  story: string | null;
  goal_amount: number;
  offline_amount: number;
  event_date: string;
  event_details: string | null;
};

export type CampaignStats = {
  total_raised: number;
  donor_count: number;
  donation_count: number;
  average_donation: number;
};

export type PublicTransaction = {
  id: string;
  amount: number;
  type: "donation" | "kit_purchase";
  payment_method: "mtn_momo" | "airtel_money" | "bank";
  message: string | null;
  is_anonymous: boolean;
  donor_display_name: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export function useCampaign() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["campaign"],
    queryFn: async (): Promise<CampaignSettings> => {
      if (import.meta.env.VITE_USE_DJANGO !== "false") {
        const url = `${getBackendUrl()}/api/campaign/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch campaign settings");
        return await res.json();
      }
      const { data, error } = await supabase
        .from("campaign_settings")
        .select("id, campaign_name, tagline, story, goal_amount, event_date, event_details")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as CampaignSettings;
    },
  });
  useEffect(() => {
    if (import.meta.env.VITE_USE_DJANGO !== "false") return;
    const channel = supabase
      .channel("rt:campaign")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["campaign"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
  return q;
}

export function useCampaignStats() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["campaign-stats"],
    queryFn: async (): Promise<CampaignStats> => {
      if (import.meta.env.VITE_USE_DJANGO !== "false") {
        const url = `${getBackendUrl()}/api/stats/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch campaign stats");
        return await res.json();
      }
      const { data, error } = await supabase.rpc("get_campaign_stats").single();
      if (error) throw error;
      return data as CampaignStats;
    },
  });
  useEffect(() => {
    if (import.meta.env.VITE_USE_DJANGO !== "false") return;
    const channel = supabase
      .channel("rt:tx-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => qc.invalidateQueries({ queryKey: ["campaign-stats"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
  return q;
}

export function useLiveDonations(limit = 25, typeFilter?: "donation" | "kit_purchase") {
  const qc = useQueryClient();
  const key = ["live-donations", limit, typeFilter ?? "all"];
  const q = useQuery({
    queryKey: key,
    queryFn: async (): Promise<PublicTransaction[]> => {
      if (import.meta.env.VITE_USE_DJANGO !== "false") {
        const url = `${getBackendUrl()}/api/donations/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch live donations");
        const data: PublicTransaction[] = await res.json();
        if (typeFilter) {
          return data.filter((t) => t.type === typeFilter);
        }
        return data;
      }
      let query = supabase
        .from("transactions")
        .select("id, amount, type, payment_method, message, is_anonymous, donor_display_name, confirmed_at, created_at")
        .eq("status", "confirmed")
        .order("confirmed_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (typeFilter) query = query.eq("type", typeFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PublicTransaction[];
    },
  });
  useEffect(() => {
    if (import.meta.env.VITE_USE_DJANGO === "true") return;
    const channel = supabase
      .channel("rt:tx-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => qc.invalidateQueries({ queryKey: ["live-donations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
  return q;
}