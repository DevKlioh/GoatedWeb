export default function GoatedLogo({ compact = false }: { compact?: boolean }) {
  return <div className={`goatedLogo ${compact ? "compact" : ""}`} aria-label="OrvenSMP"><span className="orvenMark">O</span>{!compact&&<span className="logoWords"><b>Orven</b><em>SMP</em><small>MINECRAFT COMMUNITY</small></span>}</div>;
}
