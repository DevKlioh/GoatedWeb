"use client";
import { useEffect,useState } from "react";
type Theme="dark"|"light";
export default function AppearanceSettings(){
 const [theme,setTheme]=useState<Theme>("dark");
 useEffect(()=>{setTheme(document.documentElement.dataset.theme==="light"?"light":"dark")},[]);
 function choose(next:Theme){setTheme(next);localStorage.setItem("orven-theme",next);document.documentElement.dataset.theme=next;document.documentElement.style.colorScheme=next;}
 return <section className="appearanceCard">
  <div className="settingsSectionTitle"><div><span className="eyebrow">APPEARANCE</span><h2>Theme</h2></div><p>Choose how OrvenSMP looks on this device.</p></div>
  <div className="themeChoices" role="radiogroup" aria-label="Website theme">
   <button type="button" role="radio" aria-checked={theme==="dark"} className={theme==="dark"?"active":""} onClick={()=>choose("dark")}><span className="themePreview darkPreview"><i/><i/><i/></span><span><b>Night mode</b><small>Dark, focused and easy on the eyes.</small></span><em>{theme==="dark"?"✓":""}</em></button>
   <button type="button" role="radio" aria-checked={theme==="light"} className={theme==="light"?"active":""} onClick={()=>choose("light")}><span className="themePreview lightPreview"><i/><i/><i/></span><span><b>Day light</b><small>Bright, clean and comfortable in daylight.</small></span><em>{theme==="light"?"✓":""}</em></button>
  </div>
  <p className="themeFootnote">Your choice is saved automatically in this browser.</p>
 </section>
}
