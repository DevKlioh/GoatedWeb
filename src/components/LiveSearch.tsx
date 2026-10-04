"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Person={id:string;username:string|null;display_name:string|null;avatar_url:string|null};
type Resource={id:string;name:string;slug:string;icon_url:string|null;plugin_version:string|null;pricing_type:string|null;download_count:number|null};
type Result={kind:"person"|"resource";key:string;href:string;title:string;subtitle:string;image:string|null};

export default function LiveSearch({variant="dashboard"}:{variant?:"dashboard"|"header"}){
  const supabase=useMemo(()=>createClient(),[]), router=useRouter();
  const wrap=useRef<HTMLDivElement>(null), input=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState(""),[people,setPeople]=useState<Person[]>([]),[resources,setResources]=useState<Resource[]>([]);
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[active,setActive]=useState(-1);
  const results:Result[]=[
    ...people.map(p=>({kind:"person" as const,key:`p-${p.id}`,href:`/profile/${encodeURIComponent(p.username||"player")}`,title:p.display_name||p.username||"Goated User",subtitle:`@${p.username||"player"}`,image:p.avatar_url})),
    ...resources.map(r=>({kind:"resource" as const,key:`r-${r.id}`,href:`/resources/${r.slug}`,title:r.name,subtitle:`${r.pricing_type==="premium"?"Premium":"Free"}${r.plugin_version?` • v${r.plugin_version}`:""} • ↓ ${Number(r.download_count||0).toLocaleString()}`,image:r.icon_url}))
  ];

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();input.current?.focus();setOpen(true);}
      if(e.key==="Escape"){setOpen(false);input.current?.blur();}
    };
    const outside=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};
    document.addEventListener("keydown",key);document.addEventListener("mousedown",outside);
    return()=>{document.removeEventListener("keydown",key);document.removeEventListener("mousedown",outside)};
  },[]);

  useEffect(()=>{
    const q=query.trim();setActive(-1);
    if(q.length<2){setPeople([]);setResources([]);setLoading(false);return;}
    let cancelled=false;
    const timer=setTimeout(async()=>{
      setLoading(true);
      const safe=q.replace(/[%_]/g,"").trim();
      const pattern=`%${safe}%`;
      const [byUser,byName,pluginRes]=await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url").ilike("username",pattern).limit(5),
        supabase.from("profiles").select("id,username,display_name,avatar_url").ilike("display_name",pattern).limit(5),
        supabase.from("resources").select("id,name,slug,icon_url,plugin_version,pricing_type,download_count").eq("status","published").ilike("name",pattern).limit(6)
      ]);
      if(cancelled)return;
      const merged=new Map<string,Person>();[...(byUser.data||[]),...(byName.data||[])].forEach(p=>merged.set(p.id,p));
      setPeople([...merged.values()].slice(0,6));setResources((pluginRes.data||[]) as Resource[]);setLoading(false);setOpen(true);
    },220);
    return()=>{cancelled=true;clearTimeout(timer)};
  },[query,supabase]);

  function keyboard(e:React.KeyboardEvent<HTMLInputElement>){
    if(!open||!results.length)return;
    if(e.key==="ArrowDown"){e.preventDefault();setActive(x=>(x+1)%results.length)}
    else if(e.key==="ArrowUp"){e.preventDefault();setActive(x=>x<=0?results.length-1:x-1)}
    else if(e.key==="Enter"&&active>=0){e.preventDefault();setOpen(false);router.push(results[active].href)}
  }

  const body=<>
    <span className="liveSearchIcon">⌕</span>
    <input ref={input} aria-label="Search users and plugins" value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onKeyDown={keyboard} placeholder="Search users or plugins..." autoComplete="off"/>
    {variant==="dashboard"&&<kbd>Ctrl K</kbd>}
    {open&&query.trim().length>0&&<div className="liveSearchDropdown">
      {query.trim().length<2?<div className="searchHint">Type at least 2 characters to search.</div>:loading?<div className="searchLoading"><i/> Searching GoatedPlugins…</div>:results.length===0?<div className="searchEmpty"><b>No matches found</b><span>No users or plugins match “{query.trim()}”.</span></div>:<>
        {people.length>0&&<div className="searchGroup"><div className="searchGroupTitle">People</div>{people.map((p,i)=>{
          const idx=i;return <Link onMouseEnter={()=>setActive(idx)} className={`searchResult ${active===idx?"active":""}`} onClick={()=>setOpen(false)} href={`/profile/${encodeURIComponent(p.username||"player")}`} key={p.id}>
            <span className="searchResultImage">{p.avatar_url?<img src={p.avatar_url} alt=""/>:(p.display_name||p.username||"G").slice(0,1).toUpperCase()}</span><span><b>{p.display_name||p.username||"Goated User"}</b><small>@{p.username||"player"}</small></span><em>Profile →</em>
          </Link>})}</div>}
        {resources.length>0&&<div className="searchGroup"><div className="searchGroupTitle">Plugins</div>{resources.map((r,i)=>{
          const idx=people.length+i;return <Link onMouseEnter={()=>setActive(idx)} className={`searchResult ${active===idx?"active":""}`} onClick={()=>setOpen(false)} href={`/resources/${r.slug}`} key={r.id}>
            <span className="searchResultImage plugin">{r.icon_url?<img src={r.icon_url} alt=""/>:"⬡"}</span><span><b>{r.name}</b><small>{r.pricing_type==="premium"?"Premium":"Free"}{r.plugin_version?` • v${r.plugin_version}`:""} • ↓ {Number(r.download_count||0).toLocaleString()}</small></span><em>Plugin →</em>
          </Link>})}</div>}
        <div className="searchKeyboardHint">↑ ↓ navigate <span>•</span> Enter open <span>•</span> Esc close</div>
      </>}
    </div>}
  </>;
  return <div ref={wrap} className={`${variant==="dashboard"?"dashboardSearch":"headerSearch"} liveSearchWrap`}>{body}</div>;
}
