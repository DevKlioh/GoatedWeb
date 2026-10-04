import Image from "next/image";
export default function OrvenLogo({compact=false}:{compact?:boolean}){
 return <div className={`goatedLogo ${compact?"compact":""}`} aria-label="OrvenSMP"><Image className="officialGoatedLogo" src="/orvensmp-logo.png" alt="OrvenSMP" width={48} height={48} priority/>{!compact&&<span className="logoWords orvenLogoWords"><b>OrvenSMP</b><small>ORVENSMP COMMUNITY</small></span>}</div>;
}