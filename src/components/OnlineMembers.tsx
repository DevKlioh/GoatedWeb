"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Counts recently active signed-in members, not open tabs or anonymous visitors. */
export default function OnlineMembers({ userId }: { userId?: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      if (userId) {
        await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
      }
      const cutoff = new Date(Date.now() - 150_000).toISOString();
      const { count: total, error } = await supabase.from("profiles")
        .select("id", { count: "exact", head: true }).gte("last_seen_at", cutoff);
      if (active) setCount(error ? null : total ?? 0);
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [userId]);
  return <div className="onlineMembers" title="Signed-in members active in the last 2½ minutes" aria-label={count === null ? "Online member count unavailable" : `${count} members online`}>
    <span className="onlineMembersDot" aria-hidden="true" />
    <span className="onlineMembersNumber">{count === null ? "—" : count.toLocaleString()}</span>
    <span className="onlineMembersLabel">Online</span>
  </div>;
}
