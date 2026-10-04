"use client";
import { FormEvent, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SocialPostCard from "@/components/SocialPostCard";

type PostRow={
  id:string; content:string; created_at:string; updated_at:string;
  image_url:string|null; author_id:string; post_images?:{id:string;image_url:string;position:number}[];
  profiles?:{username?:string;display_name?:string;avatar_url?:string|null}|null;
  post_likes?:{user_id:string}[]; post_comments?:{id:string}[];
};
const MAX=2000;

export default function HomeSocialFeed({userId,name,username,avatar,initialPosts}:{userId:string;name:string;username:string;avatar?:string|null;initialPosts:PostRow[]}){
  const supabase=createClient();
  const [text,setText]=useState("");
  const [mode,setMode]=useState<"post"|"image">("post");
  const [composerOpen,setComposerOpen]=useState(false);
  const [images,setImages]=useState<File[]>([]);
  const [previews,setPreviews]=useState<string[]>([]);
  const [posts,setPosts]=useState<PostRow[]>(initialPosts);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);

  function addImages(files:File[]){
    setMessage("");
    const valid=files.filter(file=>{
      if(!file.type.startsWith("image/")){setMessage("Only image files are allowed.");return false;}
      if(file.size>5*1024*1024){setMessage(`${file.name} is larger than 5 MB.`);return false;}
      return true;
    });
    const room=5-images.length;
    if(room<=0)return setMessage("Maximum of 5 images per post.");
    if(valid.length>room)setMessage("Only the first images that fit the 5-image limit were added.");
    const accepted=valid.slice(0,room);
    setImages(x=>[...x,...accepted]);setPreviews(x=>[...x,...accepted.map(f=>URL.createObjectURL(f))]);setMode("image");
  }
  async function paste(e:React.ClipboardEvent<HTMLTextAreaElement>){
    const files=Array.from(e.clipboardData.items).filter(x=>x.type.startsWith("image/")).map(x=>x.getAsFile()).filter(Boolean) as File[];
    if(files.length){e.preventDefault();addImages(files);}
  }
  function removeImage(index:number){setImages(x=>x.filter((_,i)=>i!==index));setPreviews(x=>x.filter((_,i)=>i!==index));}
  async function submit(e:FormEvent){
    e.preventDefault(); setMessage("");
    const content=text.trim();
    if(!content && !images.length)return setMessage("Write something or attach an image first.");
    setBusy(true);
    try{
      const uploaded:string[]=[];
      for(const image of images){
        const ext=(image.name.split(".").pop()||"png").replace(/[^a-z0-9]/gi,"");
        const path=`${userId}/${crypto.randomUUID()}.${ext}`;
        const {error}=await supabase.storage.from("post-media").upload(path,image,{contentType:image.type});
        if(error)throw error;uploaded.push(supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl);
      }
      const {data,error}=await supabase.from("posts").insert({author_id:userId,content,image_url:uploaded[0]||null}).select("id,content,created_at,updated_at,image_url,author_id").single();
      if(error)throw error;
      let post_images:any[]=[];
      if(uploaded.length){const {data:rows,error:imageError}=await supabase.from("post_images").insert(uploaded.map((image_url,position)=>({post_id:data.id,image_url,position}))).select("id,image_url,position");if(imageError)throw imageError;post_images=rows||[];}
      setPosts(p=>[{...data,post_images,profiles:{username,display_name:name,avatar_url:avatar||null},post_likes:[],post_comments:[]},...p]);
      setText("");setImages([]);setPreviews([]);setMode("post");
      window.dispatchEvent(new CustomEvent("goated:post-count",{detail:{delta:1}}));
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
  useEffect(()=>{
    if(!composerOpen)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setComposerOpen(false);};
    document.addEventListener("keydown",onKey);
    document.body.classList.add("composerModalOpen");
    return()=>{document.removeEventListener("keydown",onKey);document.body.classList.remove("composerModalOpen");};
  },[composerOpen]);
  const remaining=MAX-text.length;

  return <>
    <section className="composer realComposer composerLauncher" onClick={()=>setComposerOpen(true)}>
      <div className="avatar">{avatar?<img src={avatar} alt=""/>:name.slice(0,1).toUpperCase()}</div>
      <button type="button" className="composerPrompt">What's happening in the OrvenSMP community?</button>
    </section>

    {composerOpen&&<div className="composerFocusOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setComposerOpen(false)}}>
      <section className="composerFocusCard" role="dialog" aria-modal="true" aria-label="Create post">
        <div className="composerFocusHeader"><div><b>Create Post</b><span>Share something with OrvenSMP</span></div><button type="button" className="composerClose" aria-label="Close" onClick={()=>setComposerOpen(false)}>×</button></div>
        <div className="composerFocusUser"><div className="avatar">{avatar?<img src={avatar} alt=""/>:name.slice(0,1).toUpperCase()}</div><div><b>{name}</b><span>@{username}</span></div></div>
        <form className="composerBody composerFocusBody" onSubmit={async e=>{await submit(e); if(text.trim()||images.length)setComposerOpen(false);}}>
          <textarea autoFocus value={text} maxLength={MAX} onChange={e=>setText(e.target.value)} onPaste={paste} placeholder="What's happening in OrvenSMP?"/>
          {previews.length>0&&<div className={`composerGallery count${previews.length}`}>{previews.map((src,i)=><div className="composerGalleryItem" key={src}><img src={src} alt={`Selected upload ${i+1}`}/><button type="button" onClick={()=>removeImage(i)}>×</button></div>)}</div>}
          {message&&<div className="composerMessage">{message}</div>}
          <div className="composerFocusTools">
            <button type="button" className="addImageButton" onClick={()=>fileRef.current?.click()}>Add image {images.length?`(${images.length}/5)`:""}</button>
            <span className={`composerCount ${remaining<100?"nearLimit":""}`}>{remaining}</span>
          </div>
          <button className="composerFocusPost" disabled={busy||(!text.trim()&&!images.length)}>{busy?<><i className="buttonSpinner"/> Posting…</>:"Post"}</button>
          <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={e=>{addImages(Array.from(e.target.files||[]));e.currentTarget.value=""}}/>
        </form>
      </section>
    </div>}

    <section className="socialFeed">
      {posts.length===0?<div className="emptyFeed"><span>⬡</span><h2>Your community feed starts here.</h2><p>Be the first to share something with the OrvenSMP community.</p></div>:
      posts.map(post=><SocialPostCard key={post.id} post={post} currentUserId={userId} onChanged={(kind)=>{if(kind==="delete"){setPosts(x=>x.filter(v=>v.id!==post.id));window.dispatchEvent(new CustomEvent("goated:post-count",{detail:{delta:-1}}));}}}/>)}
    </section>
  </>;
}