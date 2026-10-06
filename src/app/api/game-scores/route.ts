import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
const GAMES=["merge","block","memory","math","typing","dodge","slice","tiles"];
export async function GET(req:NextRequest){
 const game=req.nextUrl.searchParams.get("game")||""; if(!GAMES.includes(game))return NextResponse.json({error:"Invalid game"},{status:400});
 const s=await createClient(); const {data,error}=await s.from("game_scores").select("id,user_id,score,updated_at,profiles:profiles!game_scores_user_id_fkey(username,display_name,avatar_url)").eq("game",game).order("score",{ascending:false}).limit(10);
 return NextResponse.json({scores:data||[],error:error?.message||null});
}
export async function POST(req:NextRequest){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Sign in to save scores."},{status:401});
 const body=await req.json();if(!GAMES.includes(body.game)||!Number.isFinite(body.score)||body.score<0)return NextResponse.json({error:"Invalid score"},{status:400});
 const score=Math.floor(body.score);const {data:old}=await s.from("game_scores").select("score").eq("user_id",user.id).eq("game",body.game).maybeSingle();
 if(old&&old.score>=score)return NextResponse.json({saved:false,best:old.score});
 const {error}=await s.from("game_scores").upsert({user_id:user.id,game:body.game,score},{onConflict:"user_id,game"});
 return NextResponse.json(error?{error:error.message}:{saved:true,best:score},{status:error?400:200});
}
export async function DELETE(req:NextRequest){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:p}=await s.from("profiles").select("role").eq("id",user.id).maybeSingle();if(p?.role!=="admin")return NextResponse.json({error:"Admin only"},{status:403});
 const body=await req.json();if(!GAMES.includes(body.game))return NextResponse.json({error:"Invalid game"},{status:400});
 let q=s.from("game_scores").delete().eq("game",body.game); if(body.userId)q=q.eq("user_id",body.userId);
 const {error}=await q;return NextResponse.json(error?{error:error.message}:{ok:true},{status:error?400:200});
}