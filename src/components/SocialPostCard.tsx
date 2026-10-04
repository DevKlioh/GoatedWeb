"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SocialPost={
  id:string; content:string; created_at:string; updated_at:string; image_url:string|null; author_id:string;
  profiles?:{username?:string;display_name?:string;avatar_url?:string|null}|null;
  post_likes?:{user_id:string}[]; post_comments?:{id:string}[];
};

export default function SocialPostCard({post,currentUserId,onChanged}:{post:SocialPost;currentUserId?:string|null;onChanged?:(kind:"edit"|"delete"|"follow",post?:SocialPost)=>void}){
  const supabase=createClient(), menuRef=useRef<HTMLDivElement>(null);
  const [menu,setMenu]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState(post.content);
  const [row,setRow]=useState(post),[busy,setBusy]=useState(false),[following,setFollowing]=useState(false),[notice,setNotice]=useState("");
  const own=!!currentUserId&&currentUserId===row.author_id, p=row.profiles||{};

  useEffect(()=>{
    if(!currentUserId||own)return;
    supabase.from("follows").select("following_id").eq("follower_id",currentUserId).eq("following_id",row.author_id).maybeSingle().then(({data})=>setFollowing(!!data));
  },[currentUserId,row.author_id,own]);

  useEffect(()=>{
    const outside=(e:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setMenu(false)};
    const esc=(e:KeyboardEvent)=>{if(e.key==="Escape"){setMenu(false);setEditing(false)}};
    document.addEventListener("mousedown",outside);document.addEventListener("keydown",esc);
    return()=>{document.removeEventListener("mousedown",outside);document.removeEventListener("keydown",esc)};
  },[]);

  function requireAuth(){setNotice("Sign in or create an account to interact with posts.");window.dispatchEvent(new Event("goated:auth"));}
  async function toggleLike(){
    if(!currentUserId)return requireAuth();
    const liked=(row.post_likes||[]).some(x=>x.user_id===currentUserId);
    setRow(x=>({...x,post_likes:liked?(x.post_likes||[]).filter(v=>v.user_id!==currentUserId):[...(x.post_likes||[]),{user_id:currentUserId}]}));
    const q=liked?supabase.from("post_likes").delete().eq("post_id",row.id).eq("user_id",currentUserId):supabase.from("post_likes").insert({post_id:row.id,user_id:currentUserId});
    const {error}=await q;if(error)location.reload();
  }
  async function mark(){
    if(!currentUserId)return requireAuth();
    const {data}=await supabase.from("marked_posts").select("post_id").eq("post_id",row.id).eq("user_id",currentUserId).maybeSingle();
    if(data){await supabase.from("marked_posts").delete().eq("post_id",row.id).eq("user_id",currentUserId);setNotice("Removed from Marked Posts.");}
    else{await supabase.from("marked_posts").insert({post_id:row.id,user_id:currentUserId});setNotice("Saved to Marked Posts.");}
  }
  async function share(){
    const url=`${location.origin}/profile/${encodeURIComponent(p.username||"player")}?post=${row.id}`;
    try{if(navigator.share)await navigator.share({title:`Post by ${p.display_name||p.username||"GoatedPlugins user"}`,url});else{await navigator.clipboard.writeText(url);setNotice("Post link copied.");}}catch{}
    setMenu(false);
  }
  async function saveEdit(){
    const content=draft.trim();if(!content&&!row.image_url)return setNotice("A post can't be empty.");
    setBusy(true);
    const {data,error}=await supabase.from("posts").update({content,updated_at:new Date().toISOString()}).eq("id",row.id).eq("author_id",currentUserId).select("id,content,created_at,updated_at,image_url,author_id").single();
    setBusy(false);
    if(error)return setNotice(error.message);
    const next={...row,...data};setRow(next);setEditing(false);setNotice("Post updated.");onChanged?.("edit",next);
  }
  async function remove(){
    setMenu(false);
    if(!confirm("Delete this post? This cannot be undone."))return;
    setBusy(true);const {error}=await supabase.from("posts").delete().eq("id",row.id).eq("author_id",currentUserId);setBusy(false);
    if(error)return setNotice(error.message);onChanged?.("delete",row);
  }
  async function toggleFollow(){
    if(!currentUserId||own)return;
    setBusy(true);
    const {error}=following
      ?await supabase.from("follows").delete().eq("follower_id",currentUserId).eq("following_id",row.author_id)
      :await supabase.from("follows").insert({follower_id:currentUserId,following_id:row.author_id});
    setBusy(false);if(error)return setNotice(error.message);
    setFollowing(!following);setMenu(false);onChanged?.("follow",row);
  }

  const edited=new Date(row.updated_at).getTime()>new Date(row.created_at).getTime()+1000;
  return <article className="postCard">
    <div className="postHeader">
      <Link className="postAvatar" href={`/profile/${encodeURIComponent(p.username||"player")}`}>{p.avatar_url?<img src={p.avatar_url} alt=""/>:(p.display_name||"G").slice(0,1).toUpperCase()}</Link>
      <div className="postAuthorLine"><Link href={`/profile/${encodeURIComponent(p.username||"player")}`}><b>{p.display_name||p.username||"Goated User"}</b></Link><span>@{p.username||"player"} · {new Date(row.created_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}{edited?" · edited":""}</span></div>
      <div className="postMenuWrap" ref={menuRef}><button className="postMore" aria-label="Post options" onClick={()=>setMenu(v=>!v)}>•••</button>
        {menu&&<div className="postMenu">
          {own?<><button onClick={()=>{setEditing(true);setMenu(false)}}>✎ Edit post</button><button className="danger" onClick={remove}>⌫ Delete post</button></>:currentUserId?<button onClick={toggleFollow}>{following?"✓ Unfollow author":"+ Follow author"}</button>:<button onClick={()=>{setMenu(false);requireAuth()}}>+ Follow author</button>}
          <button onClick={share}>↗ Share post</button>
        </div>}
      </div>
    </div>
    {editing?<div className="postEditBox"><textarea maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)}/><div><span>{2000-draft.length}</span><button onClick={()=>{setDraft(row.content);setEditing(false)}}>Cancel</button><button className="goldButton" disabled={busy} onClick={saveEdit}>{busy?"Saving…":"Save changes"}</button></div></div>:row.content&&<p className="postText">{row.content}</p>}
    {row.image_url&&<img className="postImage" src={row.image_url} alt="Post attachment"/>}
    {notice&&<div className="postNotice">{notice}</div>}
    <div className="postActions">
      <button className={(row.post_likes||[]).some(x=>x.user_id===currentUserId)?"liked":""} onClick={toggleLike}>♡ <span>{row.post_likes?.length||0}</span></button>
      <button disabled title="Comments are coming next">◯ <span>{row.post_comments?.length||0}</span></button>
      <button onClick={mark}>◇ Mark</button>
      <button onClick={share}>↗ Share</button>
    </div>
  </article>;
}