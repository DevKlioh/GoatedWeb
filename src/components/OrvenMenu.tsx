"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";

export default function OrvenMenu(){
  const [open,setOpen]=useState(false);
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const close=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};
    const esc=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};
    document.addEventListener("mousedown",close);document.addEventListener("keydown",esc);
    return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",esc)};
  },[]);
  return <div className="orvenMenu" ref={wrap}>
    <button className={`orvenMenuButton ${open?"open":""}`} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>Orven <span>⌄</span></button>
    {open&&<div className="orvenMenuDropdown">
      <div className="orvenMenuItem disabled"><span>Orven Shop</span><small>In development</small></div>
      <div className="orvenMenuItem disabled"><span>Orven Rewards</span><small>In development</small></div>
      <div className="orvenMenuItem disabled"><span>Orven Lotto</span><small>In development</small></div>
      <Link className="orvenMenuItem active" href="/games" onClick={()=>setOpen(false)}><span>Orven Games</span><small>Open game center →</small></Link>
    </div>}
  </div>;
}
