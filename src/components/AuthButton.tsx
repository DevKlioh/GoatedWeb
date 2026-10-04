"use client";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { user: { name: string; avatar?: string | null; username?: string | null } | null };
type View = "signin" | "signup" | "verify" | "forgot" | "recovery-code" | "new-password" | "checkemail";

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const validUsername = /^[A-Za-z0-9_]{3,24}$/;

export default function AuthButton({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => { const openAuth = () => { setOpen(true); setView("signin"); resetNotices(); }; window.addEventListener("goated:auth", openAuth); return () => window.removeEventListener("goated:auth", openAuth); }, []);

  function resetNotices() { setError(""); setMessage(""); }
  function changeView(next: View) { resetNotices(); setView(next); setCode(""); }

  async function oauth(provider: "discord" | "google") {
    resetNotices();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setError(error.message);
  }

  async function signIn(e: FormEvent) {
    e.preventDefault(); resetNotices(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false); router.refresh();
  }

  async function signUp(e: FormEvent) {
    e.preventDefault(); resetNotices();
    const cleanUser = username.trim();
    if (!validUsername.test(cleanUser)) return setError("Username must be 3–24 characters and use only letters, numbers, or underscores.");
    if (!strongPassword.test(password)) return setError("Password does not meet all security requirements.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { username: cleanUser } }
    });
    setBusy(false);
    if (error) return setError(error.message);
    setMessage("We sent a confirmation link to your email."); setView("checkemail");
  }

  async function verifySignup(e: FormEvent) {
    e.preventDefault(); resetNotices();
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from your email.");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "signup" });
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false); router.refresh();
  }

  async function resendSignup() {
    resetNotices(); setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    setMessage("A new verification code was sent.");
  }

  async function sendRecovery(e: FormEvent) {
    e.preventDefault(); resetNotices(); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) return setError(error.message);
    setMessage("If that email is registered, a 6-digit recovery code has been sent."); setView("recovery-code");
  }

  async function verifyRecovery(e: FormEvent) {
    e.preventDefault(); resetNotices();
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit recovery code.");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "recovery" });
    setBusy(false);
    if (error) return setError(error.message);
    setPassword(""); setConfirmPassword(""); setView("new-password");
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault(); resetNotices();
    if (!strongPassword.test(password)) return setError("Password does not meet all security requirements.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setMessage("Password updated successfully."); setView("signin"); setPassword(""); setConfirmPassword("");
  }

  async function logout() { await supabase.auth.signOut(); router.push("/"); router.refresh(); }

  if (user) return <details className="accountMenu">
    <summary aria-label="Open account menu">
      {user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatarFallback">{user.name.slice(0,1).toUpperCase()}</span>}
      <span>{user.name}</span><span className="menuChevron">⌄</span>
    </summary>
    <div className="menuPanel accountDropdown">
      <div className="accountDropdownHead">
        {user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatarFallback">{user.name.slice(0,1).toUpperCase()}</span>}
        <div><strong>{user.name}</strong><small>{user.username ? `@${user.username}` : "GoatedPlugins member"}</small></div>
      </div>
      <div className="accountMenuGroup">
        <a href="/settings"><span>⚙</span><div><b>Account Settings</b><small>Profile and account preferences</small></div></a>
        <a href="/resources"><span>⬡</span><div><b>Your Resources</b><small>Plugins and resources you own</small></div></a>
        <a href="/marked"><span>◆</span><div><b>Marked Posts</b><small>Posts you saved for later</small></div></a>
        <a href="/notifications"><span>●</span><div><b>Notifications</b><small>Mentions, replies, likes and messages</small></div></a>
        <a href="/messages"><span>✉</span><div><b>Messages</b><small>Your private conversations</small></div></a>
      </div>
      <div className="accountMenuFooter">
        <a className="uploadQuickLink" href="/resources/upload">＋ Upload Resource</a>
        <button onClick={logout}>Log out</button>
      </div>
    </div>
  </details>;

  const modal = open ? <div className="authOverlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="authModal" role="dialog" aria-modal="true" aria-label="Account authentication">
        <button className="modalClose" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <div className="authHeading">
          <span className="eyebrow">GOATED WEBSITE</span>
          <h2>{view === "signup" ? "Create your account" : view === "checkemail" ? "Check your email" : view === "verify" ? "Verify your email" : view === "forgot" || view === "recovery-code" || view === "new-password" ? "Recover your account" : "Welcome back"}</h2>
          <p>{view === "checkemail" ? `We sent a confirmation link to ${email}. Open the email and click the link to verify your account.` : view === "verify" ? `Enter the code sent to ${email}.` : view === "recovery-code" ? `Enter the recovery code sent to ${email}.` : view === "new-password" ? "Choose a new strong password." : "Sign in securely to continue."}</p>
        </div>

        {error && <div className="authNotice errorNotice">{error}</div>}
        {message && <div className="authNotice successNotice">{message}</div>}

        {view === "signin" && <>
          <form className="authForm" onSubmit={signIn}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" /></label>
            <button className="formSubmit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <button className="textButton" onClick={()=>changeView("forgot")}>Forgot password?</button>
          <div className="authDivider"><span>OR</span></div>
          <div className="socialAuth"><button className="discordButton" onClick={()=>oauth("discord")}>Continue with Discord</button><button className="googleButton" onClick={()=>oauth("google")}><span className="googleG">G</span>Continue with Google</button></div>
          <p className="switchAuth">Don't have an account? <button onClick={()=>changeView("signup")}>Create account</button></p>
        </>}

        {view === "signup" && <>
          <form className="authForm" onSubmit={signUp}>
            <label>Username<input required minLength={3} maxLength={24} value={username} onChange={e=>setUsername(e.target.value)} placeholder="your_username" autoComplete="username" /></label>
            <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
            <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a strong password" autoComplete="new-password" /></label>
            <div className="passwordRules"><span className={password.length>=8?"ok":""}>8+ characters</span><span className={/[A-Z]/.test(password)?"ok":""}>Uppercase</span><span className={/[a-z]/.test(password)?"ok":""}>Lowercase</span><span className={/\d/.test(password)?"ok":""}>Number</span><span className={/[^A-Za-z0-9]/.test(password)?"ok":""}>Symbol</span></div>
            <label>Confirm password<input type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></label>
            <button className="formSubmit" disabled={busy}>{busy?"Creating…":"Create account"}</button>
          </form>
          <p className="switchAuth">Already have an account? <button onClick={()=>changeView("signin")}>Sign in</button></p>
        </>}

        {view === "checkemail" && <div className="authForm">
          <div className="emailLinkNotice"><strong>Confirmation email sent</strong><span>Click the verification link in your email. After your email is verified, come back here and sign in normally.</span></div>
          <button type="button" className="formSubmit" onClick={()=>changeView("signin")}>Back to sign in</button>
        </div>}
        {view === "verify" && <form className="authForm" onSubmit={verifySignup}><label>6-digit verification code<input className="codeInput" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" autoComplete="one-time-code" /></label><button className="formSubmit" disabled={busy}>{busy?"Verifying…":"Verify email"}</button><button type="button" className="textButton" onClick={resendSignup} disabled={busy}>Resend code</button></form>}

        {view === "forgot" && <form className="authForm" onSubmit={sendRecovery}><label>Registered email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label><button className="formSubmit" disabled={busy}>{busy?"Sending…":"Send recovery code"}</button><button type="button" className="textButton" onClick={()=>changeView("signin")}>Back to sign in</button></form>}

        {view === "recovery-code" && <form className="authForm" onSubmit={verifyRecovery}><label>6-digit recovery code<input className="codeInput" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" autoComplete="one-time-code" /></label><button className="formSubmit" disabled={busy}>{busy?"Verifying…":"Verify code"}</button></form>}

        {view === "new-password" && <form className="authForm" onSubmit={updatePassword}><label>New password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></label><div className="passwordRules"><span className={password.length>=8?"ok":""}>8+ characters</span><span className={/[A-Z]/.test(password)?"ok":""}>Uppercase</span><span className={/[a-z]/.test(password)?"ok":""}>Lowercase</span><span className={/\d/.test(password)?"ok":""}>Number</span><span className={/[^A-Za-z0-9]/.test(password)?"ok":""}>Symbol</span></div><label>Confirm new password<input type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" /></label><button className="formSubmit" disabled={busy}>{busy?"Updating…":"Update password"}</button></form>}
      </section>
    </div> : null;

  return <>
    <button className="primaryAuthButton" onClick={() => { setOpen(true); changeView("signin"); }}>Sign in</button>
    {modal && createPortal(modal, document.body)}
  </>;
}
