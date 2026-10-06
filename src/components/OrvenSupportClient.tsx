"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Ticket={id:string;user_id:string;category:string;status:string;created_at:string};
type Msg={id:string;ticket_id:string;sender_user_id:string|null;sender_kind:"user"|"support";body:string;created_at:string};
type PendingDonation={id:string;user_id:string;amount:number;reference:string|null;proof_path:string|null;created_at:string};
const cats=[
 ["general_inquiry","General Inquiry","Questions about OrvenSMP, the community, or anything you need help understanding."],
 ["credits_support","Credits Support","Help with GCash verification, Orven Credits, balances, or support contributions."],
 ["orven_games_support","Orven Games Support","Report a game problem, score issue, or anything related to Orven Games."],
 ["suggestion","Suggestion","Share an idea or suggestion that could make OrvenSMP even better."]
] as const;
const label=(x:string)=>cats.find(c=>c[0]===x)?.[1]||"Orven Support";

export default function OrvenSupportClient({userId,isAdmin}:{userId:string;isAdmin:boolean}){
 const supabase=useMemo(()=>createClient(),[]);
 const [tickets,setTickets]=useState<Ticket[]>([]),[active,setActive]=useState<string|null>(null);
 const [messages,setMessages]=useState<Msg[]>([]),[pending,setPending]=useState<PendingDonation[]>([]);
 const [text,setText]=useState(""),[notice,setNotice]=useState(""),[reviewing,setReviewing]=useState<string|null>(null);
 const [rejecting,setRejecting]=useState<PendingDonation|null>(null),[rejectReason,setRejectReason]=useState("");

 async function loadTickets(){
   const {data,error}=await supabase.from("orven_support_tickets").select("*").order("updated_at",{ascending:false});
   if(error){setNotice(error.message);return}
   const next=(data||[]) as Ticket[];setTickets(next);
   setActive(current=>current&&next.some(t=>t.id===current)?current:(next[0]?.id||null));
 }
 async function loadMessages(id=active){
   if(!id){setMessages([]);setPending([]);return}
   const {data,error}=await supabase.from("orven_support_ticket_messages").select("id,ticket_id,sender_user_id,sender_kind,body,created_at").eq("ticket_id",id).order("created_at");
   if(error)setNotice(error.message);else setMessages((data||[]) as Msg[]);
 }
 async function loadPending(id=active){
   if(!isAdmin||!id){setPending([]);return}
   const t=tickets.find(x=>x.id===id);if(!t||t.category!=="credits_support"){setPending([]);return}
   const {data,error}=await supabase.from("support_donations")
     .select("id,user_id,amount,reference,proof_path,created_at")
     .eq("user_id",t.user_id).eq("method","gcash").eq("status","pending").order("created_at");
   if(error)setNotice(error.message);else setPending((data||[]) as PendingDonation[]);
 }

 useEffect(()=>{void loadTickets()},[]);
 useEffect(()=>{void loadMessages();void loadPending()},[active,tickets.length]);
 useEffect(()=>{
   const ch=supabase.channel("orven-support-live-v104")
    .on("postgres_changes",{event:"*",schema:"public",table:"orven_support_ticket_messages"},()=>void loadMessages())
    .on("postgres_changes",{event:"*",schema:"public",table:"orven_support_tickets"},()=>void loadTickets())
    .on("postgres_changes",{event:"*",schema:"public",table:"support_donations"},()=>void loadPending())
    .subscribe();
   return()=>{void supabase.removeChannel(ch)}
 },[active,tickets,isAdmin]);

 async function open(category:string){
   const {data,error}=await supabase.rpc("orven_open_support_ticket",{p_category:category});
   if(error)return setNotice(error.message);
   await loadTickets();setActive(data);setNotice("");
 }
 async function send(e:FormEvent){
   e.preventDefault();if(!active||!text.trim())return;
   const {error}=await supabase.from("orven_support_ticket_messages").insert({ticket_id:active,sender_user_id:userId,sender_kind:isAdmin?"support":"user",body:text.trim()});
   if(error)return setNotice(error.message);setText("");await loadMessages();
 }
 async function viewReceipt(path:string|null){
   if(!path)return setNotice("No receipt was attached to this submission.");
   const {data,error}=await supabase.storage.from("support-proofs").createSignedUrl(path,120);
   if(error||!data?.signedUrl)return setNotice(error?.message||"Unable to open receipt.");
   window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function approvePayment(d:PendingDonation){
   if(!active||reviewing)return;
   if(!window.confirm(`Verify this GCash payment of ₱${Number(d.amount).toLocaleString()} and add the same amount to the member's Orven Credits?\n\nAfter approval, this Credits Support conversation will be cleared and closed.`))return;
   setReviewing(d.id);setNotice("");
   const {error}=await supabase.rpc("orven_review_gcash_support",{p_donation:d.id,p_approve:true});
   setReviewing(null);
   if(error)return setNotice(error.message);
   setPending([]);setMessages([]);setActive(null);
   await loadTickets();
   setNotice(`Payment verified. ₱${Number(d.amount).toLocaleString()} Orven Credits were issued and the completed support conversation was cleared.`);
 }
 async function rejectPayment(d:PendingDonation){
   if(!active||reviewing)return;
   setRejecting(d);setRejectReason("");setNotice("");
 }
 async function confirmReject(){
   const d=rejecting;if(!d||!active||reviewing)return;
   const reason=rejectReason.trim();
   if(reason.length<3)return setNotice("Please enter a rejection reason for the member.");
   setReviewing(d.id);setNotice("");
   const {error}=await supabase.rpc("orven_reject_gcash_support",{p_donation:d.id,p_reason:reason});
   setReviewing(null);
   if(error)return setNotice(error.message);
   setRejecting(null);setRejectReason("");await loadPending();await loadMessages();
   setNotice("Payment rejected. The member received your reason and no Orven Credits were issued.");
 }
 async function deletePayment(d:PendingDonation){
   if(!active||reviewing)return;
   if(!window.confirm(`Permanently delete this invalid GCash payment request of ₱${Number(d.amount).toLocaleString()}?\n\nThis removes the payment request and its linked support ticket/conversation. This cannot be undone.`))return;
   setReviewing(d.id);setNotice("");
   const {error}=await supabase.rpc("orven_delete_gcash_support",{p_donation:d.id});
   setReviewing(null);
   if(error)return setNotice(error.message);
   setPending([]);setMessages([]);setActive(null);await loadTickets();
   setNotice("Invalid payment request deleted. No Orven Credits were issued.");
 }

 async function closeTicket(){
   if(!active||reviewing)return;
   const ticket=tickets.find(t=>t.id===active);if(!ticket)return;
   if(!window.confirm("Close this ticket permanently?\n\nThe conversation, receipt/payment request and transaction details linked to this ticket will be permanently deleted. Only the permanent ledger record (date + credited/donated amount, if applicable) will remain."))return;
   setReviewing(active);setNotice("");
   const {error}=await supabase.rpc("orven_close_support_ticket",{p_ticket:active});
   setReviewing(null);
   if(error)return setNotice(error.message);
   setActive(null);setMessages([]);setPending([]);await loadTickets();setNotice("Ticket closed and private transaction/support data permanently cleared.");
 }
 const ticket=tickets.find(t=>t.id===active);
 return <div className="orvenSupportShell">
  <aside className="supportInbox">
   <div className="supportIdentity"><span>◇</span><div><b>Orven Support</b><small>Official community support</small></div></div>
   {!isAdmin&&<div className="supportStart"><strong>Start a conversation</strong>{cats.map(c=><button key={c[0]} onClick={()=>open(c[0])}><b>{c[1]}</b><small>{c[2]}</small></button>)}</div>}
   <div className="supportTickets"><strong>{isAdmin?"Support tickets":"Your tickets"}</strong>{tickets.map(t=><button className={active===t.id?"active":""} key={t.id} onClick={()=>setActive(t.id)}><b>{label(t.category)}</b><small>{t.status==="open"?"Open":"Closed"} · {new Date(t.created_at).toLocaleDateString()}</small></button>)}</div>
  </aside>

  <section className="supportConversation">{ticket?<>
   <header><div><span className="supportAvatar">◇</span><div><b>Orven Support</b><small>{label(ticket.category)} · {ticket.status}</small></div></div>{isAdmin&&<button type="button" className="closeSupportTicketButton" disabled={!!reviewing} onClick={closeTicket}>Close Ticket</button>}</header>

   {isAdmin&&ticket.category==="credits_support"&&pending.length>0&&<div className="paymentReviewStack">
    {pending.map(d=><div className="paymentReviewCard" key={d.id}>
      <div><span>GCASH PAYMENT VERIFICATION</span><strong>₱{Number(d.amount).toLocaleString()}</strong><small>Reference: {d.reference||"N/A"} · Submitted {new Date(d.created_at).toLocaleString()}</small></div>
      <div className="paymentReviewActions"><button type="button" className="receiptButton" onClick={()=>viewReceipt(d.proof_path)}>View receipt</button><button type="button" className="rejectPaymentButton" disabled={!!reviewing} onClick={()=>rejectPayment(d)}>Reject</button><button type="button" className="deletePaymentButton" disabled={!!reviewing} onClick={()=>deletePayment(d)}>Delete invalid</button><button type="button" className="verifyPaymentButton" disabled={!!reviewing} onClick={()=>approvePayment(d)}>{reviewing===d.id?"Processing…":"✓ Verify & approve"}</button></div>
    </div>)}
   </div>}

   <div className="supportChatStream">{messages.map(m=><div key={m.id} className={`supportChatBubble ${m.sender_kind==="support"?"official":"member"}`}><b>{m.sender_kind==="support"?"Orven Support":isAdmin?"Member":"You"}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}</div>
   {ticket.status==="open"&&<form onSubmit={send}><textarea value={text} onChange={e=>setText(e.target.value)} maxLength={4000} placeholder={isAdmin?"Reply as Orven Support…":"Message Orven Support…"}/><button>Send</button></form>}
  </>:<div className="supportEmpty"><span>◇</span><h2>Orven Support</h2><p>{isAdmin?"Select a support ticket to reply as Orven Support.":"Choose what you need help with to create a support ticket."}</p></div>}
  {notice&&<div className="supportNotice">{notice}</div>}</section>
  {isAdmin&&rejecting&&<div className="ticketAdminModalBackdrop" role="dialog" aria-modal="true"><div className="ticketAdminModal"><span>ADMIN PAYMENT REVIEW</span><h3>Reject ₱{Number(rejecting.amount).toLocaleString()} payment?</h3><p>Tell the member why this payment could not be verified. This reason will be sent by <b>Orven Support</b> and only admins can see this review control.</p><textarea autoFocus maxLength={500} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Example: The reference number does not match the uploaded receipt."/><div><button type="button" className="receiptButton" disabled={!!reviewing} onClick={()=>{setRejecting(null);setRejectReason("")}}>Cancel</button><button type="button" className="rejectPaymentButton" disabled={!!reviewing||rejectReason.trim().length<3} onClick={confirmReject}>{reviewing?"Rejecting…":"Reject & send reason"}</button></div></div></div>}
 </div>;
}