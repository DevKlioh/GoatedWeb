import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
  const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
  const headerUser = { name: profile?.display_name || fallback, username: profile?.username || null, avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  const { data: resources } = await supabase.from("resources").select("id,name,slug,status,created_at,icon_url,plugin_version,pricing_type,price_php,download_count").eq("owner_id", user.id).order("created_at", { ascending:false });
  return <><Header user={headerUser}/><main className="hubPage">
    <div className="hubPageHead"><div><span className="eyebrow">CREATOR HUB</span><h1>Your Resources</h1><p>Manage every Minecraft plugin or resource you publish on GoatedPlugins.</p></div><Link className="goldAction" href="/resources/upload">＋ Upload Resource</Link></div>
    {!resources?.length ? <section className="hubEmpty"><span>⬡</span><h2>No resources yet</h2><p>Your uploaded plugins will appear here.</p><Link className="goldAction" href="/resources/upload">Upload your first resource</Link></section> :
    <div className="resourceGrid">{resources.map(r=><Link href={`/resources/${r.slug}`} className="resourceOwnerCard" key={r.id}>{r.icon_url?<img src={r.icon_url} alt=""/>:<div className="resourceIconFallback">⬡</div>}<div><small>{r.status}</small><h2>{r.name}</h2><p>v{r.plugin_version || "—"} • ↓ {Number(r.download_count || 0).toLocaleString()} downloads • {r.pricing_type === "premium" ? `₱${Number(r.price_php || 0).toFixed(2)}` : "Free"}</p></div></Link>)}</div>}
  </main></>;
}