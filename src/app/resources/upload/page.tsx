import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ResourceUploader from "@/components/ResourceUploader";
import { createClient } from "@/lib/supabase/server";
export default async function UploadResourcePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("username,display_name,avatar_url,role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/resources");
  const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
  const headerUser = { name: profile?.display_name || fallback, username: profile?.username || null, role: profile?.role || "member", avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  return <><Header user={headerUser}/><main className="hubPage uploadResourcePage"><div className="hubPageHead"><div><span className="eyebrow">ORVENSMP ADMIN</span><h1>Upload Resource</h1><p>Publish an official OrvenSMP Minecraft plugin or resource.</p></div></div><ResourceUploader userId={user.id}/></main></>;
}