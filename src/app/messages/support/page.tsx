import {redirect} from "next/navigation";
import Header from "@/components/Header";
import OrvenSupportClient from "@/components/OrvenSupportClient";
import {createClient} from "@/lib/supabase/server";
export default async function SupportMessagesPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/?auth=signin");
 const {data:p}=await supabase.from("profiles").select("username,display_name,avatar_url,role").eq("id",user.id).maybeSingle();
 const isAdmin=(p?.role||"").toLowerCase()==="admin";
 return <><Header user={{name:p?.display_name||p?.username||"Member",username:p?.username||null,avatar:p?.avatar_url||null}}/><main className="messagesPage"><OrvenSupportClient userId={user.id} isAdmin={isAdmin}/></main></>
}