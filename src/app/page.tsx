import Header from "@/components/Header";
import AuthButton from "@/components/AuthButton";
import { createClient } from "@/lib/supabase/server";
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? { name: (user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || user.email || "Account") as string, avatar: (user.user_metadata?.avatar_url || user.user_metadata?.picture || null) as string | null } : null;
  return <><Header user={profile}/><main className="page"><section className="hero"><div className="eyebrow">YOUR COMMUNITY, YOUR SPACE</div><h1>A cleaner place to<br/>connect and share.</h1><p>Discord-powered sign in is ready. We’ll build posts, profiles, discovery and the rest of the social experience on this secure foundation.</p>{!profile ? <div className="heroAction"><AuthButton user={null}/><small>No separate password required.</small></div> : <div className="welcomeCard"><strong>Welcome back, {profile.name}.</strong><span>Your account is connected and ready.</span></div>}</section><section className="featureGrid"><article><span>01</span><h2>Discord login</h2><p>Users authenticate through Discord and Supabase instead of a homemade password system.</p></article><article><span>02</span><h2>Private by design</h2><p>Secrets stay outside the repository and privileged database access is never shipped to the browser.</p></article><article><span>03</span><h2>Built to grow</h2><p>This foundation is ready for profiles, posts, follows, notifications and search in later phases.</p></article></section></main></>;
}
