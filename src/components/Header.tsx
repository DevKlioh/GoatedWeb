import Link from "next/link";
import AuthButton from "./AuthButton";
import OrvenLogo from "./OrvenLogo";
import LiveSearch from "./LiveSearch";
import OrvenMenu from "./OrvenMenu";
import NotificationIndicator from "./NotificationIndicator";
export default function Header({ user }: { user: { name: string; avatar?: string | null; username?: string; role?: string } | null }) {
  return <header className="siteHeader">
    <Link href="/" className="brandLink"><OrvenLogo/></Link>
    <div className="headerSearchGroup"><LiveSearch variant="header"/>{user&&<OrvenMenu/>}</div>
    <div className="headerRight"><Link href="/">Home</Link>{user&&<NotificationIndicator/>}<AuthButton user={user}/></div>
  </header>;
}
