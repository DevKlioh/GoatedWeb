import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ResourceUploader from "@/components/ResourceUploader";
import { createClient } from "@/lib/supabase/server";
export default async function UploadResourcePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
  const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
  const headerUser = { name: profile?.display_name || fallback, username: profile?.username || null, avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  return <><Header user={headerUser}/><main className="hubPage uploadResourcePage"><div className="hubPageHead"><div><span className="eyebrow">CREATOR HUB</span><h1>Upload Resource</h1><p>Publish your Minecraft plugin or resource to the GoatedPlugins community.</p></div></div><ResourceUploader userId={user.id}/></main></>;
}