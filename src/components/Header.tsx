import Link from "next/link";
import AuthButton from "./AuthButton";
import OrvenLogo from "./OrvenLogo";
import LiveSearch from "./LiveSearch";
import OrvenMenu from "./OrvenMenu";
import NotificationIndicator from "./NotificationIndicator";
import SupportButton from "./SupportButton";
import OnlineMembers from "./OnlineMembers";
export default function Header({ user, credits }: { user: { name: string; avatar?: string | null; username?: string; role?: string } | null; credits?: number }) {
  return <header className="siteHeader">
    <Link href="/" className="brandLink"><OrvenLogo/></Link>
    <div className="headerSearchGroup"><LiveSearch variant="header"/>{user&&<><OrvenMenu/><SupportButton/></>}</div>
    <div className="headerRight"><Link href="/">Home</Link>{user&&<NotificationIndicator/>}{user&&typeof credits==="number"&&<div className="headerCredits" title="Your Orven Credits"><span>◇</span><div><small>ORVEN CREDITS</small><b>₱{credits.toLocaleString()}</b></div></div>}<OnlineMembers/><AuthButton user={user}/></div>
  </header>;
}
