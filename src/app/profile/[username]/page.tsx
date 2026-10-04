import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: viewed } = await supabase.from("profiles")
    .select("id,username,display_name,bio,avatar_url,created_at")
    .ilike("username", username).maybeSingle();
  if (!viewed) notFound();

  let me: any = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
    const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
    me = { name: data?.display_name || fallback, username: data?.username || null, avatar: data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  }

  const own = user?.id === viewed.id;
  const name = viewed.display_name || viewed.username || "Member";
  const initial = name.slice(0,1).toUpperCase();
  const joined = new Intl.DateTimeFormat("en", { month:"long", year:"numeric" }).format(new Date(viewed.created_at));

  return <><Header user={me}/><main className="socialProfilePage">
    <section className="socialProfileShell">
      <div className="socialCover"><div className="coverPixels"/><span className="coverLabel">GOATEDPLUGINS • MINECRAFT COMMUNITY</span></div>
      <div className="socialProfileHeader">
        <div className="socialAvatar">{viewed.avatar_url ? <img src={viewed.avatar_url} alt=""/> : <span>{initial}</span>}</div>
        <div className="socialNameBlock"><h1>{name}</h1><span>@{viewed.username}</span><p><b>0</b> followers · <b>0</b> following</p></div>
        <div className="profileHeaderActions">{own ? <Link className="profileGoldAction" href="/settings">✎ Edit profile</Link> : <button className="profileGoldAction">+ Follow</button>}<button className="profileMoreButton">•••</button></div>
      </div>
      <nav className="profileTabs"><a className="active" href="#posts">Posts</a><a href="#about">About</a><a href="#plugins">Plugins</a><a href="#media">Media</a></nav>
    </section>

    <section className="profileBodyGrid">
      <aside className="profileLeftColumn">
        <article id="about" className="profilePanel introPanel"><h2>About</h2>
          <p className="profileAboutText">{viewed.bio || (own ? "Add a bio to tell the GoatedPlugins community about yourself." : "This member hasn't added a bio yet.")}</p>
          <div className="profileDetail"><span>◆</span><div><small>Username</small><strong>@{viewed.username}</strong></div></div>
          <div className="profileDetail"><span>◷</span><div><small>Joined</small><strong>{joined}</strong></div></div>
          <div className="profileDetail"><span>⬡</span><div><small>Community</small><strong>GoatedPlugins</strong></div></div>
          {own && <Link className="wideProfileButton" href="/settings">Edit details</Link>}
        </article>
        <article id="plugins" className="profilePanel"><div className="profilePanelHeading"><h2>Plugins</h2><span>0 published</span></div><div className="profileMiniEmpty"><span>⬡</span><p>Published Minecraft plugins will appear here.</p></div></article>
        <article className="profilePanel"><div className="profilePanelHeading"><h2>Highlights</h2></div><div className="profileMiniEmpty"><span>✦</span><p>Profile highlights will appear here.</p></div></article>
      </aside>

      <section id="posts" className="profileFeedColumn">
        {own && <article className="profilePanel profileComposer"><div className="composerTop"><div className="composerProfileAvatar">{viewed.avatar_url ? <img src={viewed.avatar_url} alt=""/> : <span>{initial}</span>}</div><div className="profileComposerInput">Share something with the GoatedPlugins community...</div></div><div className="profileComposerTools"><button>▧ Photo</button><button>⬡ Plugin</button><button>▥ Poll</button></div></article>}
        <article className="profilePanel postsPanel"><div className="profilePanelHeading postsHeading"><h2>Posts</h2><div><button>☷ Filters</button><button>⚙ Manage posts</button></div></div><div className="postViewTabs"><button className="active">☰ List view</button><button>▦ Grid view</button></div></article>
        <article className="profilePanel profileEmptyPosts"><span className="emptyPluginIcon">⬡</span><h2>No posts yet</h2><p>{own ? "Your posts, plugin releases and community updates will show up here." : `${name} hasn't shared anything yet.`}</p></article>
      </section>
    </section>
  </main></>;
}
