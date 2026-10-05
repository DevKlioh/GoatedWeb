"use client";
import { useEffect } from "react";

export default function ThemeBoot(){
 useEffect(()=>{
  const apply=()=>{const saved=localStorage.getItem("orven-theme");const theme=saved==="light"?"light":"dark";document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme};
  apply();
  const onStorage=(e:StorageEvent)=>{if(e.key==="orven-theme")apply()};
  window.addEventListener("storage",onStorage);return()=>window.removeEventListener("storage",onStorage);
 },[]);
 return null;
}
