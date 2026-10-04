import Link from "next/link";
import AuthButton from "./AuthButton";
import GoatedLogo from "./GoatedLogo";
import LiveSearch from "./LiveSearch";
export default function Header({ user }: { user: { name: string; avatar?: string | null; username?: string; role?: string } | null }) {
  return <header className="siteHeader">
    <Link href="/" className="brandLink"><GoatedLogo/></Link>
    <LiveSearch variant="header"/>
    <div className="headerRight"><Link href="/">Home</Link><AuthButton user={user}/></div>
  </header>;
}
