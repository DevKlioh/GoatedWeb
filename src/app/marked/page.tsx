import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
export default async function MarkedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
  const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
  const headerUser = { name: profile?.display_name || fallback, username: profile?.username || null, avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  return <><Header user={headerUser}/><main className="hubPage"><div className="hubPageHead"><div><span className="eyebrow">LIBRARY</span><h1>Marked Posts</h1><p>Posts you mark will be kept here so they're easy to find again.</p></div></div><section className="hubEmpty"><span>◆</span><h2>No marked posts yet</h2><p>When post publishing is enabled, use the Mark button on a post and it will appear here.</p></section></main></>;
}