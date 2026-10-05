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
 type Tile={id:number,value:number,row:number,col:number,state?:"normal"|"new"|"pop"};
 type Motion={id:number,value:number,fromRow:number,fromCol:number,toRow:number,toCol:number,mergeInto?:number};
 const spawn=(used:Set<number>,id=Date.now()):Tile|null=>{const empty=[...Array(16)].map((_,i)=>i).filter(i=>!used.has(i));if(!empty.length)return null;const pos=empty[Math.floor(Math.random()*empty.length)];return {id:id+Math.random(),value:Math.random()<.9?2:4,row:Math.floor(pos/4),col:pos%4,state:"new"}};
 const seed=()=>{const used=new Set<number>();const a=spawn(used,Date.now())!;used.add(a.row*4+a.col);const b=spawn(used,Date.now()+1)!;return[a,b]};
 const [tiles,setTiles]=useState<Tile[]>(seed),[motions,setMotions]=useState<Motion[]>([]),[score,setScore]=useState(0),[best,setBest]=useState(0),[moving,setMoving]=useState(false),[gameOver,setGameOver]=useState(false);

 function canMove(list:Tile[]){const g=Array.from({length:4},()=>Array(4).fill(0));list.forEach(x=>g[x.row][x.col]=x.value);for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(!g[r][c])return true;if(r<3&&g[r][c]===g[r+1][c])return true;if(c<3&&g[r][c]===g[r][c+1])return true}return false}
 function finish(s=score){if(s)onScore(s);setGameOver(true)}
 function reset(){setTiles(seed());setMotions([]);setScore(0);setBest(0);setMoving(false);setGameOver(false)}

 function move(dir:"l"|"r"|"u"|"d"){
  if(moving||gameOver)return;
  const horizontal=dir==="l"||dir==="r",reverse=dir==="r"||dir==="d";
  const groups:Array<Tile[]>=[[],[],[],[]];tiles.forEach(x=>groups[horizontal?x.row:x.col].push({...x,state:"normal"}));
  let gain=0,changed=false;const finalTiles:Tile[]=[];const motionList:Motion[]=[];
  for(let line=0;line<4;line++){
   const arr=groups[line].sort((a,b)=>horizontal?a.col-b.col:a.row-b.row);if(reverse)arr.reverse();
   const slots:{tile:Tile,sources:Tile[]}[]=[];
   for(const tile of arr){
    const prev=slots[slots.length-1];
    if(prev&&prev.tile.value===tile.value&&prev.sources.length===1){
     prev.sources.push(tile);prev.tile.value*=2;prev.tile.state="pop";gain+=prev.tile.value;changed=true;
    }else slots.push({tile:{...tile},sources:[tile]});
   }
   slots.forEach((slot,pos)=>{
    const target=reverse?3-pos:pos,nr=horizontal?line:target,nc=horizontal?target:line;
    const finalId=slot.tile.id;
    finalTiles.push({...slot.tile,row:nr,col:nc,id:finalId});
    slot.sources.forEach(source=>{
     if(source.row!==nr||source.col!==nc)changed=true;
     motionList.push({id:source.id,value:source.value,fromRow:source.row,fromCol:source.col,toRow:nr,toCol:nc,mergeInto:slot.sources.length>1?finalId:undefined});
    });
   });
  }
  if(!changed){if(!canMove(tiles))finish();return}

  // Keep the logical board frozen and animate temporary visual copies from old -> final positions.
  setMoving(true);setMotions(motionList);
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelector(".animatedMergeBoard")?.classList.add("isSliding")));

  const nextScore=score+gain;
  window.setTimeout(()=>{
   const used=new Set(finalTiles.map(x=>x.row*4+x.col));const born=spawn(used);
   const settled=finalTiles.map(x=>({...x,state:x.state==="pop"?"pop":"normal"} as Tile));
   if(born)settled.push(born);
   setTiles(settled);setMotions([]);setScore(nextScore);setBest(x=>Math.max(x,nextScore));setMoving(false);
   document.querySelector(".animatedMergeBoard")?.classList.remove("isSliding");
   window.setTimeout(()=>{setTiles(cur=>cur.map(x=>({...x,state:"normal"})));if(!canMove(settled))finish(nextScore)},260);
  },360);
 }
 useEffect(()=>{const k=(e:KeyboardEvent)=>{const m:Record<string,"l"|"r"|"u"|"d">={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"};if(m[e.key]){e.preventDefault();move(m[e.key])}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k)});

 return <div className="playBox mergePlayBox"><GameTitle title="Orven Merge" score={score} best={best} reset={reset}/>
  <div className="mergeBoard animatedMergeBoard">
   {Array.from({length:16},(_,i)=><div key={i} className="mergeCell"/>)}
   {!moving&&tiles.map(tile=><div key={tile.id} className={`mergeSettledTile v${tile.value} ${tile.state||"normal"}`} style={{"--row":tile.row,"--col":tile.col} as React.CSSProperties}>{tile.value}</div>)}
   {moving&&motions.map(m=><div key={`motion-${m.id}`} className={`mergeMotionTile${m.mergeInto?" willMerge":""}`} style={{"--from-row":m.fromRow,"--from-col":m.fromCol,"--to-row":m.toRow,"--to-col":m.toCol} as React.CSSProperties}>{m.value}</div>)}
  </div>
  <div className="mergeControls"><button disabled={moving} onClick={()=>move("u")}>↑</button><div><button disabled={moving} onClick={()=>move("l")}>←</button><button disabled={moving} onClick={()=>move("d")}>↓</button><button disabled={moving} onClick={()=>move("r")}>→</button></div></div>
  <p className="mergeTip">Use your arrow keys or the controls.</p>
  {gameOver&&<div className="mergeGameOverBackdrop"><div className="mergeGameOverModal"><span>ORVEN MERGE</span><h2>Out of moves!</h2><p>Your final score is <b>{score.toLocaleString()}</b>.</p><div><button className="mergeDone" onClick={()=>setGameOver(false)}>Done</button><button className="mergeAgain" onClick={reset}>Play new game</button></div></div></div>}
 </div>
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
 const [level,setLevel]=useState(1),[pattern,setPattern]=useState<number[]>([]),[input,setInput]=useState<number[]>([]);
 const [active,setActive]=useState(false),[showing,setShowing]=useState(false),[flash,setFlash]=useState<number|null>(null);
 const [gameOver,setGameOver]=useState(false),[finalScore,setFinalScore]=useState(0),[wrongTile,setWrongTile]=useState<number|null>(null);

 function makePattern(l:number){return Array.from({length:Math.min(2+l,12)},()=>Math.floor(Math.random()*16))}
 function playPattern(p:number[]){
  setShowing(true);setInput([]);setFlash(null);
  let i=0;
  const step=()=>{
   if(i>=p.length){setFlash(null);setShowing(false);return}
   setFlash(p[i]);
   window.setTimeout(()=>{setFlash(null);i++;window.setTimeout(step,260)},520);
  };
  window.setTimeout(step,420);
 }
 function startRound(l=level){
  const p=makePattern(l);setPattern(p);setActive(true);setWrongTile(null);playPattern(p);
 }
 function hit(i:number){
  if(!active||showing||gameOver)return;
  const pos=input.length;
  if(pattern[pos]!==i){
   const s=(level-1)*100;setWrongTile(i);setFinalScore(s);setActive(false);
   if(s)onScore(s);
   window.setTimeout(()=>setGameOver(true),180);
   return;
  }
  const next=[...input,i];setInput(next);setFlash(i);
  window.setTimeout(()=>setFlash(null),150);
  if(next.length===pattern.length){
   const nextLevel=level+1;setShowing(true);
   window.setTimeout(()=>{setLevel(nextLevel);startRound(nextLevel)},650);
  }
 }
 function reset(){
  setLevel(1);setPattern([]);setInput([]);setActive(false);setShowing(false);setFlash(null);setGameOver(false);setFinalScore(0);setWrongTile(null);
  window.setTimeout(()=>startRound(1),120);
 }
 function done(){setGameOver(false);setWrongTile(null)}
 return <div className="playBox memoryPlayBox"><GameTitle title="Memory Grid" score={(level-1)*100} reset={reset}/>
  <div className="memoryStatus">
   <span>{!active?"Ready?":showing?"Watch carefully…":"Your turn"}</span>
   <b>Level {level}</b>
  </div>
  <p className="gameHint">{!active?"Press Start. Tiles will light up one at a time — remember the exact order.":showing?"Follow each tile as it appears.":"Repeat the tiles in the same order."}</p>
  <div className={`memoryBoard sequentialMemory ${showing?"isShowing":""}`}>
   {Array.from({length:16},(_,i)=><button key={i} disabled={showing||!active} className={`${flash===i?"lit pulse":""}${wrongTile===i?" wrong":""}`} onClick={()=>hit(i)}><span/></button>)}
  </div>
  {!active&&!gameOver&&<button className="gamePrimary" onClick={()=>startRound()}>Start</button>}
  {gameOver&&<div className="memoryGameOverBackdrop">
   <div className="memoryGameOverModal">
    <span>MEMORY GRID</span><div className="memoryFailIcon">×</div>
    <h2>You hit the wrong tile!</h2><h3>Game Over</h3>
    <p>Your final score</p><strong>{finalScore.toLocaleString()}</strong>
    <small>You reached Level {level}.</small>
    <div className="memoryGameOverActions"><button className="memoryDone" onClick={done}>Done</button><button className="memoryAgain" onClick={reset}>Play again</button></div>
   </div>
  </div>}
 </div>
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
