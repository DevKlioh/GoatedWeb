import Link from "next/link";
import AuthButton from "./AuthButton";
import GoatedLogo from "./GoatedLogo";
export default function Header({ user }: { user: { name: string; avatar?: string | null; username?: string } | null }) {
  return <header className="siteHeader">
    <Link href="/" className="brandLink"><GoatedLogo/></Link>
    <div className="headerSearch"><span>⌕</span><input aria-label="Search" placeholder="Search GoatedPlugins..."/></div>
    <div className="headerRight"><Link href="/">Home</Link><AuthButton user={user}/></div>
  </header>;
}
