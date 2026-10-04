"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { user: { name: string; avatar?: string | null } | null };
export default function AuthButton({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();
  async function login() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
    if (error) alert(error.message);
  }
  async function logout() {
    await supabase.auth.signOut();
    router.push("/"); router.refresh();
  }
  if (!user) return <button className="discordButton" onClick={login}>Continue with Discord</button>;
  return <details className="accountMenu"><summary>{user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatarFallback">{user.name.slice(0,1).toUpperCase()}</span>}<span>{user.name}</span></summary><div className="menuPanel"><a href="/settings">Account Settings</a><button onClick={logout}>Log out</button></div></details>;
}
