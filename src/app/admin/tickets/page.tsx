import {redirect} from "next/navigation";
import Header from "@/components/Header";
import OrvenSupportClient from "@/components/OrvenSupportClient";
import {createClient} from "@/lib/supabase/server";
export default async function AdminTicketsPage(){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/?auth=signin");
 const {data:p}=await s.from("profiles").select("username,display_name,avatar_url,role").eq("id",user.id).maybeSingle();
 if(!p||p.role!=="admin")redirect("/");
 return <><Header user={{name:p.display_name||p.username||"Admin",username:p.username||undefined,avatar:p.avatar_url||null,role:p.role}}/><main className="adminTicketsPage"><div className="adminTicketsHeading"><span>ORVEN SUPPORT ADMIN</span><h1>Tickets</h1><p>Review payment verification requests and manage support conversations. These controls are visible to admins only.</p></div><OrvenSupportClient userId={user.id} isAdmin={true}/></main></>;
}