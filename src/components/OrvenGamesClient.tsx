"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
type Game="merge"|"block"|"memory"|"math";
const info:{id:Game;name:string;desc:string;icon:string}[]=[
 {id:"merge",name:"Orven Merge",desc:"Merge matching tiles and build the biggest value you can.",icon:"◇"},
 {id:"block",name:"Block Puzzle",desc:"Place pieces, clear lines and keep the board alive.",icon:"▦"},
 {id:"memory",name:"Memory Grid",desc:"Remember the glowing pattern as every round gets harder.",icon:"✦"},
 {id:"math",name:"Quick Math",desc:"Solve fast, build a streak and beat the clock.",icon:"+"},
];
export default function OrvenGamesClient({userId,isAdmin}:{userId:string|null,isAdmin:boolean}){
 const [game,setGame]=useState<Game>("merge");const [scores,setScores]=useState<any[]>([]);const [refresh,setRefresh]=useState(0);
 const load=useCallback(()=>fetch(`/api/game-scores?game=${game}`,{cache:"no-store"}).then(r=>r.json()).then(d=>setScores(d.scores||[])),[game]);
 useEffect(()=>{load()},[load,refresh]);
 async function save(score:number){if(!userId)return;await fetch("/api/game-scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({game,score})});setRefresh(x=>x+1)}
 async function remove(uid?:string){if(!confirm(uid?"Remove this player's score?":"Clear ALL scores for this game?"))return;await fetch("/api/game-scores",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({game,userId:uid})});setRefresh(x=>x+1)}
 return <div className="gamesLayout"><section className="gamesMain">
  <div className="gameTabs">{info.map(g=><button key={g.id} className={game===g.id?"active":""} onClick={()=>setGame(g.id)}><span>{g.icon}</span><div><b>{g.name}</b><small>{g.desc}</small></div></button>)}</div>
  <div className="gameStage">
   {game==="merge"&&<Merge onScore={save}/>}
   {game==="block"&&<BlockPuzzle onScore={save}/>}
   {game==="memory"&&<Memory onScore={save}/>}
   {game==="math"&&<QuickMath onScore={save}/>}
   {!userId&&<div className="gameSignInNote">You can play as a guest. Sign in if you want your best score saved to the leaderboard.</div>}
  </div>
 </section><aside className="leaderboard"><div className="leaderHead"><div><span>TOP 10</span><h2>{info.find(x=>x.id===game)?.name}</h2></div>{isAdmin&&<button onClick={()=>remove()}>Clear all</button>}</div>
  <div className="scoreList">{scores.length?scores.map((s,i)=>{const p=Array.isArray(s.profiles)?s.profiles[0]:s.profiles;return <div className="scoreRow" key={s.id}><strong>{i+1}</strong><div>{p?.avatar_url?<img src={p.avatar_url} alt=""/>:<i/>}<span><b>{p?.display_name||p?.username||"Player"}</b><small>@{p?.username||"player"}</small></span></div><em>{s.score.toLocaleString()}</em>{isAdmin&&<button title="Remove score" onClick={()=>remove(s.user_id)}>×</button>}</div>}):<p className="noScores">No scores yet. Be the first.</p>}</div>
 </aside></div>
}

function Merge({onScore}:{onScore:(n:number)=>void}){
 const fresh=()=>[2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2].sort(()=>Math.random()-.5);
 const [b,setB]=useState<number[]>(fresh);const [score,setScore]=useState(0);const [best,setBest]=useState(0);
 function reset(){if(score)onScore(score);setB(fresh());setScore(0)}
 function move(dir:string){let a=[...b],gain=0,changed=false;const lines:number[][]=[];
 for(let i=0;i<4;i++)lines.push(dir==="l"||dir==="r"?[0,1,2,3].map(x=>i*4+x):[0,1,2,3].map(y=>y*4+i));
 if(dir==="r"||dir==="d")lines.forEach(x=>x.reverse());
 for(const ids of lines){let vals=ids.map(i=>a[i]).filter(Boolean);for(let j=0;j<vals.length-1;j++)if(vals[j]===vals[j+1]){vals[j]*=2;gain+=vals[j];vals.splice(j+1,1)}
 while(vals.length<4)vals.push(0);ids.forEach((id,j)=>{if(a[id]!==vals[j])changed=true;a[id]=vals[j]})}
 if(changed){const empty=a.map((v,i)=>v?null:i).filter(x=>x!==null) as number[];if(empty.length)a[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;setB(a);setScore(s=>{const n=s+gain;setBest(x=>Math.max(x,n));return n})}}
 useEffect(()=>{const k=(e:KeyboardEvent)=>{const m:any={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"};if(m[e.key]){e.preventDefault();move(m[e.key])}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k)});
 return <div className="playBox"><GameTitle title="Orven Merge" score={score} best={best} reset={reset}/><div className="mergeBoard">{b.map((v,i)=><div key={i} className={`mergeTile v${v}`}>{v||""}</div>)}</div><div className="mergeControls"><button onClick={()=>move("u")}>↑</button><div><button onClick={()=>move("l")}>←</button><button onClick={()=>move("d")}>↓</button><button onClick={()=>move("r")}>→</button></div></div></div>
}
function BlockPuzzle({onScore}:{onScore:(n:number)=>void}){
 const [cells,setCells]=useState<boolean[]>(Array(100).fill(false));const [score,setScore]=useState(0);const [piece,setPiece]=useState(()=>Math.floor(Math.random()*3));
 const shapes=[[0],[0,1],[0,1,10,11]];
 function place(i:number){const shape=shapes[piece];const x=i%10;if(shape.some(o=>i+o>=100)||(piece===1&&x===9)||(piece===2&&x===9)||shape.some(o=>cells[i+o]))return;
 let n=[...cells];shape.forEach(o=>n[i+o]=true);let cleared=0;for(let r=0;r<10;r++)if(n.slice(r*10,r*10+10).every(Boolean)){for(let c=0;c<10;c++)n[r*10+c]=false;cleared++}
 for(let c=0;c<10;c++){let full=true;for(let r=0;r<10;r++)if(!n[r*10+c])full=false;if(full){for(let r=0;r<10;r++)n[r*10+c]=false;cleared++}}
 setCells(n);setPiece(Math.floor(Math.random()*3));setScore(s=>s+shape.length*10+cleared*100)}
 function reset(){if(score)onScore(score);setCells(Array(100).fill(false));setScore(0)}
 return <div className="playBox"><GameTitle title="Block Puzzle" score={score} reset={reset}/><div className="piecePreview">Next piece: <b>{["■","■■","▦"][piece]}</b></div><div className="blockBoard">{cells.map((v,i)=><button key={i} className={v?"filled":""} onClick={()=>place(i)}/>)}</div></div>
}
function Memory({onScore}:{onScore:(n:number)=>void}){
 const [level,setLevel]=useState(1),[pattern,setPattern]=useState<number[]>([]),[input,setInput]=useState<number[]>([]),[show,setShow]=useState(false),[active,setActive]=useState(false);
 function next(l=level){const p=Array.from({length:Math.min(3+l,12)},()=>Math.floor(Math.random()*16));setPattern(p);setInput([]);setShow(true);setActive(true);setTimeout(()=>setShow(false),900+Math.min(l*120,1200))}
 function hit(i:number){if(!active||show)return;const pos=input.length;if(pattern[pos]!==i){onScore((level-1)*100);setActive(false);return}const ni=[...input,i];setInput(ni);if(ni.length===pattern.length){setLevel(l=>l+1);setTimeout(()=>next(level+1),450)}}
 function reset(){if(level>1)onScore((level-1)*100);setLevel(1);setPattern([]);setInput([]);setActive(false);setShow(false)}
 return <div className="playBox"><GameTitle title="Memory Grid" score={(level-1)*100} reset={reset}/><p className="gameHint">{!active?"Press Start and remember the highlighted tiles.":show?"Memorize…":"Repeat the pattern."}</p><div className="memoryBoard">{Array.from({length:16},(_,i)=><button key={i} className={show&&pattern.includes(i)?"lit":""} onClick={()=>hit(i)}/>)}</div>{!active&&<button className="gamePrimary" onClick={()=>next()}>Start</button>}</div>
}
function QuickMath({onScore}:{onScore:(n:number)=>void}){
 const make=()=>{const a=Math.ceil(Math.random()*20),b=Math.ceil(Math.random()*20),op=Math.random()<.5?"+":"×";return {a,b,op,ans:op==="+"?a+b:a*b}};
 const [q,setQ]=useState(make),[val,setVal]=useState(""),[score,setScore]=useState(0),[time,setTime]=useState(30),[running,setRunning]=useState(false);
 useEffect(()=>{if(!running)return;const id=setInterval(()=>setTime(t=>{if(t<=1){clearInterval(id);setRunning(false);onScore(score);return 0}return t-1}),1000);return()=>clearInterval(id)},[running,score,onScore]);
 function submit(e:any){e.preventDefault();if(!running)return;if(Number(val)===q.ans){setScore(s=>s+10);setQ(make());setVal("")}else setScore(s=>Math.max(0,s-2))}
 function start(){setScore(0);setTime(30);setQ(make());setVal("");setRunning(true)}
 return <div className="playBox"><GameTitle title="Quick Math" score={score} extra={`${time}s`} reset={start}/><div className="mathQuestion">{q.a} {q.op} {q.b} = ?</div><form className="mathForm" onSubmit={submit}><input inputMode="numeric" value={val} onChange={e=>setVal(e.target.value)} disabled={!running} autoFocus/><button disabled={!running}>Answer</button></form>{!running&&<button className="gamePrimary" onClick={start}>{time===0?"Play again":"Start 30s round"}</button>}</div>
}
function GameTitle({title,score,best,extra,reset}:{title:string;score:number;best?:number;extra?:string;reset:()=>void}){return <div className="gameTitle"><div><span>PLAYING</span><h2>{title}</h2></div><div className="gameStats"><b>{score.toLocaleString()}<small>Score</small></b>{best!==undefined&&<b>{best.toLocaleString()}<small>Best</small></b>}{extra&&<b>{extra}<small>Time</small></b>}<button onClick={reset}>New game</button></div></div>}
