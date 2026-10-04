import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const supabase=await createClient();
  const {data:r}=await supabase.from("resources").select("id,owner_id,pricing_type,file_bucket,file_path").eq("id",id).maybeSingle();
  if(!r||!r.file_path)return NextResponse.json({error:"Resource file not found."},{status:404});

  if(r.pricing_type==="premium"){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.redirect(new URL("/",process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"));
    let allowed=user.id===r.owner_id;
    if(!allowed){const {data:p}=await supabase.from("resource_purchases").select("resource_id").eq("resource_id",r.id).eq("buyer_id",user.id).eq("status","paid").maybeSingle();allowed=!!p;}
    if(!allowed)return NextResponse.json({error:"Purchase required."},{status:403});
    const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!service)return NextResponse.json({error:"Premium downloads are not configured yet."},{status:503});
    const admin=createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!,service,{auth:{persistSession:false}});
    await admin.rpc("increment_resource_download",{resource_uuid:r.id});
    const {data,error}=await admin.storage.from(r.file_bucket).createSignedUrl(r.file_path,60);
    if(error||!data?.signedUrl)return NextResponse.json({error:"Could not create download."},{status:500});
    return NextResponse.redirect(data.signedUrl);
  }

  await supabase.rpc("increment_resource_download",{resource_uuid:r.id});
  const {data}=supabase.storage.from(r.file_bucket).getPublicUrl(r.file_path);
  return NextResponse.redirect(data.publicUrl);
}