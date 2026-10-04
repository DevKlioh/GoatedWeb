import Link from "next/link";
import Header from "@/components/Header";
import AuthButton from "@/components/AuthButton";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let dbProfile: { username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("username,display_name,bio,avatar_url").eq("id", user.id).maybeSingle();
    dbProfile = data;
  }
  const fallbackName = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.preferred_username || user?.email || "Account") as string;
  const profile = user ? {
    name: dbProfile?.display_name || fallbackName,
    username: dbProfile?.username || null,
    avatar: dbProfile?.avatar_url || (user.user_metadata?.avatar_url || user.user_metadata?.picture || null) as string | null
  } : null;

  if (user && profile) return <><Header user={profile}/><main className="socialShell">
    <aside className="leftRail">
      <div className="railCard"><span className="eyebrow">NAVIGATION</span><Link className="railLink active" href="/">⌂ <span>Home</span></Link>{profile.username && <Link className="railLink" href={`/profile/${encodeURIComponent(profile.username)}`}>◎ <span>Profile</span></Link>}<span className="railLink disabled">◇ <span>Notifications</span><small>Soon</small></span><Link className="railLink" href="/settings">⚙ <span>Settings</span></Link></div>
    </aside>
    <section className="feedColumn">
      <div className="feedHeading"><div><span className="eyebrow">HOME</span><h1>Your feed</h1></div><span className="livePill">Connected</span></div>
      <article className="composerCard"><div className="miniAvatar">{profile.avatar ? <img src={profile.avatar} alt=""/> : profile.name.slice(0,1).toUpperCase()}</div><div><strong>What's happening?</strong><p>Posting is the next feature we'll connect to this feed.</p></div><button disabled>Post soon</button></article>
      <article className="emptyFeed"><span className="emptyIcon">✦</span><h2>Your home is ready.</h2><p>Profiles are now connected. Posts, follows and recommendations can plug into this feed next.</p></article>
    </section>
    <aside className="rightRail"><div className="profileMiniCard"><div className="miniAvatar large">{profile.avatar ? <img src={profile.avatar} alt=""/> : profile.name.slice(0,1).toUpperCase()}</div><strong>{profile.name}</strong><span>{profile.username ? `@${profile.username}` : "Choose a username in Settings"}</span>{profile.username ? <Link href={`/profile/${encodeURIComponent(profile.username)}`}>View profile</Link> : <Link href="/settings">Finish profile</Link>}</div><div className="sideInfo"><span className="eyebrow">COMING NEXT</span><strong>Find your people</strong><p>Follow suggestions and discovery will live here.</p></div></aside>
  </main></>;

  return <><Header user={null}/><main className="page"><section className="hero"><div className="eyebrow">YOUR COMMUNITY, YOUR SPACE</div><h1>A cleaner place to<br/>connect and share.</h1><p>Secure sign in is ready with Discord, Google, or your verified email account. Create your profile and join the community.</p><div className="heroAction"><AuthButton user={null}/><small>Use social login or create your own account.</small></div></section><section className="featureGrid"><article><span>01</span><h2>Flexible sign in</h2><p>Use Discord, Google, or a verified email account while Supabase securely handles authentication.</p></article><article><span>02</span><h2>Your own profile</h2><p>Choose a unique username, display name and bio that other members can discover.</p></article><article><span>03</span><h2>Built to grow</h2><p>The home feed is ready for posts, follows, notifications and search in the next phases.</p></article></section></main></>;
}
