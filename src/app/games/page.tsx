import Header from "@/components/Header";
import OrvenGamesClient from "@/components/OrvenGamesClient";
import {createClient} from "@/lib/supabase/server";

export default async function GamesPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 let profile:any=null;
 if(user){const {data}=await supabase.from("profiles").select("username,display_name,avatar_url,role").eq("id",user.id).maybeSingle();profile=data}
 const headerUser=user?{name:profile?.display_name||profile?.username||user.email?.split("@")[0]||"Player",username:profile?.username||undefined,avatar:profile?.avatar_url||null,role:profile?.role||"member"}:null;
 return <><Header user={headerUser}/><main className="gamesPage"><div className="gamesHero"><span>ORVEN GAMES</span><h1>Pick a game. Chase the top score.</h1><p>Four quick games built for endless replay. Your best score can earn a place on each game's Top 10 leaderboard.</p></div><OrvenGamesClient userId={user?.id||null} isAdmin={profile?.role==="admin"}/></main></>
}