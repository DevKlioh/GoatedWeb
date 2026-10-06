"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
type Game="menu"|"merge"|"block"|"memory"|"math";
const info:{id:Game;name:string;desc:string;icon:string}[]=[
 {id:"merge",name:"Orven Merge",desc:"Merge matching tiles and build the biggest value you can.",icon:"◇"},
 {id:"block",name:"Block Puzzle",desc:"Place pieces, clear lines and keep the board alive.",icon:"▦"},
 {id:"memory",name:"Memory Grid",desc:"Remember the glowing pattern as every round gets harder.",icon:"✦"},
 {id:"math",name:"Quick Math",desc:"Solve fast, build a streak and beat the clock.",icon:"+"},
];
export default function OrvenGamesClient({userId,isAdmin}:{userId:string|null,isAdmin:boolean}){
 if(!userId)return <div className="gamesLoginGate"><div><span>ORVEN GAMES</span><h2>Sign in to play</h2><p>Orven Games are available to registered members only. Sign in or create an account to start playing and compete on the leaderboards.</p><button type="button" onClick={()=>window.dispatchEvent(new Event("goated:auth"))}>Sign in / Register</button></div></div>;
 const [game,setGame]=useState<Game>("menu");const [scores,setScores]=useState<any[]>([]);const [refresh,setRefresh]=useState(0);
 const load=useCallback(()=>{if(game==="menu"){setScores([]);return Promise.resolve()}return fetch(`/api/game-scores?game=${game}`,{cache:"no-store"}).then(r=>r.json()).then(d=>setScores(d.scores||[]))},[game]);
 useEffect(()=>{load()},[load,refresh]);
 async function save(score:number){if(!userId)return;await fetch("/api/game-scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({game,score})});setRefresh(x=>x+1)}
 async function remove(uid?:string){if(!confirm(uid?"Remove this player's score?":"Clear ALL scores for this game?"))return;await fetch("/api/game-scores",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({game,userId:uid})});setRefresh(x=>x+1)}
 return <div className="gamesLayout"><section className="gamesMain">
  <div className="gameTabs">{info.map(g=><button key={g.id} className={game===g.id?"active":""} onClick={()=>setGame(g.id)}><span>{g.icon}</span><div><b>{g.name}</b><small>{g.desc}</small></div></button>)}</div>
  <div className="gameStage">
   {game==="menu"&&<div className="gamesMainMenu"><span>ORVEN GAMES</span><h2>Choose a game</h2><p>Select one of the games above to start playing.</p></div>}
   {game==="merge"&&<Merge onScore={save}/>}
   {game==="block"&&<BlockPuzzle onScore={save} onMenu={()=>setGame("menu")}/>}
   {game==="memory"&&<Memory onScore={save} onMenu={()=>setGame("menu")}/>}
   {game==="math"&&<QuickMath onScore={save}/>}
   {!userId&&<div className="gameSignInNote">You can play as a guest. Sign in if you want your best score saved to the leaderboard.</div>}
  </div>
 </section><aside className="leaderboard"><div className="leaderHead"><div><span>TOP 10</span><h2>{game==="menu"?"Main Menu":info.find(x=>x.id===game)?.name}</h2></div>{isAdmin&&game!=="menu"&&<button onClick={()=>remove()}>Clear all</button>}</div>
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
function BlockPuzzle({onScore,onMenu}:{onScore:(n:number)=>void;onMenu:()=>void}){
 type Shape={name:string;cells:[number,number][]};
 const SHAPES:Shape[]=[
  {name:"Single",cells:[[0,0]]},
  {name:"Domino",cells:[[0,0],[1,0]]},{name:"Domino",cells:[[0,0],[0,1]]},
  {name:"Line 3",cells:[[0,0],[1,0],[2,0]]},{name:"Line 3",cells:[[0,0],[0,1],[0,2]]},
  {name:"Line 4",cells:[[0,0],[1,0],[2,0],[3,0]]},{name:"Line 4",cells:[[0,0],[0,1],[0,2],[0,3]]},
  {name:"Line 5",cells:[[0,0],[1,0],[2,0],[3,0],[4,0]]},{name:"Line 5",cells:[[0,0],[0,1],[0,2],[0,3],[0,4]]},
  {name:"Square",cells:[[0,0],[1,0],[0,1],[1,1]]},
  {name:"3×2 Box",cells:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]},
  {name:"2×3 Box",cells:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]]},
  {name:"Big Box",cells:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]},
  {name:"L",cells:[[0,0],[0,1],[0,2],[1,2]]},{name:"L",cells:[[0,0],[1,0],[2,0],[0,1]]},
  {name:"L 5",cells:[[0,0],[0,1],[0,2],[0,3],[1,3]]},
  {name:"T",cells:[[0,0],[1,0],[2,0],[1,1]]},{name:"T 5",cells:[[0,0],[1,0],[2,0],[1,1],[1,2]]},
  {name:"Z",cells:[[0,0],[1,0],[1,1],[2,1]]},{name:"S",cells:[[1,0],[2,0],[0,1],[1,1]]},
  {name:"Plus",cells:[[1,0],[0,1],[1,1],[2,1],[1,2]]},
  {name:"Corner",cells:[[0,0],[1,0],[2,0],[0,1],[0,2]]},
  {name:"Stair",cells:[[0,0],[0,1],[1,1],[1,2],[2,2]]},
  {name:"U",cells:[[0,0],[2,0],[0,1],[1,1],[2,1]]}
 ];
 // Difficulty scales with score: easy utility pieces gradually become rare while
 // larger/awkward pieces become increasingly common. Rotation remains available.
 const HARD_SHAPES:Shape[]=[
  {name:"Long L",cells:[[0,0],[0,1],[0,2],[0,3],[1,3],[2,3]]},
  {name:"Wide T",cells:[[0,0],[1,0],[2,0],[3,0],[1,1],[1,2]]},
  {name:"Big Z",cells:[[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]]},
  {name:"Big S",cells:[[2,0],[3,0],[4,0],[0,1],[1,1],[2,1]]},
  {name:"Hook",cells:[[0,0],[0,1],[0,2],[1,2],[2,2],[2,1]]},
  {name:"Chunk",cells:[[0,0],[1,0],[2,0],[0,1],[1,1],[1,2]]},
  {name:"C",cells:[[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2]]},
  {name:"Big Plus",cells:[[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]]},
  {name:"Step 6",cells:[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]]},
  {name:"Corner 7",cells:[[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3]]}
 ];
 const difficultyFor=(n:number)=>n<=5000?1:n<=14999?2:n<=29999?3:n<=49999?4:5;
 const randomShape=(n=0)=>{
   const level=difficultyFor(n);
   // At high scores, small rescue pieces become deliberately uncommon.
   const easy=SHAPES.filter(x=>x.cells.length<=3);
   const medium=SHAPES.filter(x=>x.cells.length>=4&&x.cells.length<=5);
   const large=[...SHAPES.filter(x=>x.cells.length>=6),...HARD_SHAPES];
   const roll=Math.random();
   let pool:Shape[];
   if(level===1) pool=roll<.42?easy:roll<.90?medium:large;
   else if(level===2) pool=roll<.24?easy:roll<.72?medium:large;
   else if(level===3) pool=roll<.12?easy:roll<.52?medium:large;
   else if(level===4) pool=roll<.06?easy:roll<.34?medium:large;
   else pool=roll<.02?easy:roll<.20?medium:large;
   return pool[Math.floor(Math.random()*pool.length)];
 };
 const rotate=(s:Shape):Shape=>{const pts=s.cells.map(([x,y])=>[-y,x] as [number,number]);const minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));return {...s,cells:pts.map(([x,y])=>[x-minX,y-minY] as [number,number])}};
 const [board,setBoard]=useState<boolean[]>(Array(100).fill(false));
 const [pieces,setPieces]=useState<Shape[]>(()=>[randomShape(),randomShape(),randomShape()]);
 const [score,setScore]=useState(0),[held,setHeld]=useState<number|null>(null),[pointer,setPointer]=useState<{x:number,y:number}|null>(null),[anchor,setAnchor]=useState<number|null>(null);
 const [clearing,setClearing]=useState<number[]>([]),[combo,setCombo]=useState(0),[comboStreak,setComboStreak]=useState(0),[lastMultiplier,setLastMultiplier]=useState(1),[burst,setBurst]=useState<{id:number;level:number;mult:number}[]>([]);
 const [gameOver,setGameOver]=useState(false),[finalScore,setFinalScore]=useState(0);
 const boardRef=useRef<HTMLDivElement|null>(null),touchIds=useRef<number[]>([]);

 const dims=(s:Shape)=>({w:Math.max(...s.cells.map(c=>c[0]))+1,h:Math.max(...s.cells.map(c=>c[1]))+1});
 function canPlace(shape:Shape,index:number,b=board){const r=Math.floor(index/10),c=index%10;return shape.cells.every(([dx,dy])=>r+dy>=0&&c+dx>=0&&r+dy<10&&c+dx<10&&!b[(r+dy)*10+c+dx])}
 function rotations(shape:Shape){
  const seen=new Set<string>(),out:Shape[]=[];let s=shape;
  for(let n=0;n<4;n++){const key=[...s.cells].sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(c=>c.join(",")).join(";");if(!seen.has(key)){seen.add(key);out.push(s)}s=rotate(s)}
  return out;
 }
 function canAny(b:boolean[],ps:Shape[]){return ps.some(s=>rotations(s).some(r=>b.some((_,i)=>canPlace(r,i,b))))}
 function clearLines(b:boolean[]){const rows:number[]=[],cols:number[]=[];for(let r=0;r<10;r++)if(b.slice(r*10,r*10+10).every(Boolean))rows.push(r);for(let c=0;c<10;c++){let full=true;for(let r=0;r<10;r++)if(!b[r*10+c])full=false;if(full)cols.push(c)}const ids=new Set<number>();rows.forEach(r=>{for(let c=0;c<10;c++)ids.add(r*10+c)});cols.forEach(c=>{for(let r=0;r<10;r++)ids.add(r*10+c)});return {ids:[...ids],lines:Math.min(5,rows.length+cols.length)}}
 function cellFromPoint(x:number,y:number,shape:Shape){
  const el=boardRef.current;if(!el)return null;
  const rect=el.getBoundingClientRect();
  if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return null;
  const cellW=rect.width/10,cellH=rect.height/10,d=dims(shape);
  // The pointer represents the visual center of the carried piece. Convert that
  // center to the exact top-left board anchor used by both preview AND placement.
  const centerCol=(x-rect.left)/cellW,centerRow=(y-rect.top)/cellH;
  let col=Math.round(centerCol-d.w/2),row=Math.round(centerRow-d.h/2);
  col=Math.max(0,Math.min(10-d.w,col));row=Math.max(0,Math.min(10-d.h,row));
  return row*10+col;
 }
 function rotateHeld(){if(held===null)return;setPieces(ps=>{const n=[...ps];n[held]=rotate(n[held]);return n});setAnchor(null)}
 function place(pieceIndex:number,index:number){
  const shape=pieces[pieceIndex];if(!shape||!canPlace(shape,index))return;
  let next=[...board];shape.cells.forEach(([dx,dy])=>{const r=Math.floor(index/10)+dy,c=index%10+dx;next[r*10+c]=true});
  const cleared=clearLines(next),lines=cleared.lines;
  const nextStreak=lines?comboStreak+1:0;
  const multiplier=lines?Math.min(5,1+(nextStreak-1)*0.5):1;
  const base=shape.cells.length*10+(lines?lines*lines*100:0);
  const gained=Math.round(base*multiplier),nextScore=score+gained;setScore(nextScore);setComboStreak(nextStreak);setLastMultiplier(multiplier);
  const nextPieces=[...pieces];nextPieces[pieceIndex]=randomShape(nextScore);setPieces(nextPieces);setHeld(null);setPointer(null);setAnchor(null);
  if(lines){const fxLevel=Math.min(5,Math.max(lines,1+Math.floor(nextStreak/2)));setBoard(next);setClearing(cleared.ids);setCombo(fxLevel);const id=Date.now();setBurst(v=>[...v,{id,level:fxLevel,mult:multiplier}]);setTimeout(()=>setBurst(v=>v.filter(x=>x.id!==id)),1150);setTimeout(()=>{cleared.ids.forEach(i=>next[i]=false);setBoard([...next]);setClearing([]);setCombo(0);if(!canAny(next,nextPieces)){setFinalScore(nextScore);setGameOver(true);if(nextScore)onScore(nextScore)}},lines===1?500:650+fxLevel*90)}
  else{setBoard(next);if(!canAny(next,nextPieces)){setFinalScore(nextScore);setGameOver(true);if(nextScore)onScore(nextScore)}}
 }
 function reset(){if(score&&!gameOver)onScore(score);setBoard(Array(100).fill(false));setPieces([randomShape(),randomShape(),randomShape()]);setScore(0);setHeld(null);setPointer(null);setAnchor(null);setClearing([]);setCombo(0);setComboStreak(0);setLastMultiplier(1);setBurst([]);setGameOver(false);setFinalScore(0)}
 function begin(idx:number,x:number,y:number){setHeld(idx);setPointer({x,y});setAnchor(cellFromPoint(x,y,pieces[idx]))}
 function movePointer(x:number,y:number){if(held===null)return;setPointer({x,y});setAnchor(cellFromPoint(x,y,pieces[held]))}
 function endPointer(){if(held!==null&&anchor!==null&&canPlace(pieces[held],anchor))place(held,anchor);else{setHeld(null);setPointer(null);setAnchor(null)}}
 const preview=(()=>{if(held===null||anchor===null||!canPlace(pieces[held],anchor))return new Set<number>();const r=Math.floor(anchor/10),c=anchor%10;return new Set(pieces[held].cells.map(([dx,dy])=>(r+dy)*10+c+dx))})();
 useEffect(()=>{const rc=(e:MouseEvent)=>{if(held!==null){e.preventDefault();rotateHeld()}};window.addEventListener("contextmenu",rc);return()=>window.removeEventListener("contextmenu",rc)},[held,pieces]);
 return <div className="playBox blockDragGame" onPointerMove={e=>movePointer(e.clientX,e.clientY)} onPointerUp={endPointer} onPointerCancel={endPointer}>
  <GameTitle title="Block Puzzle" score={score} reset={reset}/><div className="blockPuzzleStatus"><div className={`blockComboHud ${comboStreak>0?"active":""}`}><span>COMBO</span><b>{comboStreak>0?`×${lastMultiplier.toFixed(1)}`:"×1.0"}</b><small>{comboStreak>1?`${comboStreak} clears in a row`:"Clear consecutive lines to multiply your score"}</small></div><div className={`blockDifficulty level${difficultyFor(score)}`}><span>DIFFICULTY</span><b>LEVEL {difficultyFor(score)}</b><small>{difficultyFor(score)===1?"Warm-up":difficultyFor(score)===2?"Getting tighter":difficultyFor(score)===3?"Hard":difficultyFor(score)===4?"Expert":"Nightmare"}</small></div></div>
  <p className="gameHint">Grab a piece and drop it on the board. Desktop: left-click/drag to move, right-click while holding to rotate. Mobile: drag with one finger and tap with a second finger to rotate.</p>
  <div className="blockPieceTray visualTray">{pieces.map((shape,idx)=>{const d=dims(shape);return <button key={idx} className={`visualPiece ${held===idx?"isHeld":""}`} onPointerDown={e=>{if(e.pointerType==="touch"){touchIds.current.push(e.pointerId);if(held!==null&&touchIds.current.length>=2){e.preventDefault();rotateHeld();return}}e.currentTarget.setPointerCapture?.(e.pointerId);begin(idx,e.clientX,e.clientY)}} onPointerUp={e=>{touchIds.current=touchIds.current.filter(x=>x!==e.pointerId)}}>
   <span className="trayShape" style={{"--pw":d.w,"--ph":d.h} as React.CSSProperties}>{shape.cells.map(([x,y],j)=><i key={j} style={{"--x":x,"--y":y} as React.CSSProperties}/>)}</span>
  </button>})}</div>
  <div ref={boardRef} className={`blockBoard dragBlockBoard preciseBoard combo${combo}`}>
   {board.map((v,i)=><button key={i} className={`${v?"filled":""}${preview.has(i)?" preview":""}${held!==null&&anchor!==null&&preview.size===0&&i===anchor?" invalid":""}`}/>)}
   {burst.map(x=><div key={x.id} className={`clearBurst level${x.level}`}><span>{x.level>=5?"ORVEN CLEAR!":x.level>=4?"MEGA CLEAR!":x.level>=3?"SUPER CLEAR!":x.level>=2?"DOUBLE CLEAR!":"CLEAR!"}<em>×{x.mult.toFixed(1)}</em></span>{Array.from({length:x.level*7},(_,i)=><i key={i} style={{"--n":i} as React.CSSProperties}/>)}</div>)}
  </div>
  {held!==null&&pointer&&(()=>{const s=pieces[held],d=dims(s);return <div className="liveHeldShape" style={{left:pointer.x,top:pointer.y,"--pw":d.w,"--ph":d.h} as React.CSSProperties}>{s.cells.map(([x,y],j)=><i key={j} style={{"--x":x,"--y":y} as React.CSSProperties}/>)}</div>})()}
  {gameOver&&<div className="memoryGameOverBackdrop"><div className="memoryGameOverModal"><span>BLOCK PUZZLE</span><div className="memoryFailIcon">×</div><h2>No more moves!</h2><h3>Game Over</h3><p>Your final score</p><strong>{finalScore.toLocaleString()}</strong><div className="memoryGameOverActions"><button className="memoryDone" onClick={onMenu}>Main Menu</button><button className="memoryAgain" onClick={reset}>Play again</button></div></div></div>}
 </div>
}
function Memory({onScore,onMenu}:{onScore:(n:number)=>void;onMenu:()=>void}){
 const [level,setLevel]=useState(1),[pattern,setPattern]=useState<number[]>([]),[input,setInput]=useState<number[]>([]);
 const [active,setActive]=useState(false),[showing,setShowing]=useState(false),[flash,setFlash]=useState<number|null>(null);
 const [gameOver,setGameOver]=useState(false),[finalScore,setFinalScore]=useState(0),[wrongTile,setWrongTile]=useState<number|null>(null);
 const [score,setScore]=useState(0),[timeLeft,setTimeLeft]=useState(30),[penalty,setPenalty]=useState(0),[timing,setTiming]=useState(false);
 const deductionRate=level*3;

 useEffect(()=>{if(!timing||showing||gameOver||!active)return;const id=window.setInterval(()=>setTimeLeft(v=>v-1),1000);return()=>window.clearInterval(id)},[timing,showing,gameOver,active]);
 useEffect(()=>{if(timeLeft>=0||!timing||showing||gameOver||!active)return;setPenalty(p=>p+deductionRate);setScore(s=>Math.max(0,s-deductionRate))},[timeLeft,timing,showing,gameOver,active,deductionRate]);

 function makePattern(l:number){return Array.from({length:Math.min(2+l,12)},()=>Math.floor(Math.random()*16))}
 function playPattern(p:number[]){
  setShowing(true);setTiming(false);setInput([]);setFlash(null);
  let i=0;const step=()=>{if(i>=p.length){setFlash(null);setShowing(false);setTimeLeft(30);setTiming(true);return}setFlash(p[i]);window.setTimeout(()=>{setFlash(null);i++;window.setTimeout(step,260)},520)};window.setTimeout(step,420);
 }
 function startRound(l=level){const p=makePattern(l);setTimeLeft(30);setTiming(false);setPattern(p);setActive(true);setWrongTile(null);setPenalty(0);playPattern(p)}
 function finishWrong(i:number){setWrongTile(i);setFinalScore(score);setActive(false);setTiming(false);if(score)onScore(score);window.setTimeout(()=>setGameOver(true),180)}
 function hit(i:number){
  if(!active||showing||gameOver)return;const pos=input.length;if(pattern[pos]!==i){finishWrong(i);return}
  const next=[...input,i];setInput(next);setFlash(i);window.setTimeout(()=>setFlash(null),150);
  if(next.length===pattern.length){const earned=100*level,nextScore=score+earned;setScore(nextScore);setTiming(false);const nextLevel=level+1;setShowing(true);window.setTimeout(()=>{setLevel(nextLevel);startRound(nextLevel)},650)}
 }
 function reset(){setLevel(1);setPattern([]);setInput([]);setActive(false);setShowing(false);setFlash(null);setGameOver(false);setFinalScore(0);setWrongTile(null);setScore(0);setTimeLeft(30);setPenalty(0);setTiming(false);window.setTimeout(()=>startRound(1),120)}
 return <div className="playBox memoryPlayBox"><GameTitle title="Memory Grid" score={score} reset={reset}/>
  <div className="memoryStatus"><span>{!active?"Ready?":showing?"Watch carefully…":timeLeft>=0?"Your turn":"OVERTIME"}</span><b>Level {level}</b></div>
  {active&&<div className="memoryTimerCenter"><div className={`memoryTimer memoryCountdownVisible ${showing?"waiting":timeLeft<0?"overtime":timeLeft<=10?"warning":""}`}>
   <div className="memoryCountdownNumber"><strong>{showing?"—":timeLeft>=0?timeLeft:Math.abs(timeLeft)}</strong><em>{showing?"WAIT":timeLeft>=0?"SEC LEFT":"SEC OVER"}</em></div>
   <div className="memoryCountdownInfo">
    <span>{showing?"Watch the pattern — countdown begins when it finishes.":timeLeft>=0?"Complete the sequence before the timer reaches zero.":`OVERTIME — ${deductionRate} points deducted every second.`}</span>
    <div className="memoryTimerTrack"><i className={showing?"paused":""} style={{width:`${showing?100:Math.max(0,Math.min(100,timeLeft/30*100))}%`}}/></div>
    {penalty>0&&<b>-{penalty} points</b>}
   </div>
  </div></div>}
  <p className="gameHint">{showing?"Watch the sequence. Your 30-second clock starts after the final tile.":timeLeft>=0?"Repeat the tiles in order before the timer runs out.":`Overtime! Level ${level} deducts ${deductionRate} points every second.`}</p>
  <div className={`memoryBoard sequentialMemory ${showing?"isShowing":""}`}>{Array.from({length:16},(_,i)=><button key={i} disabled={showing||!active} className={`${flash===i?"lit pulse":""}${wrongTile===i?" wrong":""}`} onClick={()=>hit(i)}><span/></button>)}</div>
  {!active&&!gameOver&&<button className="gamePrimary" onClick={()=>startRound()}>Start</button>}
  {gameOver&&<div className="memoryGameOverBackdrop"><div className="memoryGameOverModal"><span>MEMORY GRID</span><div className="memoryFailIcon">×</div><h2>You hit the wrong tile!</h2><h3>Game Over</h3><p>Your final score</p><strong>{finalScore.toLocaleString()}</strong><small>You reached Level {level}.</small><div className="memoryGameOverActions"><button className="memoryDone" onClick={onMenu}>Main Menu</button><button className="memoryAgain" onClick={reset}>Play again</button></div></div></div>}
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