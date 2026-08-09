const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const game = new Chess();

const PIECES = {
  w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},
  b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}
};
const FILES = ["a","b","c","d","e","f","g","h"];
const VALUES = {p:100,n:320,b:330,r:500,q:900,k:20000};

let settings = JSON.parse(localStorage.getItem("prochess-settings") || "null") || {
  sound:true, theme:"classic", resolution:"horizontal", color:"white"
};
let mode = "bot";
let level = 3;
let playerColor = "w";
let boardFlipped = false;
let selected = null;
let legalTargets = [];
let history = [];
let lastMove = null;
let botBusy = false;
let puzzleMode = false;
let puzzleIndex = 0;
let puzzleStep = 0;
let puzzleGame = null;

const levels = {
  1:{name:"Beginner", depth:1, randomness:.72, note:"Very forgiving. Great for learning."},
  2:{name:"Easy", depth:1, randomness:.40, note:"Simple tactical decisions."},
  3:{name:"Medium", depth:2, randomness:.18, note:"Balanced search and fast moves."},
  4:{name:"Hard", depth:2, randomness:.06, note:"Looks deeper for stronger moves."},
  5:{name:"More Hard", depth:3, randomness:.02, note:"Deeper tactical search."},
  6:{name:"Next Level Hard", depth:3, randomness:0, note:"Strong local search; deeper thinking takes longer."}
};

const puzzles = [
  {name:"Mate in 1", fen:"6k1/5ppp/8/8/8/6Q1/6PP/6K1 w - - 0 1", solution:"g3g8"},
  {name:"Mate in 1", fen:"6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", solution:"a1a8"},
  {name:"Fork the king and queen", fen:"4k3/8/8/3N4/8/8/4q3/4K3 w - - 0 1", solution:"d5e7"}
];

function saveSettings(){
  localStorage.setItem("prochess-settings", JSON.stringify(settings));
}
function applySettings(){
  document.body.dataset.theme = settings.theme;
  document.body.classList.toggle("vertical", settings.resolution === "vertical");
  $("soundToggle").checked = settings.sound;
  $("themeSelect").value = settings.theme;
  document.querySelectorAll(".res-btn").forEach(b=>b.classList.toggle("active", b.dataset.resolution===settings.resolution));
  document.querySelectorAll(".color-btn").forEach(b=>b.classList.toggle("active", b.dataset.color===settings.color));
}
applySettings();

const bgMusic = $("bgMusic");

bgMusic.volume = 0.22;

function startMusic() {
    if (!settings.sound) return;

    bgMusic.play().catch(() => {
        console.log("Music will start after user interaction.");
    });
}

document.addEventListener("click", startMusic);

function choosePlayerColor(){
  if(settings.color === "black") return "b";
  if(settings.color === "alternative") return Math.random() < .5 ? "w" : "b";
  return "w";
}

function newGame(){
  puzzleMode = false;
  puzzleIndex = 0; puzzleStep = 0; puzzleGame = null;
  game.reset();
  playerColor = choosePlayerColor();
  boardFlipped = playerColor === "b";
  selected = null; legalTargets=[]; history=[]; lastMove=null; botBusy=false;
  $("thinking").classList.add("hidden");
  $("gameMessage").textContent = mode==="bot" ? "Make your move." : "White starts.";
  updatePlayers();
  render();
  if(mode==="bot" && playerColor==="b") setTimeout(botMove, 400);
}

function startPuzzle(){
  puzzleMode = true;
  puzzleIndex = 0;
  loadPuzzle();
}
function loadPuzzle(){
  const p = puzzles[puzzleIndex % puzzles.length];
  puzzleGame = new Chess(p.fen);
  puzzleStep = 0;
  boardFlipped = false;
  selected=null; legalTargets=[]; lastMove=null;
  $("gameMessage").textContent = `${p.name} — find the best move.`;
  $("turnBadge").textContent = "Puzzle";
  renderPuzzle();
}

function renderPuzzle(){
  renderBoard(puzzleGame);
  $("moveList").innerHTML = `<div class="info-card"><p><strong>Puzzle ${puzzleIndex+1}/${puzzles.length}</strong></p><p>${puzzles[puzzleIndex%puzzles.length].name}</p><p>Find the tactical move for White.</p></div>`;
  $("topPlayerName").textContent="Puzzle";
  $("topPlayerMeta").textContent="Black";
  $("bottomPlayerName").textContent="You";
  $("bottomPlayerMeta").textContent="White";
  $("topMaterial").textContent="";
  $("bottomMaterial").textContent="";
}

function updatePlayers(){
  if(mode==="user"){
    $("topPlayerName").textContent="Player 2";
    $("topPlayerMeta").textContent="Black";
    $("bottomPlayerName").textContent="Player 1";
    $("bottomPlayerMeta").textContent="White";
  }else{
    $("topPlayerName").textContent=playerColor==="w" ? "Bot" : "You";
    $("topPlayerMeta").textContent="Black";
    $("bottomPlayerName").textContent=playerColor==="w" ? "You" : "Bot";
    $("bottomPlayerMeta").textContent="White";
  }
}

function boardOrder(){
  const ranks = boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = boardFlipped ? [...FILES].reverse() : FILES;
  return {ranks,files};
}

function render(){
  renderBoard(game);
  updateMoves();
  updateStatus();
  updateMaterial();
}

function renderBoard(chess){
  boardEl.innerHTML="";
  const {ranks,files}=boardOrder();
  const turn = chess.turn();
  const targets = new Set(legalTargets.map(m=>m.to));
  for(const rank of ranks){
    for(const file of files){
      const sq=file+rank;
      const square=document.createElement("button");
      square.className=`square ${((FILES.indexOf(file)+rank)%2===0)?"light":"dark"}`;
      square.dataset.square=sq;
      const piece=chess.get(sq);
      if(selected===sq) square.classList.add("selected");
      if(lastMove && (lastMove.from===sq || lastMove.to===sq)) square.classList.add("last");
      if(targets.has(sq)) square.classList.add(piece ? "capture" : "legal");
      if(piece){
        const span=document.createElement("span");
        span.className=`piece ${piece.color==="w"?"white":"black"}`;
        span.textContent=PIECES[piece.color][piece.type];
        square.appendChild(span);
      }
      if(file==="a"){const c=document.createElement("span");c.className="coord rank";c.textContent=rank;square.appendChild(c)}
      if(rank===(boardFlipped?1:8)){const c=document.createElement("span");c.className="coord file";c.textContent=file;square.appendChild(c)}
      square.addEventListener("click",()=>onSquareClick(sq,chess));
      boardEl.appendChild(square);
    }
  }
}

function onSquareClick(sq,chess){
  if(puzzleMode){ puzzleClick(sq); return; }
  if(botBusy || game.game_over()) return;
  if(mode==="bot" && chess.turn()!==playerColor) return;

  const piece=chess.get(sq);
  if(selected){
    const move=legalTargets.find(m=>m.to===sq);
    if(move){
      makeMove(move);
      return;
    }
    if(piece && piece.color===chess.turn()){
      selectSquare(sq,chess);
    }else{
      selected=null; legalTargets=[]; render();
    }
  }else if(piece && piece.color===chess.turn()){
    selectSquare(sq,chess);
  }
}

function selectSquare(sq,chess){
  selected=sq;
  legalTargets=chess.moves({square:sq,verbose:true});
  render();
}

function makeMove(moveObj, chess=game){
  let move;
  try{
    move = chess.move({
      from:moveObj.from,to:moveObj.to,
      promotion:moveObj.promotion || undefined
    });
  }catch(e){ return; }
  if(!move) return;
  selected=null; legalTargets=[];
  lastMove={from:move.from,to:move.to};
  if(chess===game){
    history.push(move);
    playSound(move.captured ? "capture" : "move");
    render();
    if(checkGameEnd()) return;
    if(mode==="bot" && game.turn()!==playerColor) setTimeout(botMove, 180);
  }
}

function tryHumanMove(from,to){
  const moves=game.moves({square:from,verbose:true});
  const target=moves.find(m=>m.to===to);
  if(!target) return;
  if(target.promotion) showPromotion(target);
  else makeMove(target);
}

function showPromotion(move){
  $("promotionChoices").innerHTML="";
  ["q","r","b","n"].forEach(type=>{
    const b=document.createElement("button");
    b.textContent=PIECES[game.turn()][type];
    b.onclick=()=>{
      $("promotionModal").classList.add("hidden");
      makeMove({...move,promotion:type});
    };
    $("promotionChoices").appendChild(b);
  });
  $("promotionModal").classList.remove("hidden");
}

function updateStatus(){
  const color=game.turn()==="w"?"White":"Black";
  $("turnBadge").textContent = game.in_check() ? `${color} in check` : `${color} to move`;
  if(game.in_check()) $("gameMessage").textContent="Check!";
  else $("gameMessage").textContent = mode==="bot" ? "Make your move." : "Your turn.";
}

function updateMoves(){
  const list=$("moveList");
  list.innerHTML="";
  for(let i=0;i<history.length;i+=2){
    const row=document.createElement("div"); row.className="move-row";
    row.innerHTML=`<span>${Math.floor(i/2)+1}.</span><span>${history[i]?.san||""}</span><span>${history[i+1]?.san||""}</span>`;
    list.appendChild(row);
  }
  list.scrollTop=list.scrollHeight;
}

function updateMaterial(){
  const counts={w:{p:0,n:0,b:0,r:0,q:0},b:{p:0,n:0,b:0,r:0,q:0}};
  for(const row of game.board()) for(const p of row) if(p && p.type!=="k") counts[p.color][p.type]++;
  const fmt=c=>["q","r","b","n","p"].map(t=>c[t]?`${PIECES["w"][t]}${c[t]>1?"×"+c[t]:""}`:"").filter(Boolean).join(" ");
  if(playerColor==="w"){ $("bottomMaterial").textContent=fmt(counts.w); $("topMaterial").textContent=fmt(counts.b); }
  else { $("bottomMaterial").textContent=fmt(counts.b); $("topMaterial").textContent=fmt(counts.w); }
}

function checkGameEnd(){
  if(!game.game_over()) return false;
  let title="Game Over", text="Game drawn.";
  if(game.in_checkmate()){
    const winner=game.turn()==="w"?"Black":"White";
    title="Checkmate"; text=`${winner} wins the game.`;
  }else if(game.in_stalemate()) text="Stalemate — no legal moves.";
  else if(game.in_threefold_repetition()) text="Draw by threefold repetition.";
  else if(game.insufficient_material()) text="Draw by insufficient material.";
  $("resultTitle").textContent=title;
  $("resultText").textContent=text;
  $("resultIcon").textContent=title==="Checkmate"?"♛":"½";
  $("gameOverModal").classList.remove("hidden");
  playSound("gameover");
  return true;
}

/* ---------- Built-in local bot ---------- */
function botMove(){
  if(botBusy || game.game_over() || mode!=="bot" || game.turn()===playerColor) return;
  botBusy=true; $("thinking").classList.remove("hidden");
  const cfg=levels[level];
  setTimeout(()=>{
    const best=findBestMove(game,cfg.depth,cfg.randomness);
    if(best) makeMove(best);
    botBusy=false; $("thinking").classList.add("hidden");
  }, Math.min(1200,220+level*120));
}

function findBestMove(chess,depth,randomness){
  const moves=chess.moves({verbose:true});
  if(!moves.length) return null;
  const maximizing=chess.turn()==="w";
  const scored=[];
  for(const m of moves){
    chess.move(m);
    let score=minimax(chess,depth-1,-Infinity,Infinity,!maximizing);
    chess.undo();
    scored.push({m,score});
  }
  scored.sort((a,b)=>maximizing?b.score-a.score:a.score-b.score);
  const topN=Math.max(1,Math.floor(scored.length*randomness)+1);
  const pool=scored.slice(0,topN);
  return pool[Math.floor(Math.random()*pool.length)].m;
}

function minimax(chess,depth,alpha,beta,maximizing){
  if(chess.in_checkmate()) return chess.turn()==="w" ? -999999-depth : 999999+depth;
  if(chess.in_draw() || chess.in_stalemate()) return 0;
  if(depth<=0) return evaluate(chess);
  const moves=chess.moves({verbose:true});
  if(maximizing){
    let best=-Infinity;
    for(const m of moves){
      chess.move(m); best=Math.max(best,minimax(chess,depth-1,alpha,beta,false)); chess.undo();
      alpha=Math.max(alpha,best); if(beta<=alpha) break;
    }
    return best;
  }else{
    let best=Infinity;
    for(const m of moves){
      chess.move(m); best=Math.min(best,minimax(chess,depth-1,alpha,beta,true)); chess.undo();
      beta=Math.min(beta,best); if(beta<=alpha) break;
    }
    return best;
  }
}

function evaluate(chess){
  let score=0;
  for(const row of chess.board()){
    for(const p of row){
      if(!p) continue;
      let v=VALUES[p.type];
      const center = (p.type==="p"||p.type==="n"||p.type==="b") ? centerBonus(p) : 0;
      v+=center;
      score += p.color==="w" ? v : -v;
    }
  }
  if(chess.in_check()) score += chess.turn()==="w" ? -35 : 35;
  return score;
}
function centerBonus(p){
  return 12 - (Math.abs(3.5-p.square?.charCodeAt?.(0) || 3.5) + 0);
}

function undo(){
  if(puzzleMode || botBusy || history.length===0) return;
  game.undo();
  history.pop();
  if(mode==="bot" && game.turn()!==playerColor && history.length){
    game.undo(); history.pop();
  }
  selected=null; legalTargets=[]; lastMove=null;
  render();
}

function hint(){
  if(puzzleMode){showToast("Try looking for a forcing move.");return}
  if(mode==="bot" && game.turn()!==playerColor){showToast("Wait for the bot.");return}
  const moves=game.moves({verbose:true});
  if(!moves.length)return;
  const best=findBestMove(game,2,0);
  if(best){ selected=best.from; legalTargets=game.moves({square:best.from,verbose:true}); render(); showToast(`Hint: consider ${best.san}`); }
}

function resign(){
  if(game.game_over() || puzzleMode) return;
  const winner=game.turn()==="w"?"Black":"White";
  $("resultTitle").textContent="Game Resigned";
  $("resultText").textContent=`${winner} wins by resignation.`;
  $("resultIcon").textContent="🏁";
  $("gameOverModal").classList.remove("hidden");
  playSound("gameover");
}

function flip(){boardFlipped=!boardFlipped; render()}

function playSound(type){
  if(!settings.sound)return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    const c=new C(),o=c.createOscillator(),g=c.createGain();
    o.frequency.value=type==="capture"?240:type==="gameover"?160:520;
    o.type="sine"; g.gain.value=.035; o.connect(g);g.connect(c.destination);o.start();
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.09);o.stop(c.currentTime+.09);
  }catch{}
}
function showToast(msg){
  $("toast").textContent=msg;$("toast").classList.remove("hidden");
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>$("toast").classList.add("hidden"),2200);
}

/* ---------- Puzzle mode ---------- */
function puzzleClick(sq){
  const p=puzzles[puzzleIndex%puzzles.length];
  const move= puzzleGame.moves({verbose:true}).find(m=>m.from===selected&&m.to===sq);
  if(!selected){
    const piece=puzzleGame.get(sq);
    if(piece&&piece.color===puzzleGame.turn()){selected=sq;legalTargets=puzzleGame.moves({square:sq,verbose:true});renderPuzzle()}
    return;
  }
  if(!move){selected=null;legalTargets=[];renderPuzzle();return}
  const played=`${move.from}${move.to}`;
  if(played===p.solution){
    puzzleGame.move(move);
    selected=null;legalTargets=[];lastMove={from:move.from,to:move.to};
    $("gameMessage").textContent="Correct! Excellent tactical vision.";
    renderPuzzle(); playSound("gameover");
    setTimeout(()=>{puzzleIndex=(puzzleIndex+1)%puzzles.length;loadPuzzle()},900);
  }else{
    showToast("Not the solution. Look for a forcing move.");
    selected=null;legalTargets=[];renderPuzzle();
  }
}

/* ---------- Events ---------- */
$("newGameBtn").onclick=newGame;
$("newGameModalBtn").onclick=()=>{$("gameOverModal").classList.add("hidden");newGame()};
$("closeGameOver").onclick=()=>$("gameOverModal").classList.add("hidden");
$("undoBtn").onclick=undo;
$("flipBtn").onclick=flip;
$("hintBtn").onclick=hint;
$("resignBtn").onclick=resign;

$("botModeBtn").onclick=()=>{mode="bot";$("botModeBtn").classList.add("active");$("userModeBtn").classList.remove("active");$("levelsBlock").classList.remove("hidden");newGame()};
$("userModeBtn").onclick=()=>{mode="user";$("userModeBtn").classList.add("active");$("botModeBtn").classList.remove("active");$("levelsBlock").classList.add("hidden");newGame()};
$("levelSelect").onchange=e=>{level=Number(e.target.value);$("levelNote").textContent=levels[level].note};
$("settingsBtn").onclick=()=>{$("settingsModal").classList.remove("hidden")};
$("closeSettings").onclick=()=>$("settingsModal").classList.add("hidden");
$("soundToggle").onchange = e => {
    settings.sound = e.target.checked;
    saveSettings();

    if (settings.sound) {
        startMusic();
    } else {
        bgMusic.pause();
    }
};
$("themeSelect").onchange=e=>{settings.theme=e.target.value;applySettings();saveSettings();render()};
document.querySelectorAll(".res-btn").forEach(b=>b.onclick=()=>{settings.resolution=b.dataset.resolution;applySettings();saveSettings()});
document.querySelectorAll(".color-btn").forEach(b=>b.onclick=()=>{settings.color=b.dataset.color;applySettings();saveSettings()});
$("saveSettings").onclick=()=>{saveSettings();$("settingsModal").classList.add("hidden");showToast("Settings saved.")};
$("resetSettings").onclick=()=>{settings={sound:true,theme:"classic",resolution:"horizontal",color:"white"};applySettings();saveSettings();showToast("Settings reset.")};

document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));tab.classList.add("active");
  $("movesTab").classList.toggle("hidden",tab.dataset.tab!=="moves");
  $("infoTab").classList.toggle("hidden",tab.dataset.tab!=="info");
});
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  if(b.dataset.view==="puzzle"){startPuzzle()}else{newGame()}
});

/* Promotion modal closes only through a choice. */
newGame();
