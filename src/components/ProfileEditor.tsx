"use client";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const validUsername = /^[A-Za-z0-9_]{3,24}$/;
const WEEK = 7 * 24 * 60 * 60 * 1000;
type Props = { id:string; username:string; displayName:string; bio:string; avatarUrl?:string|null; avatarUpdatedAt?:string|null };

export default function ProfileEditor({id,username:initialUsername,displayName:initialDisplayName,bio:initialBio,avatarUrl:initialAvatar,avatarUpdatedAt}:Props){
 const router=useRouter(),supabase=createClient(),fileRef=useRef<HTMLInputElement|null>(null);
 const [username,setUsername]=useState(initialUsername),[displayName,setDisplayName]=useState(initialDisplayName),[bio,setBio]=useState(initialBio);
 const [avatar,setAvatar]=useState(initialAvatar||""),[avatarChanged,setAvatarChanged]=useState(avatarUpdatedAt),[uploading,setUploading]=useState(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const nextAvatarAt=useMemo(()=>avatarChanged?new Date(new Date(avatarChanged).getTime()+WEEK):null,[avatarChanged]);
 const avatarLocked=!!nextAvatarAt&&nextAvatarAt.getTime()>Date.now();
 const remaining=nextAvatarAt?Math.max(0,nextAvatarAt.getTime()-Date.now()):0;
 const days=Math.ceil(remaining/(24*60*60*1000));
 async function avatarUpload(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value="";setNotice("");setError("");if(!file)return;
  if(avatarLocked)return setError(`You can update your profile picture again in ${days} day${days===1?"":"s"}.`);
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))return setError("Please choose a JPG, PNG or WEBP image.");
  if(file.size>5*1024*1024)return setError("Profile pictures must be 5 MB or smaller.");
  setUploading(true);
  try{
   const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
   const path=`${id}/avatar-${crypto.randomUUID()}.${ext}`;
   const up=await supabase.storage.from("profile-avatars").upload(path,file,{contentType:file.type,upsert:false});
   if(up.error)throw up.error;
   const url=supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
   const result=await supabase.rpc("orven_update_profile_avatar",{p_avatar_url:url});
   if(result.error){await supabase.storage.from("profile-avatars").remove([path]);throw result.error}
   const now=typeof result.data==="string"?result.data:new Date().toISOString();setAvatar(url);setAvatarChanged(now);setNotice("Profile picture updated. You can change it again in 7 days.");router.refresh();
  }catch(x:any){setError(x?.message?.includes("once every 7 days")?"You can only update your profile picture once every 7 days.":(x?.message||"We couldn't update your profile picture."))}
  finally{setUploading(false)}
 }
 async function save(e:FormEvent){
  e.preventDefault();setNotice("");setError("");const clean=username.trim();
  if(!validUsername.test(clean))return setError("Username must be 3–24 characters using only letters, numbers, or underscores.");
  if(displayName.trim().length>50)return setError("Display name must be 50 characters or fewer.");
  if(bio.length>240)return setError("Bio must be 240 characters or fewer.");
  setBusy(true);const {error}=await supabase.from("profiles").upsert({id,username:clean,display_name:displayName.trim()||clean,bio:bio.trim()},{onConflict:"id"});setBusy(false);
  if(error){if(error.code==="23505")return setError("That username is already taken. Try another one.");return setError("We couldn't save your profile right now. Please try again.")}
  setNotice("Profile saved successfully.");router.refresh();if(clean.toLowerCase()!==initialUsername.toLowerCase())router.push(`/profile/${encodeURIComponent(clean)}`);
 }
 return <form className="profileEditForm" onSubmit={save}>
  <div className="settingsSectionTitle"><div><span className="eyebrow">PUBLIC PROFILE</span><h2>Edit profile</h2></div><p>These details are visible to other members.</p></div>
  {error&&<div className="authNotice errorNotice">{error}</div>}{notice&&<div className="authNotice successNotice">{notice}</div>}
  <section className="avatarSettingsRow">
   <div className="avatarSettingsPreview">{avatar?<img src={avatar} alt="Your profile"/>:<span>{(displayName||username).slice(0,1).toUpperCase()}</span>}</div>
   <div className="avatarSettingsInfo"><strong>Profile picture</strong><p>JPG, PNG or WEBP • maximum 5 MB. To keep profiles consistent and prevent rapid changes, your picture can be updated once every 7 days.</p>
    <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={avatarUpload}/>
    <button type="button" className="avatarChangeButton" disabled={uploading||avatarLocked} onClick={()=>fileRef.current?.click()}>{uploading?"Uploading…":avatarLocked?`Available in ${days} day${days===1?"":"s"}`:avatar?"Change profile picture":"Upload profile picture"}</button>
    {avatarLocked&&nextAvatarAt&&<small>Next change: {nextAvatarAt.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})}</small>}
   </div>
  </section>
  <label>Username <div className="usernameField"><span>@</span><input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={24} required /></div><small>3–24 characters. Letters, numbers and underscores only.</small></label>
  <label>Display name <input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={50} placeholder="Your display name"/></label>
  <label>Bio <textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={240} rows={5} placeholder="Tell people a little about yourself…"/><small>{bio.length}/240</small></label>
  <button className="formSubmit profileSave" disabled={busy||uploading}>{busy?"Saving…":"Save profile"}</button>
 </form>
}