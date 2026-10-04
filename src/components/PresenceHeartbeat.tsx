"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
export default function PresenceHeartbeat({userId}:{userId:string}){
 useEffect(()=>{const supabase=createClient();let alive=true;const beat=async()=>{if(alive)await supabase.from("profiles").update({last_seen_at:new Date().toISOString()}).eq("id",userId)};beat();const id=setInterval(beat,60000);const visible=()=>{if(document.visibilityState==="visible")beat()};document.addEventListener("visibilitychange",visible);return()=>{alive=false;clearInterval(id);document.removeEventListener("visibilitychange",visible)}},[userId]);return null;
}