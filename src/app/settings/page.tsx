import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ProfileEditor from "@/components/ProfileEditor";
import { createClient } from "@/lib/supabase/server";

export default async function Settings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data } = await supabase.from("profiles").select("username,display_name,bio,avatar_url").eq("id", user.id).maybeSingle();
  const fallbackName = (user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || user.email?.split("@")[0] || "Member") as string;
  const fallbackUsername = (user.user_metadata?.username || user.user_metadata?.preferred_username || user.email?.split("@")[0] || "member").replace(/[^A-Za-z0-9_]/g,"_").slice(0,24);
  const profile = { name: data?.display_name || fallbackName, username: data?.username || null, avatar: data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  const provider = user.app_metadata?.provider ? String(user.app_metadata.provider) : "email";

  return <><Header user={profile}/><main className="settings"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><div className="settingsLayout"><ProfileEditor id={user.id} username={data?.username || fallbackUsername} displayName={data?.display_name || fallbackName} bio={data?.bio || ""}/><aside className="accountSecurityCard"><span className="eyebrow">ACCOUNT</span><h2>Sign-in details</h2><div><span>Email</span><strong>{user.email ?? "Not provided"}</strong></div><div><span>Provider</span><strong>{provider.charAt(0).toUpperCase()+provider.slice(1)}</strong></div><p>Your password and authentication credentials are handled securely by Supabase Auth and are never stored in your public profile.</p></aside></div></main></>;
}
