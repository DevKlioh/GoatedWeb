"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileFollowButton({viewerId,targetId,initialFollowing}:{viewerId:string,targetId:string,initialFollowing:boolean}){
  const supabase=createClient();const [following,setFollowing]=useState(initialFollowing),[busy,setBusy]=useState(false);
  async function toggle(){setBusy(true);const {error}=following
    ?await supabase.from("follows").delete().eq("follower_id",viewerId).eq("following_id",targetId)
    :await supabase.from("follows").insert({follower_id:viewerId,following_id:targetId});
    setBusy(false);if(!error){setFollowing(!following);location.reload();}}
  return <button className="profileGoldAction" disabled={busy} onClick={toggle}>{busy?"…":following?"✓ Following":"+ Follow"}</button>;
}