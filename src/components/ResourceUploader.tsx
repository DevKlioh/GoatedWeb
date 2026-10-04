"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const MC_VERSIONS=["1.21","1.21.1","1.21.2","1.21.3","1.21.4","1.21.5","1.21.6","1.21.7","1.21.8","1.21.9","1.21.10","1.21.11","26.x"];
const PLATFORMS=[
  {id:"spigot",label:"Spigot",icon:"/platforms/spigot.svg"},
  {id:"paper",label:"Paper",icon:"/platforms/paper.svg"},
  {id:"purpur",label:"Purpur",icon:"/platforms/purpur.svg"},
  {id:"folia",label:"Folia",icon:"/platforms/folia.svg"},
];
const allowedTags=new Set(["P","DIV","BR","B","STRONG","I","EM","U","H2","H3","UL","OL","LI","BLOCKQUOTE","SPAN","IMG"]);
const allowedFonts=new Set(["Arial","Georgia","Verdana","Trebuchet MS","Courier New"]);

function cleanHtml(input:string){
  const doc=new DOMParser().parseFromString(input,"text/html");
  [...doc.body.querySelectorAll("*")].forEach(el=>{
    if(!allowedTags.has(el.tagName)){el.replaceWith(...Array.from(el.childNodes));return;}
    [...el.attributes].forEach(a=>{
      if(el.tagName==="IMG"&&["src","alt"].includes(a.name))return;
      if(a.name==="style"&&el.tagName==="SPAN"){
        const family=(el as HTMLElement).style.fontFamily.replaceAll('"',"");
        el.setAttribute("style",allowedFonts.has(family)?`font-family:${family}`:"");return;
      }
      el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML.slice(0,30000);
}

export default function ResourceUploader({userId}:{userId:string}){
  const router=useRouter(),supabase=createClient(),editor=useRef<HTMLDivElement>(null);
  const [name,setName]=useState(""),[pluginVersion,setPluginVersion]=useState("1.0.0");
  const [versions,setVersions]=useState<string[]>(["1.21.11"]),[platforms,setPlatforms]=useState<string[]>(["paper","purpur"]);
  const [pricing,setPricing]=useState<"free"|"premium">("free"),[price,setPrice]=useState("");
  const [links,setLinks]=useState(["","","",""]),[icon,setIcon]=useState<File|null>(null),[jar,setJar]=useState<File|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");

  function toggle(value:string,list:string[],setter:(v:string[])=>void){setter(list.includes(value)?list.filter(x=>x!==value):[...list,value]);}
  function cmd(command:string,value?:string){document.execCommand(command,false,value);editor.current?.focus();}
  async function uploadImage(file:File,folder:string){
    if(!file.type.startsWith("image/")||file.size>5*1024*1024)throw new Error("Images must be under 5 MB.");
    const ext=(file.name.split(".").pop()||"png").replace(/[^a-z0-9]/gi,"");
    const path=`${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const {error}=await supabase.storage.from("resource-media").upload(path,file,{contentType:file.type}); if(error)throw error;
    return supabase.storage.from("resource-media").getPublicUrl(path).data.publicUrl;
  }
  async function paste(e:React.ClipboardEvent<HTMLDivElement>){
    const image=Array.from(e.clipboardData.items).find(i=>i.type.startsWith("image/"))?.getAsFile(); if(!image)return;
    e.preventDefault();try{const url=await uploadImage(image,"screenshots");cmd("insertImage",url);}catch(err:any){setError(err.message);}
  }
  async function submit(e:FormEvent){
    e.preventDefault();setError("");
    if(name.trim().length<3)return setError("Plugin name must be at least 3 characters.");
    if(!icon)return setError("Please upload a plugin logo/icon.");
    if(!jar)return setError("Please upload the plugin .jar file.");
    if(!jar.name.toLowerCase().endsWith(".jar"))return setError("Plugin file must be a .jar.");
    if(jar.size>100*1024*1024)return setError("Plugin .jar must be 100 MB or smaller.");
    if(!versions.length)return setError("Select at least one supported Minecraft version.");
    if(!platforms.length)return setError("Select at least one supported server platform.");
    const numericPrice=Number(price);
    if(pricing==="premium"&&(!Number.isFinite(numericPrice)||numericPrice<=0))return setError("Enter a valid premium price.");
    const html=cleanHtml(editor.current?.innerHTML||""),text=(editor.current?.innerText||"").trim();
    if(text.length<20)return setError("Please add a more complete plugin description.");
    const cleanLinks=links.map(x=>x.trim()).filter(Boolean);
    for(const link of cleanLinks){try{const u=new URL(link);if(!["http:","https:"].includes(u.protocol))throw 0;}catch{return setError(`Invalid link: ${link}`);}}
    setBusy(true);
    try{
      const iconUrl=await uploadImage(icon,"icons");
      const slug=`${name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-${crypto.randomUUID().slice(0,6)}`;
      const bucket=pricing==="free"?"free-resource-files":"premium-resource-files";
      const safeJar=jar.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const filePath=`${userId}/${crypto.randomUUID()}-${safeJar}`;
      const {error:fileErr}=await supabase.storage.from(bucket).upload(filePath,jar,{contentType:"application/java-archive"});if(fileErr)throw fileErr;
      const {data:resource,error:rerr}=await supabase.from("resources").insert({
        owner_id:userId,name:name.trim(),slug,plugin_version:pluginVersion.trim(),minecraft_versions:versions,platforms,
        pricing_type:pricing,price_php:pricing==="premium"?numericPrice:null,description_html:html,description_text:text,
        icon_url:iconUrl,file_bucket:bucket,file_path:filePath,file_name:jar.name,status:"published"
      }).select("id").single();if(rerr)throw rerr;
      if(cleanLinks.length){const {error:lerr}=await supabase.from("resource_links").insert(cleanLinks.map((url,index)=>({resource_id:resource.id,url,position:index+1})));if(lerr)throw lerr;}
      router.push(`/resources/${slug}`);router.refresh();
    }catch(err:any){setError(err.message||"We couldn't publish your resource.");setBusy(false);}
  }

  return <form className="resourceUploadForm" onSubmit={submit}>
    {error&&<div className="authNotice errorNotice">{error}</div>}
    <section className="uploadPanel twoColFields">
      <label>Plugin / Resource Name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="Example: OrvenTeams"/></label>
      <label>Plugin Version<input value={pluginVersion} onChange={e=>setPluginVersion(e.target.value)} maxLength={30} required placeholder="Example: 1.0.0"/></label>
      <label>Plugin Logo / Icon<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setIcon(e.target.files?.[0]||null)} required/><small>PNG, JPG, WEBP or GIF • max 5 MB</small></label>
      <label>Plugin File (.jar)<input type="file" accept=".jar,application/java-archive" onChange={e=>setJar(e.target.files?.[0]||null)} required/><small>Maximum 100 MB.</small></label>
    </section>

    <section className="uploadPanel"><div className="fieldTitle">Supported Platforms <small>Select everything this plugin officially supports.</small></div>
      <div className="platformPicker">{PLATFORMS.map(p=><label className={`platformChoice ${platforms.includes(p.id)?"selected":""}`} key={p.id}><input type="checkbox" checked={platforms.includes(p.id)} onChange={()=>toggle(p.id,platforms,setPlatforms)}/><Image src={p.icon} width={34} height={34} alt=""/><span>{p.label}</span><b>{platforms.includes(p.id)?"✓":""}</b></label>)}</div>
    </section>

    <section className="uploadPanel"><div className="fieldTitle">Supported Minecraft Versions <small>1.21 through 1.21.11, plus the new 26.x line.</small></div>
      <div className="versionPicker">{MC_VERSIONS.map(v=><label className={versions.includes(v)?"selected":""} key={v}><input type="checkbox" checked={versions.includes(v)} onChange={()=>toggle(v,versions,setVersions)}/><span>v{v}</span></label>)}</div>
    </section>

    <section className="uploadPanel"><div className="fieldTitle">Pricing</div><div className="pricingPicker">
      <label className={pricing==="free"?"selected":""}><input type="radio" name="pricing" checked={pricing==="free"} onChange={()=>setPricing("free")}/><b>Free</b><small>Anyone can download, even without an account.</small></label>
      <label className={pricing==="premium"?"selected":""}><input type="radio" name="pricing" checked={pricing==="premium"} onChange={()=>setPricing("premium")}/><b>Premium</b><small>Users must sign in and own the resource before downloading.</small></label>
    </div>{pricing==="premium"&&<label className="priceField">Price (PHP)<div className="priceInput"><span>₱</span><input type="number" min="1" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} required placeholder="199.00"/></div><small>The price is hidden from logged-out visitors.</small></label>}</section>

    <section className="uploadPanel"><div className="fieldTitle">Description</div><div className="editorToolbar">
      <button type="button" onClick={()=>cmd("bold")}><b>B</b></button><button type="button" onClick={()=>cmd("italic")}><i>I</i></button><button type="button" onClick={()=>cmd("underline")}><u>U</u></button><button type="button" onClick={()=>cmd("formatBlock","h2")}>H2</button><button type="button" onClick={()=>cmd("insertUnorderedList")}>• List</button>
      <select defaultValue="Arial" onChange={e=>cmd("fontName",e.target.value)}><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Trebuchet MS</option><option>Courier New</option></select><button type="button" onClick={()=>cmd("insertText","😀")}>😀 Emoji</button>
    </div><div ref={editor} className="richEditor" contentEditable suppressContentEditableWarning onPaste={paste} data-placeholder="Describe your plugin. You can format text, use emojis, and Ctrl+V screenshots from Snipping Tool…"/><small>Tip: screenshots pasted here are uploaded automatically.</small></section>
    <section className="uploadPanel"><div className="fieldTitle">Links <small>up to 4</small></div>{links.map((v,i)=><input key={i} type="url" value={v} onChange={e=>setLinks(x=>x.map((a,n)=>n===i?e.target.value:a))} placeholder={`Link ${i+1} — https://...`}/>)}</section>
    <div className="uploadSubmitRow"><button className="goldAction" disabled={busy}>{busy?"Publishing…":"Publish Resource"}</button><span>Only upload plugins/resources you have permission to distribute.</span></div>
  </form>;
}