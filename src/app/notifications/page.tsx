import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
  const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
  const headerUser = { name: profile?.display_name || fallback, username: profile?.username || null, avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  const { data: items } = await supabase.from("notifications").select("id,type,title,body,is_read,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
  return <><Header user={headerUser}/><main className="hubPage"><div className="hubPageHead"><div><span className="eyebrow">INBOX</span><h1>Notifications</h1><p>Mentions, replies, likes, comments, messages and other activity about you.</p></div></div>
  {!items?.length?<section className="hubEmpty"><span>●</span><h2>You're all caught up</h2><p>New mentions, replies, likes and messages will appear here.</p></section>:<section className="notificationList">{items.map(n=><article className={`notificationItem ${n.is_read?"":"unread"}`} key={n.id}><span className="notificationDot">●</span><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString()}</small></div></article>)}</section>}
  </main></>;
}