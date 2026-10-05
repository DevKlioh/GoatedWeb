"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";

export default function OrvenMenu(){
 const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("mousedown",close);document.addEventListener("keydown",key);return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",key)}},[]);
 return <div className="orvenMenu" ref={ref}>
  <button className={`orvenMenuButton ${open?"isOpen":""}`} type="button" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(v=>!v)}><span className="orvenButtonMark">O</span><b>Orven</b><span className="orvenChevron">⌄</span></button>
  {open&&<div className="orvenMenuDrop" role="menu">
   <div className="orvenDropHead"><span>ORVEN</span><small>Quick access</small></div>
   <div className="orvenDropList">
    <button disabled><span className="orvenItemIcon">◈</span><span><b>Orven Shop</b><small>Server store</small></span><em>SOON</em></button>
    <button disabled><span className="orvenItemIcon">✦</span><span><b>Orven Rewards</b><small>Community rewards</small></span><em>SOON</em></button>
    <button disabled><span className="orvenItemIcon">◇</span><span><b>Orven Lotto</b><small>Server lottery</small></span><em>SOON</em></button>
    <Link href="/games" onClick={()=>setOpen(false)}><span className="orvenItemIcon">▦</span><span><b>Orven Games</b><small>Play community games</small></span><em className="liveStatus">PLAY</em></Link>
   </div>
  </div>}
 </div>
}
