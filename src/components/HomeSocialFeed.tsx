"use client";
import { FormEvent, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PostRow={
  id:string; content:string; created_at:string; updated_at:string;
  image_url:string|null; author_id:string;
  profiles?:{username?:string;display_name?:string;avatar_url?:string|null}|null;
  post_likes?:{user_id:string}[]; post_comments?:{id:string}[];
};
const MAX=2000;

export default function HomeSocialFeed({userId,name,username,avatar,initialPosts}:{userId:string;name:string;username:string;avatar?:string|null;initialPosts:PostRow[]}){
  const supabase=createClient();
  const [text,setText]=useState("");
  const [mode,setMode]=useState<"post"|"image">("post");
  const [image,setImage]=useState<File|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [posts,setPosts]=useState<PostRow[]>(initialPosts);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);

  function chooseImage(file?:File|null){
    if(!file)return;
    if(!file.type.startsWith("image/")) return setMessage("Please choose an image file.");
    if(file.size>8*1024*1024) return setMessage("Images must be 8 MB or smaller.");
    setImage(file); setMode("image"); setPreview(URL.createObjectURL(file)); setMessage("");
  }
  async function paste(e:React.ClipboardEvent<HTMLTextAreaElement>){
    const f=Array.from(e.clipboardData.items).find(x=>x.type.startsWith("image/"))?.getAsFile();
    if(f){e.preventDefault();chooseImage(f);}
  }
  async function submit(e:FormEvent){
    e.preventDefault(); setMessage("");
    const content=text.trim();
    if(!content && !image)return setMessage("Write something or attach an image first.");
    setBusy(true);
    try{
      let image_url:string|null=null;
      if(image){
        const ext=(image.name.split(".").pop()||"png").replace(/[^a-z0-9]/gi,"");
        const path=`${userId}/${crypto.randomUUID()}.${ext}`;
        const {error}=await supabase.storage.from("post-media").upload(path,image,{contentType:image.type});
        if(error)throw error;
        image_url=supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      }
      const {data,error}=await supabase.from("posts").insert({author_id:userId,content,image_url}).select("id,content,created_at,updated_at,image_url,author_id").single();
      if(error)throw error;
      setPosts(p=>[{...data,profiles:{username,display_name:name,avatar_url:avatar||null},post_likes:[],post_comments:[]},...p]);
      setText("");setImage(null);setPreview(null);setMode("post");
    }catch(err:any){setMessage(err.message||"Couldn't publish your post.");}
    finally{setBusy(false);}
  }
  async function toggleLike(post:PostRow){
    const liked=(post.post_likes||[]).some(x=>x.user_id===userId);
    setPosts(all=>all.map(p=>p.id===post.id?{...p,post_likes:liked?(p.post_likes||[]).filter(x=>x.user_id!==userId):[...(p.post_likes||[]),{user_id:userId}]}:p));
    const q=liked?supabase.from("post_likes").delete().eq("post_id",post.id).eq("user_id",userId):supabase.from("post_likes").insert({post_id:post.id,user_id:userId});
    const {error}=await q;if(error)location.reload();
  }
  async function mark(postId:string){
    const {data}=await supabase.from("marked_posts").select("post_id").eq("post_id",postId).eq("user_id",userId).maybeSingle();
    if(data){await supabase.from("marked_posts").delete().eq("post_id",postId).eq("user_id",userId);setMessage("Removed from Marked Posts.");}
    else{await supabase.from("marked_posts").insert({post_id:postId,user_id:userId});setMessage("Saved to Marked Posts.");}
  }
  const remaining=MAX-text.length;

  return <>
    <section className="composer realComposer">
      <div className="avatar">{avatar?<img src={avatar} alt=""/>:name.slice(0,1).toUpperCase()}</div>
      <form className="composerBody" onSubmit={submit}>
        <textarea value={text} maxLength={MAX} onChange={e=>setText(e.target.value)} onPaste={paste} placeholder="What's happening in the GoatedPlugins community?"/>
        {preview&&<div className="composerPreview"><img src={preview} alt="Selected upload"/><button type="button" onClick={()=>{setImage(null);setPreview(null);setMode("post")}}>×</button></div>}
        {message&&<div className="composerMessage">{message}</div>}
        <div className="composerActions">
          <button type="button" className={mode==="post"?"selected":""} onClick={()=>setMode("post")}>▢ Post</button>
          <button type="button" className={mode==="image"?"selected":""} onClick={()=>fileRef.current?.click()}>▧ Image</button>
          <button type="button" disabled title="Polls are coming in the next social update">▥ Poll</button>
          <button type="button" disabled title="Plugin attachments are coming in the next social update">⬡ Plugin</button>
          <span className={`composerCount ${remaining<100?"nearLimit":""}`}>{remaining}</span>
          <button className="goldButton" disabled={busy||(!text.trim()&&!image)}>{busy?<><i className="buttonSpinner"/> Posting…</>:"Post"}</button>
        </div>
        <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>chooseImage(e.target.files?.[0])}/>
      </form>
    </section>

    <section className="socialFeed">
      {posts.length===0?<div className="emptyFeed"><span>⬡</span><h2>Your community feed starts here.</h2><p>Be the first to share something with the GoatedPlugins community.</p></div>:
      posts.map(post=>{
        const p=post.profiles||{}; const liked=(post.post_likes||[]).some(x=>x.user_id===userId);
        return <article className="postCard" key={post.id}>
          <div className="postHeader">
            <div className="postAvatar">{p.avatar_url?<img src={p.avatar_url} alt=""/>:(p.display_name||"G").slice(0,1).toUpperCase()}</div>
            <div><b>{p.display_name||p.username||"Goated User"}</b><span>@{p.username||"player"} · {new Date(post.created_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span></div>
          </div>
          {post.content&&<p className="postText">{post.content}</p>}
          {post.image_url&&<img className="postImage" src={post.image_url} alt="Post attachment"/>}
          <div className="postActions">
            <button className={liked?"liked":""} onClick={()=>toggleLike(post)}>♡ <span>{post.post_likes?.length||0}</span></button>
            <button disabled title="Comment UI is next">◯ <span>{post.post_comments?.length||0}</span></button>
            <button onClick={()=>mark(post.id)}>◇ Mark</button>
            <button onClick={()=>navigator.clipboard.writeText(`${location.origin}/?post=${post.id}`).then(()=>setMessage("Post link copied."))}>↗ Share</button>
          </div>
        </article>
      })}
    </section>
  </>;
}