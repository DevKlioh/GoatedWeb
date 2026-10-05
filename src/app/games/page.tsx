import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import OrvenLogo from "@/components/OrvenLogo";
import LiveSearch from "@/components/LiveSearch";
import DashboardAccountMenu from "@/components/DashboardAccountMenu";
import OrvenMenu from "@/components/OrvenMenu";

export default async function OrvenGames(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return <main className="gamesStandalone"><Link href="/" className="gamesBrand"><OrvenLogo/></Link><section className="gamesHero"><span>ORVEN GAMES</span><h1>Play inside the OrvenSMP community.</h1><p>The Orven Games center is now ready. Games will be added here as we build them.</p><Link className="gamesBack" href="/">← Back to Home</Link></section></main>;
 const {data:profile}=await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
 const username=profile?.username||user.email?.split("@")[0]||"player",name=profile?.display_name||username,avatar=profile?.avatar_url;
 return <div className="appShell"><aside className="sideNav"><OrvenLogo/><nav><Link href="/">⌂ <span>Home</span></Link><Link href="/profile/me">♙ <span>Profile</span></Link><Link className="active" href="/games">◇ <span>Orven Games</span></Link><Link href="/notifications">♧ <span>Notifications</span></Link><Link href="/messages">✉ <span>Messages</span></Link><Link href="/settings">⚙ <span>Settings</span></Link></nav></aside><div className="appMain"><header className="dashboardTop"><div className="dashboardSearchRow"><LiveSearch variant="dashboard"/><OrvenMenu/></div><div className="topActions"><DashboardAccountMenu name={name} username={username} avatar={avatar} role={profile?.role||"member"}/></div></header><main className="orvenGamesPage"><section className="gamesHero"><span>ORVEN GAMES</span><h1>Game Center</h1><p>This is the home of OrvenSMP's community games. The game system is ready for us to start adding games without depending on the Minecraft server yet.</p></section><section className="gamesEmpty"><div>◇</div><h2>Games are coming next</h2><p>We can build each Orven game here one at a time while Orven Shop, Orven Rewards and Orven Lotto remain in development.</p></section></main></div></div>;
}
