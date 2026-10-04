import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
export default async function Settings() {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/");
 const profile={name:(user.user_metadata?.full_name||user.user_metadata?.name||user.user_metadata?.preferred_username||user.email||"Account") as string,avatar:(user.user_metadata?.avatar_url||user.user_metadata?.picture||null) as string|null};
 return <><Header user={profile}/><main className="settings"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><div className="settingsCard"><div><span>Signed in as</span><strong>{profile.name}</strong></div><div><span>Provider</span><strong>Discord</strong></div><div><span>Email</span><strong>{user.email ?? "Not provided"}</strong></div></div><p className="muted">Profile editing and privacy controls will be added when we build the user profile system.</p></main></>;
}
