import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

const platformInfo:any={spigot:["Spigot","/platforms/spigot.svg"],paper:["Paper","/platforms/paper.svg"],purpur:["Purpur","/platforms/purpur.svg"],folia:["Folia","/platforms/folia.svg"]};

export default async function ResourcePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  let headerUser:any=null;if(user){const {data:p}=await supabase.from("profiles").select("username,display_name,avatar_url").eq("id",user.id).maybeSingle();headerUser={name:p?.display_name||user.user_metadata?.name||user.email||"Account",username:p?.username||null,avatar:p?.avatar_url||user.user_metadata?.avatar_url||null};}
  const {data:r}=await supabase.from("resources").select("*,resource_links(url,position)").eq("slug",slug).maybeSingle();if(!r)notFound();
  let owned=false;if(user&&r.pricing_type==="premium"){const {data:p}=await supabase.from("resource_purchases").select("resource_id").eq("resource_id",r.id).eq("buyer_id",user.id).eq("status","paid").maybeSingle();owned=!!p||r.owner_id===user.id;}
  const canDownload=r.pricing_type==="free"||owned;
  return <><Header user={headerUser}/><main className="resourceDetailPage">
    <section className="resourceHero"><div className="resourceHeroIcon">{r.icon_url?<img src={r.icon_url} alt=""/>:<span>⬡</span>}</div><div className="resourceHeroInfo"><div className="resourceBadges"><span>{r.pricing_type==="free"?"FREE":"PREMIUM"}</span><span>v{r.plugin_version}</span></div><h1>{r.name}</h1><p>{r.description_text?.slice(0,180)}</p><div className="resourceMeta"><b>↓ {Number(r.download_count||0).toLocaleString()} downloads</b><span>•</span><span>Updated resource</span></div></div>
      <div className="resourcePurchaseBox">{r.pricing_type==="free"?<><strong>Free</strong><a className="goldAction" href={`/api/resources/${r.id}/download`}>Download .jar</a><small>No account required.</small></>:!user?<><strong>Premium Resource</strong><p>Sign in to view the price and purchase this plugin.</p><Link className="goldAction" href="/">Sign in to continue</Link></>:owned?<><strong>Owned</strong><a className="goldAction" href={`/api/resources/${r.id}/download`}>Download .jar</a><small>Your purchase gives you download access.</small></>:<><strong>₱{Number(r.price_php).toFixed(2)}</strong><button className="goldAction" disabled>Buy Resource</button><small>Payment checkout will be connected in the next payment step.</small></>}</div>
    </section>
    <section className="resourceDetailGrid"><article className="resourceDescription"><h2>About this resource</h2><div className="resourceRichText" dangerouslySetInnerHTML={{__html:r.description_html}}/></article>
      <aside className="resourceSidebar"><section><h3>Compatibility</h3><div className="resourcePlatforms">{(r.platforms||[]).map((p:string)=>{const x=platformInfo[p];return x?<div key={p}><Image src={x[1]} width={30} height={30} alt=""/><span>{x[0]}</span></div>:null})}</div></section>
      <section><h3>Minecraft Versions</h3><div className="versionTags">{(r.minecraft_versions||[]).map((v:string)=><span key={v}>v{v}</span>)}</div></section>
      {!!r.resource_links?.length&&<section><h3>Links</h3>{r.resource_links.sort((a:any,b:any)=>a.position-b.position).map((l:any)=><a className="resourceExternalLink" href={l.url} target="_blank" rel="noreferrer" key={l.position}>External link {l.position} ↗</a>)}</section>}</aside>
    </section>
  </main></>;
}