import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string;
  plan: "free" | "pro";
  stripe_customer_id: string | null;
};

export type Usage = {
  used: number;
  limit: number | null; // null = unlimited
};

export function useProfileAndUsage(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,email,plan,stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since.toISOString());

    setProfile(prof as Profile | null);
    setUsage({
      used: count ?? 0,
      limit: prof?.plan === "pro" ? null : 3,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, usage, loading, refresh };
}