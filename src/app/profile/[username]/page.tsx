import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: viewed } = await supabase.from("profiles").select("id,username,display_name,bio,avatar_url,created_at").ilike("username", username).maybeSingle();
  if (!viewed) notFound();

  let me: any = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("username,display_name,avatar_url").eq("id", user.id).maybeSingle();
    const fallback = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account") as string;
    me = { name: data?.display_name || fallback, username: data?.username || null, avatar: data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null };
  }
  const own = user?.id === viewed.id;
  const name = viewed.display_name || viewed.username || "Member";
  const joined = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(viewed.created_at));

  return <><Header user={me}/><main className="profilePage"><section className="profileHero"><div className="profileCover"><span>GOATED</span></div><div className="profileIdentity"><div className="profileAvatar">{viewed.avatar_url ? <img src={viewed.avatar_url} alt=""/> : name.slice(0,1).toUpperCase()}</div><div className="profileTitle"><h1>{name}</h1><span>@{viewed.username}</span></div>{own && <a className="editProfileButton" href="/settings">Edit profile</a>}</div><p className="profileBio">{viewed.bio || (own ? "Add a bio from Account Settings and tell the community about yourself." : "This member hasn't added a bio yet.")}</p><div className="profileStats"><div><strong>0</strong><span>Posts</span></div><div><strong>0</strong><span>Followers</span></div><div><strong>0</strong><span>Following</span></div><div className="joinedStat"><span>Joined {joined}</span></div></div></section><section className="profileContent"><span className="eyebrow">POSTS</span><div className="emptyFeed compact"><span className="emptyIcon">✦</span><h2>No posts yet.</h2><p>{own ? "Your future posts will appear here." : `${name} hasn't posted anything yet.`}</p></div></section></main></>;
}
