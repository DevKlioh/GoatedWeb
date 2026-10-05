"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Ticket={id:string;user_id:string;category:string;status:string;created_at:string};
type Msg={id:string;ticket_id:string;sender_user_id:string|null;sender_kind:"user"|"support";body:string;created_at:string};
const cats=[
 ["general_inquiry","General Inquiry","Questions about OrvenSMP, the community, or anything you need help understanding."],
 ["credits_support","Credits Support","Help with GCash verification, Orven Credits, balances, or support contributions."],
 ["orven_games_support","Orven Games Support","Report a game problem, score issue, or anything related to Orven Games."],
 ["suggestion","Suggestion","Share an idea or suggestion that could make OrvenSMP even better."]
] as const;
const label=(x:string)=>cats.find(c=>c[0]===x)?.[1]||"Orven Support";
export default function OrvenSupportClient({userId,isAdmin}:{userId:string;isAdmin:boolean}){
 const supabase=useMemo(()=>createClient(),[]),[tickets,setTickets]=useState<Ticket[]>([]),[active,setActive]=useState<string|null>(null),[messages,setMessages]=useState<Msg[]>([]),[text,setText]=useState(""),[notice,setNotice]=useState("");
 async function loadTickets(){const q=supabase.from("orven_support_tickets").select("*").order("updated_at",{ascending:false});const {data,error}=await q;if(error)setNotice(error.message);else{setTickets((data||[]) as Ticket[]);if(!active&&data?.[0])setActive(data[0].id)}}
 async function loadMessages(id=active){if(!id)return;const {data,error}=await supabase.from("orven_support_ticket_messages").select("*").eq("ticket_id",id).order("created_at");if(error)setNotice(error.message);else setMessages((data||[]) as Msg[])}
 useEffect(()=>{void loadTickets()},[]);
 useEffect(()=>{void loadMessages()},[active]);
 useEffect(()=>{const ch=supabase.channel("orven-support-live").on("postgres_changes",{event:"*",schema:"public",table:"orven_support_ticket_messages"},()=>void loadMessages()).on("postgres_changes",{event:"*",schema:"public",table:"orven_support_tickets"},()=>void loadTickets()).subscribe();return()=>{void supabase.removeChannel(ch)}},[active]);
 async function open(category:string){const {data,error}=await supabase.rpc("orven_open_support_ticket",{p_category:category});if(error)return setNotice(error.message);await loadTickets();setActive(data);setNotice("")}
 async function send(e:FormEvent){e.preventDefault();if(!active||!text.trim())return;const {error}=await supabase.from("orven_support_ticket_messages").insert({ticket_id:active,sender_user_id:userId,sender_kind:isAdmin?"support":"user",body:text.trim()});if(error)return setNotice(error.message);setText("");await loadMessages()}
 const ticket=tickets.find(t=>t.id===active);
 return <div className="orvenSupportShell">
  <aside className="supportInbox"><div className="supportIdentity"><span>◇</span><div><b>Orven Support</b><small>Official community support</small></div></div>
   {!isAdmin&&<div className="supportStart"><strong>Start a conversation</strong>{cats.map(c=><button key={c[0]} onClick={()=>open(c[0])}><b>{c[1]}</b><small>{c[2]}</small></button>)}</div>}
   <div className="supportTickets"><strong>{isAdmin?"Support tickets":"Your tickets"}</strong>{tickets.map(t=><button className={active===t.id?"active":""} key={t.id} onClick={()=>setActive(t.id)}><b>{label(t.category)}</b><small>{t.status==="open"?"Open":"Closed"} · {new Date(t.created_at).toLocaleDateString()}</small></button>)}</div>
  </aside>
  <section className="supportConversation">{ticket?<><header><div><span className="supportAvatar">◇</span><div><b>Orven Support</b><small>{label(ticket.category)} · {ticket.status}</small></div></div></header>
   <div className="supportChatStream">{messages.map(m=><div key={m.id} className={`supportChatBubble ${m.sender_kind==="support"?"official":"member"}`}><b>{m.sender_kind==="support"?"Orven Support":"You"}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}</div>
   {ticket.status==="open"&&<form onSubmit={send}><textarea value={text} onChange={e=>setText(e.target.value)} maxLength={4000} placeholder={isAdmin?"Reply as Orven Support…":"Message Orven Support…"}/><button>Send</button></form>}
  </>:<div className="supportEmpty"><span>◇</span><h2>Orven Support</h2><p>{isAdmin?"Select a support ticket to reply as Orven Support.":"Choose what you need help with to create a support ticket."}</p></div>}{notice&&<div className="supportNotice">{notice}</div>}</section>
 </div>
}