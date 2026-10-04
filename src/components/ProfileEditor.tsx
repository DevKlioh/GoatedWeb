"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const validUsername = /^[A-Za-z0-9_]{3,24}$/;

type Props = { id: string; username: string; displayName: string; bio: string };

export default function ProfileEditor({ id, username: initialUsername, displayName: initialDisplayName, bio: initialBio }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault(); setNotice(""); setError("");
    const clean = username.trim();
    if (!validUsername.test(clean)) return setError("Username must be 3–24 characters using only letters, numbers, or underscores.");
    if (displayName.trim().length > 50) return setError("Display name must be 50 characters or fewer.");
    if (bio.length > 240) return setError("Bio must be 240 characters or fewer.");
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id, username: clean, display_name: displayName.trim() || clean, bio: bio.trim() }, { onConflict: "id" });
    setBusy(false);
    if (error) {
      if (error.code === "23505") return setError("That username is already taken. Try another one.");
      return setError("We couldn't save your profile right now. Please try again.");
    }
    setNotice("Profile saved successfully.");
    router.refresh();
    if (clean.toLowerCase() !== initialUsername.toLowerCase()) router.push(`/profile/${encodeURIComponent(clean)}`);
  }

  return <form className="profileEditForm" onSubmit={save}>
    <div className="settingsSectionTitle"><div><span className="eyebrow">PUBLIC PROFILE</span><h2>Edit profile</h2></div><p>These details are visible to other members.</p></div>
    {error && <div className="authNotice errorNotice">{error}</div>}
    {notice && <div className="authNotice successNotice">{notice}</div>}
    <label>Username <div className="usernameField"><span>@</span><input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={24} required /></div><small>3–24 characters. Letters, numbers and underscores only.</small></label>
    <label>Display name <input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={50} placeholder="Your display name" /></label>
    <label>Bio <textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={240} rows={5} placeholder="Tell people a little about yourself…" /><small>{bio.length}/240</small></label>
    <button className="formSubmit profileSave" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
  </form>;
}
