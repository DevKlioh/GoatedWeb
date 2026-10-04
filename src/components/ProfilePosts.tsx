"use client";
import { useState } from "react";
import SocialPostCard,{SocialPost} from "@/components/SocialPostCard";

export default function ProfilePosts({posts,currentUserId}:{posts:SocialPost[];currentUserId?:string|null}){
  const [items,setItems]=useState(posts);
  return <div className="profilePostsList">
    {items.length?items.map(p=><SocialPostCard key={p.id} post={p} currentUserId={currentUserId} onChanged={(kind,row)=>{if(kind==="delete")setItems(x=>x.filter(v=>v.id!==p.id));else if(kind==="edit"&&row)setItems(x=>x.map(v=>v.id===row.id?row:v));}}/>):
    <article className="profilePanel profileEmptyPosts"><span className="emptyPluginIcon">⬡</span><h2>No posts yet</h2><p>This member hasn't shared anything yet.</p></article>}
  </div>;
}