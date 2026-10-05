"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Person={id:string;username:string;display_name:string|null;avatar_url:string|null;last_seen_at:string|null};
type Msg={id:string;sender_id:string;recipient_id:string;content:string;created_at:string;read_at:string|null};

export default function MessagesClient({me,people,initialWith}:{me:Person;people:Person[];initialWith?:string|null}){
 const supabase=useMemo(()=>createClient(),[]);
 const [selected,setSelected]=useState<string|null>(initialWith||people[0]?.id||null);
 const [messages,setMessages]=useState<Msg[]>([]);
 const [text,setText]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [now,setNow]=useState(0);
 const end=useRef<HTMLDivElement>(null);

 useEffect(()=>{setNow(Date.now());const id=window.setInterval(()=>setNow(Date.now()),30000);return()=>window.clearInterval(id)},[]);
 const isOnline=(x:string|null)=>!!x&&now>0&&now-new Date(x).getTime()<150000;
 const person=people.find(p=>p.id===selected)||null;

 useEffect(()=>{
   if(initialWith&&people.some(p=>p.id===initialWith))setSelected(initialWith);
   else if(!selected&&people[0]?.id)setSelected(people[0].id);
 },[initialWith,people,selected]);

 const load=useCallback(async()=>{
   if(!selected||!me?.id)return;
   setLoading(true);
   try{
     const {data,error:loadError}=await supabase.from("direct_messages")
       .select("id,sender_id,recipient_id,content,created_at,read_at")
       .or(`and(sender_id.eq.${me.id},recipient_id.eq.${selected}),and(sender_id.eq.${selected},recipient_id.eq.${me.id})`)
       .order("created_at",{ascending:true}).limit(250);
     if(loadError){setError(loadError.message);return}
     setMessages((data||[]) as Msg[]);
     setError("");
     await supabase.from("direct_messages").update({read_at:new Date().toISOString()})
       .eq("sender_id",selected).eq("recipient_id",me.id).is("read_at",null);
   }catch(err){setError(err instanceof Error?err.message:"Unable to load this conversation.")}
   finally{setLoading(false)}
 },[me?.id,selected,supabase]);

 useEffect(()=>{void load();const id=window.setInterval(()=>void load(),5000);return()=>window.clearInterval(id)},[load]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth",block:"end"})},[messages]);

 async function send(e:FormEvent){
   e.preventDefault();
   const content=text.trim();
   if(!content||!selected||!me?.id||busy)return;
   setBusy(true);setError("");
   try{
     const {data,error:sendError}=await supabase.from("direct_messages")
       .insert({sender_id:me.id,recipient_id:selected,content})
       .select("id,sender_id,recipient_id,content,created_at,read_at").single();
     if(sendError){setError(sendError.message);return}
     if(data){setMessages(x=>[...x,data as Msg]);setText("")}
   }catch(err){setError(err instanceof Error?err.message:"Message could not be sent.")}
   finally{setBusy(false)}
 }

 return <div className="messagesShell">
  <aside className="conversationList">
   <div className="messageSideTitle"><h2>Messages</h2><span>{people.length} people</span></div>
   {people.length?people.map(p=><button type="button" className={selected===p.id?"active":""} onClick={()=>{setSelected(p.id);setError("")}} key={p.id}>
    <span className="dmAvatar">{p.avatar_url?<img src={p.avatar_url} alt=""/>:(p.display_name||p.username).slice(0,1).toUpperCase()}<i className={isOnline(p.last_seen_at)?"online":"offline"}/></span>
    <span><b>{p.display_name||p.username}</b><small>@{p.username} · {isOnline(p.last_seen_at)?"Online":"Offline"}</small></span>
   </button>):<p className="noConversations">Open another member&apos;s profile and choose Message to start a conversation.</p>}
  </aside>

  <section className="messageThread">{person?<><header>
   <div className="dmAvatar">{person.avatar_url?<img src={person.avatar_url} alt=""/>:(person.display_name||person.username).slice(0,1).toUpperCase()}<i className={isOnline(person.last_seen_at)?"online":"offline"}/></div>
   <div><Link href={`/profile/${encodeURIComponent(person.username)}`}><b>{person.display_name||person.username}</b></Link><span>{isOnline(person.last_seen_at)?"Online now":"Offline"}</span></div>
  </header>
  <div className="messageStream">
   {error&&<div className="messageError"><b>Messages unavailable</b><span>{error}</span></div>}
   {loading&&!messages.length?<div className="emptyThread"><span>•••</span><h3>Loading conversation</h3></div>:
    messages.length?messages.map(m=><div className={`messageBubble ${m.sender_id===me.id?"mine":"theirs"}`} key={m.id}>
      <p>{m.content}</p><small suppressHydrationWarning>{new Date(m.created_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small>
    </div>):!error&&<div className="emptyThread"><span>✉</span><h3>Start the conversation</h3><p>Send {person.display_name||person.username} a message.</p></div>}
   <div ref={end}/>
  </div>
  <form className="messageComposer" onSubmit={send}>
   <textarea maxLength={2000} value={text} onChange={e=>setText(e.target.value)} placeholder={`Message ${person.display_name||person.username}…`}/>
   <button className="goldButton" disabled={busy||!text.trim()}>{busy?"Sending…":"Send"}</button>
  </form></>:<div className="emptyThread"><span>✉</span><h3>Your messages</h3><p>Select someone to start chatting.</p></div>}</section>
 </div>;
}
