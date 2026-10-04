import Link from "next/link";
import AuthButton from "./AuthButton";

type HeaderUser = { name: string; avatar?: string | null; username?: string | null } | null;

export default function Header({ user }: { user: HeaderUser }) {
  return <header className="topbar">
    <Link className="brand" href="/"><span className="brandMark">S</span><span>Social</span></Link>
    <nav><Link className="homeLink" href="/">Home</Link>{user?.username && <Link className="homeLink" href={`/profile/${encodeURIComponent(user.username)}`}>Profile</Link>}</nav>
    <div className="searchWrap"><input aria-label="Search" placeholder="Search people, posts and more…" disabled /><span className="soon">Soon</span></div>
    <div className="account"><AuthButton user={user} /></div>
  </header>;
}
