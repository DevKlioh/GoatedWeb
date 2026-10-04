import Link from "next/link";
import Header from "@/components/Header";
import AuthButton from "@/components/AuthButton";
import GoatedLogo from "@/components/GoatedLogo";
import { createClient } from "@/lib/supabase/server";
import DashboardAccountMenu from "@/components/DashboardAccountMenu";
import HomeSocialFeed from "@/components/HomeSocialFeed";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: any = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = data || {
      id: user.id,
      username: user.user_metadata?.preferred_username || user.email?.split("@")[0] || "player",
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Player",
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
    };
  }

  if (!user) {
    return <>
      <Header user={null}/>
      <main className="landingPage">
        <section className="pluginHero">
          <div className="heroGlow"/>
          <div className="pixelDecor pixelOne"/>
          <div className="pixelDecor pixelTwo"/>
          <div className="heroBrand"><GoatedLogo/></div>
          <span className="goldEyebrow">MINECRAFT PLUGINS • COMMUNITY • DEVELOPMENT</span>
          <h1>Build better.<br/><span>Play smarter.</span></h1>
          <p>A home for Minecraft server owners, developers and players to discover plugins, share ideas, get support and grow together.</p>
          <div className="heroButtons"><AuthButton user={null}/><a className="secondaryButton" href="#features">Explore GoatedPlugins</a></div>
        </section>
        <section id="features" className="pluginFeatures">
          <article><span>◆</span><h2>Discover Plugins</h2><p>Find tools and ideas built for modern Minecraft communities.</p></article>
          <article><span>▣</span><h2>Developer Community</h2><p>Connect with creators, server owners and other builders.</p></article>
          <article><span>✦</span><h2>Built for Minecraft</h2><p>A focused community instead of another generic social platform.</p></article>
        </section>
      </main>
    </>;
  }

  const username = profile?.username || "player";
  const name = profile?.display_name || username;
  const avatar = profile?.avatar_url;

  const { data: postsData } = await supabase
    .from("posts")
    .select("id,content,created_at,updated_at,image_url,author_id,profiles:profiles!posts_author_id_fkey_profiles(username,display_name,avatar_url),post_likes(user_id),post_comments(id)")
    .order("created_at",{ascending:false})
    .limit(30);
  const posts = postsData || [];

  return <div className="appShell">
    <aside className="sideNav">
      <GoatedLogo/>
      <nav>
        <Link className="active" href="/">⌂ <span>Home</span></Link>
        <Link href="/profile/me">♙ <span>Profile</span></Link>
        <a href="#explore">◇ <span>Explore</span></a>
        <a href="#notifications">♧ <span>Notifications</span></a>
        <a href="#messages">✉ <span>Messages</span></a>
        <Link href="/settings">⚙ <span>Settings</span></Link>
      </nav>
      <div className="sidePromo"><span className="crown">♛</span><h3>Build Better Minecraft Servers</h3><p>Discover, share and discuss Minecraft plugins with the Goated community.</p><button>Explore Plugins</button></div>
    </aside>

    <div className="appMain">
      <header className="dashboardTop">
        <div className="dashboardSearch">⌕ <input placeholder="Search users, plugins, posts..."/><kbd>Ctrl K</kbd></div>
        <div className="topActions"><button className="iconButton">♢</button><DashboardAccountMenu name={name} username={username} avatar={avatar} /></div>
      </header>

      <div className="dashboardGrid">
        <main className="feedColumn">
          <section className="minecraftWelcome">
            <div className="voxelSky"/>
            <span className="goldEyebrow">WELCOME HOME</span>
            <h1>Welcome to <b>GoatedPlugins</b></h1>
            <p>The community for Minecraft plugin developers, server owners and players.</p>
            <div className="welcomePerks"><span>⬡ Share Plugins</span><span>▣ Get Support</span><span>♙ Grow Together</span></div>
          </section>

          <HomeSocialFeed userId={user.id} name={name} username={username} avatar={avatar} initialPosts={posts as any} />
        </main>

        <aside className="rightRail">
          <section className="railCard profileCard">
            <div className="railTitle"><b>♛ Your Profile</b><Link href="/profile/me">View Profile →</Link></div>
            <div className="profileIdentity">{avatar ? <img src={avatar} alt=""/> : <div className="bigAvatar">{name.slice(0,1).toUpperCase()}</div>}<div><strong>{name}</strong><span>@{username}</span></div></div>
            <div className="profileStats"><div><b>0</b><span>Posts</span></div><div><b>0</b><span>Followers</span></div><div><b>0</b><span>Following</span></div></div>
            <Link className="editProfileButton" href="/settings">✎ Edit Profile</Link>
          </section>
          <section className="railCard"><div className="railTitle"><b>✦ Goated Topics</b></div><div className="topic">#plugins <span>Discover</span></div><div className="topic">#minecraft <span>Community</span></div><div className="topic">#development <span>Build</span></div><div className="topic">#server <span>Discuss</span></div></section>
        </aside>
      </div>
    </div>
  </div>;
}