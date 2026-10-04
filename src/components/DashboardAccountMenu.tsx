"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props={name:string;username?:string|null;avatar?:string|null};
export default function DashboardAccountMenu({name,username,avatar}:Props){
 const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement>(null); const router=useRouter();
 useEffect(()=>{function outside(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)} function esc(e:KeyboardEvent){if(e.key==="Escape")setOpen(false)} document.addEventListener("mousedown",outside);document.addEventListener("keydown",esc);return()=>{document.removeEventListener("mousedown",outside);document.removeEventListener("keydown",esc)}},[]);
 async function logout(){await createClient().auth.signOut();setOpen(false);router.push("/");router.refresh()}
 return <div className="dashboardAccountMenu" ref={ref}>
   <button className="miniAccount dashboardAccountTrigger" type="button" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(v=>!v)}>
    {avatar?<img src={avatar} alt=""/>:<span>{name.slice(0,1).toUpperCase()}</span>}<b>{name}</b><i>⌄</i>
   </button>
   {open&&<div className="dashboardAccountDropdown" role="menu">
    <div className="dashboardAccountHead">{avatar?<img src={avatar} alt=""/>:<span className="dashboardAccountFallback">{name.slice(0,1).toUpperCase()}</span>}<div><strong>{name}</strong><small>{username?`@${username}`:"GoatedPlugins member"}</small></div></div>
    <div className="dashboardAccountLinks">
     <Link href="/settings" onClick={()=>setOpen(false)}><span>⚙</span><div><b>Account Settings</b><small>Profile and account preferences</small></div></Link>
     <Link href="/resources" onClick={()=>setOpen(false)}><span>⬡</span><div><b>Your Resources</b><small>Plugins and resources you own</small></div></Link>
     <Link href="/marked" onClick={()=>setOpen(false)}><span>◆</span><div><b>Marked Posts</b><small>Posts you saved for later</small></div></Link>
     <Link href="/notifications" onClick={()=>setOpen(false)}><span>●</span><div><b>Notifications</b><small>Mentions, replies, likes and messages</small></div></Link>
     <Link href="/messages" onClick={()=>setOpen(false)}><span>✉</span><div><b>Messages</b><small>Your private conversations</small></div></Link>
    </div>
    <div className="dashboardAccountFooter"><Link href="/resources/upload" onClick={()=>setOpen(false)}>＋ Upload Resource</Link><button type="button" onClick={logout}>Log out</button></div>
   </div>}
 </div>
}
