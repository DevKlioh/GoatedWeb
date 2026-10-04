"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomeProfileMenu({name,username,avatar}:{name:string;username:string;avatar?:string|null}) {
  const router=useRouter();
  async function logout(){
    const supabase=createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return <section className="railCard profileCard homeProfileDropdownCard">
    <div className="railTitle"><b>♛ Your Profile</b><Link href="/profile/me">View Profile →</Link></div>
    <details className="homeProfileMenu">
      <summary>
        <div className="profileIdentity">
          {avatar?<img src={avatar} alt=""/>:<div className="bigAvatar">{name.slice(0,1).toUpperCase()}</div>}
          <div><strong>{name}</strong><span>@{username}</span><small>Click to open account menu</small></div>
          <b className="homeMenuChevron">⌄</b>
        </div>
      </summary>
      <div className="homeAccountDropdown">
        <Link href="/settings"><span>⚙</span><div><b>Account Settings</b><small>Profile and account preferences</small></div></Link>
        <Link href="/resources"><span>⬡</span><div><b>Your Resources</b><small>Plugins and resources you own</small></div></Link>
        <Link href="/marked"><span>◆</span><div><b>Marked Posts</b><small>Posts you saved for later</small></div></Link>
        <Link href="/notifications"><span>●</span><div><b>Notifications</b><small>Mentions, replies, likes and messages</small></div></Link>
        <Link className="homeUploadResource" href="/resources/upload"><span>＋</span><div><b>Upload Resource</b><small>Publish a Minecraft plugin</small></div></Link>
        <button type="button" onClick={logout}><span>↪</span><div><b>Log out</b><small>Sign out of OrvenSMP</small></div></button>
      </div>
    </details>
    <div className="profileStats"><div><b>0</b><span>Posts</span></div><div><b>0</b><span>Followers</span></div><div><b>0</b><span>Following</span></div></div>
  </section>;
}
