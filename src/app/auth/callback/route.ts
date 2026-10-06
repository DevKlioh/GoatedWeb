import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
 const url=new URL(request.url); const code=url.searchParams.get("code"); const next=url.searchParams.get("next") || "/";
 if(code){
   const supabase=await createClient(); const {error}=await supabase.auth.exchangeCodeForSession(code);
   if(!error){
     const {data:{user}}=await supabase.auth.getUser();
     if(user){
       const m=user.user_metadata||{};
       await supabase.from("profiles").upsert({
         id:user.id,
         username:m.user_name||m.preferred_username||m.username||null,
         display_name:m.full_name||m.name||m.user_name||m.preferred_username||m.username||"OrvenSMP User",
         avatar_url:m.avatar_url||m.picture||null
       },{onConflict:"id",ignoreDuplicates:true});
     }
     return NextResponse.redirect(new URL(next,url.origin));
   }
 }
 return NextResponse.redirect(new URL("/?authError=1",url.origin));
}
