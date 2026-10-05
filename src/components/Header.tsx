import Link from "next/link";
import AuthButton from "./AuthButton";
import OrvenLogo from "./OrvenLogo";
import LiveSearch from "./LiveSearch";
import OrvenMenu from "./OrvenMenu";
export default function Header({ user }: { user: { name: string; avatar?: string | null; username?: string; role?: string } | null }) {
  return <header className="siteHeader">
    <Link href="/" className="brandLink"><OrvenLogo/></Link>
    <div className="headerSearchRow"><LiveSearch variant="header"/><OrvenMenu/></div>
    <div className="headerRight"><Link href="/">Home</Link><AuthButton user={user}/></div>
  </header>;
}
