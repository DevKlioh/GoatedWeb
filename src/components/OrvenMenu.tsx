"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";

export default function OrvenMenu(){
 const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};
 document.addEventListener("mousedown",close);document.addEventListener("keydown",key);
 return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",key)}},[]);
 return <div className="orvenMenu" ref={ref}>
  <button className="orvenMenuButton" onClick={()=>setOpen(v=>!v)}>Orven <span>⌄</span></button>
  {open&&<div className="orvenMenuDrop">
   <button disabled><b>Orven Shop</b><small>In development</small></button>
   <button disabled><b>Orven Rewards</b><small>In development</small></button>
   <button disabled><b>Orven Lotto</b><small>In development</small></button>
   <Link href="/games" onClick={()=>setOpen(false)}><b>Orven Games</b><small>Play now</small></Link>
  </div>}
 </div>
}