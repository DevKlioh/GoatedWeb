export default function GoatedLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`goatedLogo ${compact ? "compact" : ""}`} aria-label="GoatedPlugins">
      <span className="goatMark" aria-hidden="true">
        <span className="horn leftHorn" />
        <span className="horn rightHorn" />
        <span className="goatHead">G</span>
      </span>
      {!compact && <span className="logoWords"><b>Goated</b><em>Plugins</em><small>MINECRAFT COMMUNITY</small></span>}
    </div>
  );
}
