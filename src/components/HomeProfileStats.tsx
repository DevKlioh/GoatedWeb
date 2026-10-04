"use client";
import { useEffect, useState } from "react";
export default function HomeProfileStats({posts,followers,following}:{posts:number;followers:number;following:number}){
  const [postCount,setPostCount]=useState(posts);
  useEffect(()=>{const fn=(e:Event)=>setPostCount(x=>Math.max(0,x+Number((e as CustomEvent).detail?.delta||0)));window.addEventListener("goated:post-count",fn);return()=>window.removeEventListener("goated:post-count",fn)},[]);
  return <div className="profileStats"><div><b>{postCount}</b><span>Posts</span></div><div><b>{followers}</b><span>Followers</span></div><div><b>{following}</b><span>Following</span></div></div>;
}