import { redirect } from "next/navigation";
import Header from "@/components/Header";
import NotificationsClient from "@/components/NotificationsClient";
import { createClient } from "@/lib/supabase/server";
export default async function NotificationsPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/");
 const {data:profile}=await supabase.from("profiles").select("username,display_name,avatar_url").eq("id",user.id).maybeSingle();
 const fallback=(user.user_metadata?.full_name||user.user_metadata?.name||user.email||"Account") as string;
 const headerUser={name:profile?.display_name||fallback,username:profile?.username||undefined,avatar:profile?.avatar_url||user.user_metadata?.avatar_url||user.user_metadata?.picture||null};
 const {data:items}=await supabase.from("notifications").select("id,type,title,body,target_url,is_read,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
 return <><Header user={headerUser}/><main className="hubPage"><div className="hubPageHead"><div><span className="eyebrow">LIVE ACTIVITY</span><h1>Notifications</h1><p>Likes, comments, replies, follows and messages appear here in real time.</p></div></div><NotificationsClient userId={user.id} initialItems={(items||[]) as any}/></main></>;
}
