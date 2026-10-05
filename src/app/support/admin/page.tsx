import { redirect } from "next/navigation";
import Header from "@/components/Header";
import SupportAdminClient from "@/components/SupportAdminClient";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSupport() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/?auth=signin");

  const { data: profile } = await s
    .from("profiles")
    .select("username,display_name,avatar_url,role")
    .eq("id", user.id)
    .maybeSingle();

  // A missing profile must not be dereferenced. Only a confirmed admin may continue.
  if (!profile || profile.role !== "admin") redirect("/support");

  const [{ data: pending }, { data: users }] = await Promise.all([
    s.from("support_donations")
      .select("id,user_id,amount,reference,proof_path,created_at,profiles:profiles!support_donations_user_id_fkey(username,display_name)")
      .eq("method", "gcash")
      .eq("status", "pending")
      .order("created_at"),
    s.from("profiles")
      .select("id,username,display_name,post_limit")
      .order("username")
  ]);

  return (
    <>
      <Header user={{
        name: profile.display_name || profile.username || "Admin",
        username: profile.username || null,
        avatar: profile.avatar_url || null,
        role: profile.role
      }} />
      <SupportAdminClient
        pending={(pending || []) as any}
        users={(users || []) as any}
      />
    </>
  );
}
