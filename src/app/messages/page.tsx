import { redirect } from "next/navigation";
import Header from "@/components/Header";
import MessagesClient from "@/components/MessagesClient";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage({searchParams}:{searchParams:Promise<{with?:string}>}){
 const q=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/?auth=signin");

 const {data:me}=await supabase.from("profiles")
   .select("id,username,display_name,avatar_url,last_seen_at").eq("id",user.id).maybeSingle();

 // A missing profile should never be allowed to crash the client-side messages UI.
 const safeMe={
   id:user.id,
   username:me?.username||user.email?.split("@")[0]||"member",
   display_name:me?.display_name||me?.username||"Member",
   avatar_url:me?.avatar_url||null,
   last_seen_at:me?.last_seen_at||null
 };

 const {data:messages}=await supabase.from("direct_messages")
   .select("sender_id,recipient_id").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
   .order("created_at",{ascending:false}).limit(500);

 const ids=new Set<string>();
 (messages||[]).forEach(m=>{
   const other=m.sender_id===user.id?m.recipient_id:m.sender_id;
   if(other&&other!==user.id)ids.add(other);
 });
 if(q.with&&q.with!==user.id)ids.add(q.with);

 const {data:people}=ids.size
   ?await supabase.from("profiles").select("id,username,display_name,avatar_url,last_seen_at").in("id",[...ids])
   :{data:[] as any[]};

 const validPeople=(people||[]).filter((p:any)=>p?.id&&p.id!==user.id);
 const validInitial=q.with&&validPeople.some((p:any)=>p.id===q.with)?q.with:null;
 const header={name:safeMe.display_name,username:safeMe.username,avatar:safeMe.avatar_url};

 return <><PresenceHeartbeat userId={user.id}/><Header user={header}/>
  <main className="messagesPage"><MessagesClient me={safeMe} people={validPeople as any} initialWith={validInitial}/></main>
 </>;
}
