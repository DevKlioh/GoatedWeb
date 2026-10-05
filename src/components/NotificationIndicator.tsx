"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NotificationIndicator({variant="icon",className=""}:{variant?:"icon"|"nav";className?:string}){
 const supabase=useMemo(()=>createClient(),[]),[count,setCount]=useState(0),[userId,setUserId]=useState<string|null>(null);
 const load=useCallback(async(id:string)=>{const {count:c}=await supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",id).eq("is_read",false);setCount(c||0)},[supabase]);
 useEffect(()=>{let channel:any;let alive=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!alive||!user)return;setUserId(user.id);await load(user.id);channel=supabase.channel(`notifications-badge-${user.id}`).on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${user.id}`},()=>void load(user.id)).subscribe();})();return()=>{alive=false;if(channel)supabase.removeChannel(channel)}},[load,supabase]);
 if(!userId)return null;
 const badge=count>99?"99+":String(count);
 if(variant==="nav")return <Link className={`notificationNavLink ${className}`} href="/notifications">♧ <span>Notifications</span>{count>0&&<b className="notificationBadge">{badge}</b>}</Link>;
 return <Link href="/notifications" className={`iconButton notificationBell ${className}`} aria-label={count?`${count} unread notifications`:"Notifications"}><span>♢</span>{count>0&&<b className="notificationBadge">{badge}</b>}</Link>;
}
