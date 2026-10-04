import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import ProfilePosts from "@/components/ProfilePosts";
import ProfileFollowButton from "@/components/ProfileFollowButton";

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

  const [{ count: postCount }, { count: followerCount }, { count: followingCount }, { data: profilePosts }, { count: pluginCount }] = await Promise.all([
    supabase.from("posts").select("*",{count:"exact",head:true}).eq("author_id",viewed.id),
    supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",viewed.id),
    supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",viewed.id),
    supabase.from("posts").select("id,content,created_at,updated_at,image_url,author_id,profiles:profiles!posts_author_id_fkey_profiles(username,display_name,avatar_url),post_likes(user_id),post_comments(id)").eq("author_id",viewed.id).order("created_at",{ascending:false}).limit(50),
    supabase.from("resources").select("*",{count:"exact",head:true}).eq("owner_id",viewed.id).eq("status","published")
  ]);
  let initialFollowing=false;
  if(user && !own){
    const {data:f}=await supabase.from("follows").select("following_id").eq("follower_id",user.id).eq("following_id",viewed.id).maybeSingle();
    initialFollowing=!!f;
  }

  return <><Header user={me}/><main className="socialProfilePage">
    <section className="socialProfileShell">
      <div className="socialCover"><div className="coverPixels"/><span className="coverLabel">GOATEDPLUGINS • MINECRAFT COMMUNITY</span></div>
      <div className="socialProfileHeader">
        <div className="socialAvatar">{viewed.avatar_url ? <img src={viewed.avatar_url} alt=""/> : <span>{initial}</span>}</div>
        <div className="socialNameBlock"><h1>{name}</h1><span>@{viewed.username}</span><p><b>{followerCount || 0}</b> followers · <b>{followingCount || 0}</b> following · <b>{postCount || 0}</b> posts</p></div>
        <div className="profileHeaderActions">{own ? <Link className="profileGoldAction" href="/settings">✎ Edit profile</Link> : user ? <ProfileFollowButton viewerId={user.id} targetId={viewed.id} initialFollowing={initialFollowing}/> : <Link className="profileGoldAction" href="/">Sign in to follow</Link>}<button className="profileMoreButton">•••</button></div>
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
        <article id="plugins" className="profilePanel"><div className="profilePanelHeading"><h2>Plugins</h2><span>{pluginCount || 0} published</span></div><div className="profileMiniEmpty"><span>⬡</span><p>Published Minecraft plugins will appear here.</p></div></article>
        <article className="profilePanel"><div className="profilePanelHeading"><h2>Highlights</h2></div><div className="profileMiniEmpty"><span>✦</span><p>Profile highlights will appear here.</p></div></article>
      </aside>

      <section id="posts" className="profileFeedColumn">
        <article className="profilePanel postsPanel"><div className="profilePanelHeading postsHeading"><h2>Posts <span className="profilePostCount">{postCount || 0}</span></h2></div></article>
        <ProfilePosts posts={(profilePosts || []) as any} currentUserId={user?.id || null}/>
      </section>
    </section>
  </main></>;
}
