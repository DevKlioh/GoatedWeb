"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const allowedTags = new Set(["P","DIV","BR","B","STRONG","I","EM","U","H2","H3","UL","OL","LI","BLOCKQUOTE","SPAN","IMG"]);
const allowedFonts = new Set(["Arial","Georgia","Verdana","Trebuchet MS","Courier New"]);

function cleanHtml(input:string) {
  const doc = new DOMParser().parseFromString(input, "text/html");
  [...doc.body.querySelectorAll("*")].forEach(el => {
    if (!allowedTags.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); return; }
    [...el.attributes].forEach(a => {
      if (el.tagName === "IMG" && ["src","alt"].includes(a.name)) return;
      if (a.name === "style" && el.tagName === "SPAN") {
        const family=(el as HTMLElement).style.fontFamily.replaceAll('"',"");
        el.setAttribute("style", allowedFonts.has(family) ? `font-family:${family}` : "");
        return;
      }
      el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML.slice(0, 30000);
}

export default function ResourceUploader({ userId }:{userId:string}) {
  const router=useRouter(), supabase=createClient(), editor=useRef<HTMLDivElement>(null);
  const [name,setName]=useState(""), [links,setLinks]=useState(["","","",""]);
  const [icon,setIcon]=useState<File|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState(""), [notice,setNotice]=useState("");

  function cmd(command:string,value?:string){ document.execCommand(command,false,value); editor.current?.focus(); }
  function font(value:string){ cmd("fontName",value); }
  async function uploadImage(file:File, folder:string) {
    if(!file.type.startsWith("image/") || file.size>5*1024*1024) throw new Error("Images must be under 5 MB.");
    const ext=(file.name.split(".").pop()||"png").replace(/[^a-z0-9]/gi,"");
    const path=`${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const {error}=await supabase.storage.from("resource-media").upload(path,file,{upsert:false,contentType:file.type});
    if(error) throw error;
    return supabase.storage.from("resource-media").getPublicUrl(path).data.publicUrl;
  }
  async function paste(e:React.ClipboardEvent<HTMLDivElement>) {
    const image=Array.from(e.clipboardData.items).find(i=>i.type.startsWith("image/"))?.getAsFile();
    if(!image) return;
    e.preventDefault(); setError("");
    try { const url=await uploadImage(image,"screenshots"); cmd("insertImage",url); } catch(err:any){setError(err.message||"Couldn't paste that image.");}
  }
  async function submit(e:FormEvent){
    e.preventDefault(); setError(""); setNotice("");
    if(name.trim().length<3) return setError("Plugin name must be at least 3 characters.");
    if(!icon) return setError("Please upload a plugin logo/icon.");
    const html=cleanHtml(editor.current?.innerHTML||"");
    const text=(editor.current?.innerText||"").trim();
    if(text.length<20) return setError("Please add a more complete plugin description.");
    const cleanLinks=links.map(x=>x.trim()).filter(Boolean);
    for(const link of cleanLinks){ try { const u=new URL(link); if(!["http:","https:"].includes(u.protocol)) throw 0; } catch { return setError(`Invalid link: ${link}`); } }
    setBusy(true);
    try {
      const iconUrl=await uploadImage(icon,"icons");
      const slug=`${name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-${crypto.randomUUID().slice(0,6)}`;
      const {data:resource,error:rerr}=await supabase.from("resources").insert({owner_id:userId,name:name.trim(),slug,description_html:html,description_text:text,icon_url:iconUrl,status:"published"}).select("id").single();
      if(rerr) throw rerr;
      if(cleanLinks.length){
        const {error:lerr}=await supabase.from("resource_links").insert(cleanLinks.map((url,index)=>({resource_id:resource.id,url,position:index+1})));
        if(lerr) throw lerr;
      }
      setNotice("Resource published successfully.");
      router.push("/resources"); router.refresh();
    } catch(err:any){ setError(err.message||"We couldn't publish your resource."); setBusy(false); }
  }
  return <form className="resourceUploadForm" onSubmit={submit}>
    {error&&<div className="authNotice errorNotice">{error}</div>}{notice&&<div className="authNotice successNotice">{notice}</div>}
    <section className="uploadPanel"><label>Plugin / Resource Name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="Example: GoatedTeams"/></label>
    <label>Plugin Logo / Icon<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setIcon(e.target.files?.[0]||null)} required/><small>PNG, JPG, WEBP or GIF. Maximum 5 MB.</small></label></section>
    <section className="uploadPanel"><div className="fieldTitle">Description</div><div className="editorToolbar">
      <button type="button" onClick={()=>cmd("bold")}><b>B</b></button><button type="button" onClick={()=>cmd("italic")}><i>I</i></button><button type="button" onClick={()=>cmd("underline")}><u>U</u></button>
      <button type="button" onClick={()=>cmd("formatBlock","h2")}>H2</button><button type="button" onClick={()=>cmd("insertUnorderedList")}>• List</button>
      <select defaultValue="Arial" onChange={e=>font(e.target.value)}><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Trebuchet MS</option><option>Courier New</option></select>
      <button type="button" onClick={()=>cmd("insertText","😀")}>😀 Emoji</button>
    </div><div ref={editor} className="richEditor" contentEditable suppressContentEditableWarning onPaste={paste} data-placeholder="Describe your plugin here. You can format text, use emojis, and paste screenshots directly from Snipping Tool…"/>
    <small className="editorHint">Tip: copy a screenshot or use Windows Snipping Tool, then press Ctrl+V inside the description.</small></section>
    <section className="uploadPanel"><div className="fieldTitle">Links <small>up to 4</small></div>{links.map((v,i)=><input key={i} type="url" value={v} onChange={e=>setLinks(x=>x.map((a,n)=>n===i?e.target.value:a))} placeholder={`Link ${i+1} — https://...`}/>)}</section>
    <div className="uploadSubmitRow"><button className="goldAction" disabled={busy}>{busy?"Publishing…":"Publish Resource"}</button><span>Only content you have permission to distribute should be uploaded.</span></div>
  </form>;
}