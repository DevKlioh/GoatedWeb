"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item={id:string;type:string;title:string;body:string;target_url:string|null;is_read:boolean;created_at:string};
export default function NotificationsClient({userId,initialItems}:{userId:string;initialItems:Item[]}){
 const supabase=useMemo(()=>createClient(),[]),[items,setItems]=useState(initialItems),[busy,setBusy]=useState(false);
 useEffect(()=>{const ch=supabase.channel(`notifications-page-${userId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${userId}`},payload=>setItems(x=>[payload.new as Item,...x.filter(v=>v.id!==(payload.new as Item).id)].slice(0,100))).on("postgres_changes",{event:"UPDATE",schema:"public",table:"notifications",filter:`user_id=eq.${userId}`},payload=>setItems(x=>x.map(v=>v.id===(payload.new as Item).id?payload.new as Item:v))).on("postgres_changes",{event:"DELETE",schema:"public",table:"notifications",filter:`user_id=eq.${userId}`},payload=>setItems(x=>x.filter(v=>v.id!==(payload.old as Item).id))).subscribe();return()=>{supabase.removeChannel(ch)}},[supabase,userId]);
 async function read(n:Item){if(!n.is_read){setItems(x=>x.map(v=>v.id===n.id?{...v,is_read:true}:v));await supabase.from("notifications").update({is_read:true}).eq("id",n.id).eq("user_id",userId)}}
 async function readAll(){setBusy(true);setItems(x=>x.map(v=>({...v,is_read:true})));await supabase.from("notifications").update({is_read:true}).eq("user_id",userId).eq("is_read",false);setBusy(false)}
 const unread=items.filter(x=>!x.is_read).length;
 if(!items.length)return <section className="hubEmpty"><span>●</span><h2>You&apos;re all caught up</h2><p>New likes, comments, replies, follows and messages will appear here instantly.</p></section>;
 return <><div className="notificationToolbar"><span>{unread?`${unread} unread notification${unread===1?"":"s"}`:"All caught up"}</span>{unread>0&&<button disabled={busy} onClick={readAll}>{busy?"Marking…":"Mark all as read"}</button>}</div><section className="notificationList">{items.map(n=>{const inner=<><span className="notificationDot">{n.is_read?"○":"●"}</span><div><strong>{n.title}</strong><p>{n.body}</p><small suppressHydrationWarning>{new Date(n.created_at).toLocaleString()}</small></div></>;return n.target_url?<Link onClick={()=>void read(n)} href={n.target_url} className={`notificationItem ${n.is_read?"":"unread"}`} key={n.id}>{inner}</Link>:<button onClick={()=>void read(n)} className={`notificationItem notificationItemButton ${n.is_read?"":"unread"}`} key={n.id}>{inner}</button>})}</section></>;
}
