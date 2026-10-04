import Image from "next/image";

export default function GoatedLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`goatedLogo ${compact ? "compact" : ""}`} aria-label="GoatedPlugins">
      <Image className="officialGoatedLogo" src="/goatedplugins-logo.png" alt="" width={48} height={48} priority />
      {!compact && <span className="logoWords"><b>Goated</b><em>Plugins</em><small>MINECRAFT COMMUNITY</small></span>}
    </div>
  );
}
