"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress(){
  const pathname=usePathname(), search=useSearchParams();
  const [active,setActive]=useState(false);

  useEffect(()=>{
    const click=(e:MouseEvent)=>{
      const a=(e.target as HTMLElement)?.closest("a") as HTMLAnchorElement|null;
      if(!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target==="_blank" || a.hasAttribute("download")) return;
      const url=new URL(a.href,window.location.href);
      if(url.origin===window.location.origin && url.href!==window.location.href) setActive(true);
    };
    document.addEventListener("click",click,true);
    return()=>document.removeEventListener("click",click,true);
  },[]);

  useEffect(()=>{
    setActive(false);
    document.documentElement.animate(
      [{opacity:.72,transform:"translateY(3px)"},{opacity:1,transform:"translateY(0)"}],
      {duration:220,easing:"cubic-bezier(.2,.8,.2,1)"}
    );
  },[pathname,search]);

  return <div className={`routeProgress ${active?"active":""}`} aria-hidden="true"><span/></div>;
}