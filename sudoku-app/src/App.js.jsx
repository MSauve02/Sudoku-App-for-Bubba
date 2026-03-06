import { useState, useEffect, useCallback, useRef } from "react";

// Small fallback list in case API is unavailable
const FALLBACK_JOKES = [
  "Why did the sudoku puzzle go to therapy? It had too many issues to work through.",
  "What do you call a fake noodle? An impasta.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "What do you call cheese that isn't yours? Nacho cheese.",
];

const GRID_CONFIGS = {
  "4x4": { size: 4, boxRows: 2, boxCols: 2, label: "4×4", sub: "Quick & fun" },
  "6x6": { size: 6, boxRows: 2, boxCols: 3, label: "6×6", sub: "A nice middle ground" },
  "9x9": { size: 9, boxRows: 3, boxCols: 3, label: "9×9", sub: "Classic sudoku" },
};

const REMOVAL_MAP = {
  "4x4":  { easy: 6,  medium: 8,  hard: 10 },
  "6x6":  { easy: 14, medium: 18, hard: 22 },
  "9x9":  { easy: 36, medium: 46, hard: 54 },
};

const HINT_MAP = {
  "4x4":  { easy: 3, medium: 2, hard: 1 },
  "6x6":  { easy: 4, medium: 3, hard: 1 },
  "9x9":  { easy: 5, medium: 3, hard: 1 },
};

function generateComplete(size, boxRows, boxCols) {
  const board = Array.from({ length: size }, () => Array(size).fill(0));
  function isValid(board, row, col, num) {
    for (let i = 0; i < size; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const br = Math.floor(row / boxRows) * boxRows;
    const bc = Math.floor(col / boxCols) * boxCols;
    for (let i = br; i < br + boxRows; i++)
      for (let j = bc; j < bc + boxCols; j++)
        if (board[i][j] === num) return false;
    return true;
  }
  function fill(board) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 0) {
          const nums = Array.from({ length: size }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
          for (const n of nums) {
            if (isValid(board, r, c, n)) {
              board[r][c] = n;
              if (fill(board)) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  fill(board);
  return board;
}

// Count solutions (stop at 2 — we only need to know if there's exactly 1)
function countSolutions(puzzle, size, boxRows, boxCols, limit = 2) {
  const board = puzzle.map(r => [...r]);
  let count = 0;
  function isValid(row, col, num) {
    for (let i = 0; i < size; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const br = Math.floor(row / boxRows) * boxRows;
    const bc = Math.floor(col / boxCols) * boxCols;
    for (let i = br; i < br + boxRows; i++)
      for (let j = bc; j < bc + boxCols; j++)
        if (board[i][j] === num) return false;
    return true;
  }
  function solve() {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 0) {
          for (let n = 1; n <= size; n++) {
            if (isValid(r, c, n)) {
              board[r][c] = n;
              solve();
              if (count >= limit) return;
              board[r][c] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve();
  return count;
}

function generatePuzzle(gridKey, difficulty) {
  const { size, boxRows, boxCols } = GRID_CONFIGS[gridKey];
  const solution = generateComplete(size, boxRows, boxCols);
  const puzzle = solution.map(r => [...r]);
  let toRemove = REMOVAL_MAP[gridKey][difficulty];
  const positions = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      positions.push([r, c]);
  positions.sort(() => Math.random() - 0.5);

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= toRemove) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    // Check unique solution
    if (countSolutions(puzzle, size, boxRows, boxCols, 2) !== 1) {
      puzzle[r][c] = backup; // put it back — removing this creates ambiguity
    } else {
      removed++;
    }
  }
  return { puzzle, solution };
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const COLORS = {
  bg: "#fff0f3", surface: "#ffffff", surfaceLight: "#fff5f7",
  accent: "#d4637a", accentSoft: "rgba(212, 99, 122, 0.12)", gold: "#c47a2e",
  text: "#4a2c3d", textDim: "#b08a9a", correct: "#5aab7b", error: "#d94f5c",
  given: "#4a2c3d", userInput: "#7b5ea7", highlight: "rgba(212, 99, 122, 0.06)",
  cellBorder: "rgba(180, 130, 150, 0.15)", boxBorder: "rgba(212, 99, 122, 0.5)",
  selected: "rgba(212, 99, 122, 0.18)", sameNum: "rgba(196, 122, 46, 0.1)",
  excluded: "rgba(212, 99, 122, 0.35)",
};

const Hedgehog = ({ size = 40, style = {}, flip = false }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.13 }} xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="48" rx="34" ry="28" fill="#8B6E5A" />
    <path d="M25 30 L20 15 L30 28Z" fill="#6B4E3A" /><path d="M35 22 L32 6 L40 20Z" fill="#6B4E3A" />
    <path d="M47 18 L47 2 L52 17Z" fill="#6B4E3A" /><path d="M58 20 L62 5 L63 19Z" fill="#6B4E3A" />
    <path d="M68 26 L76 12 L72 26Z" fill="#6B4E3A" /><path d="M75 35 L86 22 L78 35Z" fill="#6B4E3A" />
    <path d="M78 45 L92 38 L80 46Z" fill="#6B4E3A" /><path d="M22 42 L8 35 L20 44Z" fill="#6B4E3A" />
    <path d="M20 35 L6 25 L22 36Z" fill="#6B4E3A" />
    <ellipse cx="44" cy="58" rx="26" ry="20" fill="#F5DEB3" />
    <ellipse cx="32" cy="50" rx="14" ry="12" fill="#F5DEB3" />
    <circle cx="20" cy="50" r="4" fill="#4a2c3d" /><circle cx="30" cy="45" r="3" fill="#4a2c3d" />
    <circle cx="31" cy="44" r="1" fill="white" />
    <ellipse cx="26" cy="53" rx="4" ry="2.5" fill="rgba(212,99,122,0.35)" />
    <ellipse cx="38" cy="38" rx="5" ry="6" fill="#D4A574" />
    <ellipse cx="35" cy="72" rx="6" ry="4" fill="#D4A574" />
    <ellipse cx="52" cy="73" rx="6" ry="4" fill="#D4A574" />
    <ellipse cx="65" cy="71" rx="5" ry="3.5" fill="#D4A574" />
  </svg>
);

const HedgehogBackground = () => {
  const hedgehogs = [
    { x: 5, y: 8, size: 50, flip: false }, { x: 85, y: 5, size: 38, flip: true },
    { x: 92, y: 45, size: 44, flip: true }, { x: 3, y: 55, size: 36, flip: false },
    { x: 75, y: 85, size: 48, flip: true }, { x: 15, y: 88, size: 42, flip: false },
    { x: 50, y: 3, size: 32, flip: false }, { x: 45, y: 92, size: 35, flip: true },
    { x: 8, y: 32, size: 28, flip: false }, { x: 88, y: 68, size: 30, flip: true },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {hedgehogs.map((h, i) => (
        <Hedgehog key={i} size={h.size} flip={h.flip} style={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%` }} />
      ))}
    </div>
  );
};

const Confetti = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 2, duration: 2 + Math.random() * 2,
    color: ["#d4637a", "#f5a5b8", "#5aab7b", "#c47a2e", "#7b5ea7", "#ffb6c1"][Math.floor(Math.random() * 6)],
    size: 4 + Math.random() * 8,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      <style>{`@keyframes confettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: 0, width: p.size, height: p.size * 0.6,
          background: p.color, borderRadius: 2, animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Source+Sans+3:wght@300;400;600&family=JetBrains+Mono:wght@400;600&display=swap');
  @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes hintGlow { 0% { box-shadow: inset 0 0 20px rgba(90,171,123,0.5); } 100% { box-shadow: inset 0 0 0px transparent; } }
  @keyframes jokeReveal { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .diff-btn { transition: all 0.3s ease; cursor: pointer; border: none; }
  .diff-btn:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 12px 40px rgba(212,99,122,0.25) !important; }
  .cell { transition: all 0.15s ease; cursor: pointer; user-select: none; -webkit-user-select: none; }
  .cell:hover { background: rgba(212,99,122,0.12) !important; }
  .num-btn { transition: all 0.2s ease; cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(180,130,150,0.1); }
  .num-btn:hover { transform: scale(1.12); box-shadow: 0 4px 16px rgba(180,130,150,0.2); }
  .num-btn:active { transform: scale(0.95); }
  .tool-btn { transition: all 0.2s ease; cursor: pointer; border: none; }
  .tool-btn:hover { background: #fff5f7 !important; box-shadow: 0 2px 12px rgba(180,130,150,0.15); }
`;

const BG = { minHeight: "100vh", background: "linear-gradient(135deg, #fff0f3 0%, #ffe4e9 50%, #ffd6e0 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", color: COLORS.text, padding: 20, position: "relative" };

// Number pad row component
const NumRow = ({ numbers, board, gridSize, handleNumber, excludeMode, selected, excluded, handleExclude }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${numbers.length}, 1fr)`, gap: 6, width: "100%" }}>
    {numbers.map(n => {
      const count = board.flat().filter(v => v === n).length;
      const allPlaced = count >= gridSize;
      const isExcludedForCell = excludeMode && selected && excluded[`${selected[0]}-${selected[1]}`]?.has(n);
      return (
        <button key={n} className="num-btn" onClick={() => excludeMode ? handleExclude(n) : handleNumber(n)} disabled={!excludeMode && allPlaced} style={{
          aspectRatio: "1", borderRadius: 12,
          background: isExcludedForCell ? COLORS.accentSoft : allPlaced && !excludeMode ? `${COLORS.surface}88` : COLORS.surface,
          color: isExcludedForCell ? COLORS.accent : allPlaced && !excludeMode ? COLORS.textDim + "44" : COLORS.text,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: gridSize <= 4 ? "clamp(22px, 7vw, 30px)" : gridSize <= 6 ? "clamp(20px, 5.5vw, 28px)" : "clamp(18px, 5vw, 26px)",
          fontWeight: 700, opacity: allPlaced && !excludeMode ? 0.4 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{n}</button>
      );
    })}
  </div>
);

export default function SudokuApp() {
  const [screen, setScreen] = useState("menu");
  const [gridKey, setGridKey] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState(null);
  const [given, setGiven] = useState(null);
  const [selected, setSelected] = useState(null);
  const [errors, setErrors] = useState(new Set());
  const [completed, setCompleted] = useState(false);
  const [joke, setJoke] = useState("");
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState({});
  const [noteMode, setNoteMode] = useState(false);
  const [excludeMode, setExcludeMode] = useState(false);
  const [excluded, setExcluded] = useState({}); // { "r-c": Set of excluded numbers }
  const timerRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintCells, setHintCells] = useState(new Set());
  const [hintFlash, setHintFlash] = useState(null);
  const [puzzlesCompleted, setPuzzlesCompleted] = useState(0);
  const [usedJokes, setUsedJokes] = useState([]);
  const [jokeLoading, setJokeLoading] = useState(false);

  const gridConfig = gridKey ? GRID_CONFIGS[gridKey] : null;
  const gridSize = gridConfig ? gridConfig.size : 9;
  const maxHintsNow = gridKey && difficulty ? HINT_MAP[gridKey][difficulty] : 3;

  // Generate a fresh joke/pun/funny thing using Claude API
  const fetchNewJoke = useCallback(async () => {
    setJokeLoading(true);
    try {
      const previousList = usedJokes.slice(-20).map((j, i) => `${i + 1}. ${j}`).join("\n");
      const prompt = previousList.length > 0
        ? `You are a comedy writer for a sudoku game. Generate ONE short, funny thing for the player "Bubba" who just completed a puzzle. It can be a dad joke, a pun, a one-liner, a funny observation, a silly story (2-3 sentences max), or a witty quip. Be creative and vary the format! Keep it family-friendly and under 40 words.\n\nDo NOT repeat or rephrase any of these previous jokes:\n${previousList}\n\nRespond with ONLY the joke text, nothing else.`
        : `You are a comedy writer for a sudoku game. Generate ONE short, funny thing for the player "Bubba" who just completed a puzzle. It can be a dad joke, a pun, a one-liner, a funny observation, a silly story (2-3 sentences max), or a witty quip. Be creative! Keep it family-friendly and under 40 words.\n\nRespond with ONLY the joke text, nothing else.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const jokeText = data.content?.[0]?.text?.trim();
      if (jokeText) {
        setJoke(jokeText);
        setUsedJokes(prev => [...prev, jokeText]);
      } else {
        throw new Error("No joke returned");
      }
    } catch (err) {
      // Fallback to a random one from the small list
      const fallback = FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
      setJoke(fallback);
    }
    setJokeLoading(false);
  }, [usedJokes]);

  useEffect(() => {
    if (running) { timerRef.current = setInterval(() => setTime(t => t + 1), 1000); }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const startGame = useCallback((gk, diff) => {
    const { puzzle: p, solution: s } = generatePuzzle(gk, diff);
    setGridKey(gk); setDifficulty(diff); setSolution(s);
    setBoard(p.map(r => [...r]));
    const g = new Set();
    p.forEach((row, r) => row.forEach((v, c) => { if (v !== 0) g.add(`${r}-${c}`); }));
    setGiven(g); setSelected(null); setErrors(new Set()); setCompleted(false);
    setJoke(""); setTime(0); setRunning(true); setNotes({}); setNoteMode(false);
    setExcludeMode(false); setExcluded({});
    setShowConfetti(false); setHintsUsed(0); setHintCells(new Set()); setHintFlash(null);
    setScreen("game");
  }, []);

  const goToMenu = () => { setScreen("menu"); setRunning(false); setPuzzlesCompleted(0); setGridKey(null); setDifficulty(null); };

  const checkComplete = useCallback((b) => {
    if (!solution) return false;
    const sz = solution.length;
    for (let r = 0; r < sz; r++) for (let c = 0; c < sz; c++) if (b[r][c] !== solution[r][c]) return false;
    return true;
  }, [solution]);

  const onComplete = useCallback((newBoard) => {
    if (checkComplete(newBoard)) {
      setCompleted(true); setRunning(false); setPuzzlesCompleted(p => p + 1);
      fetchNewJoke();
      setShowConfetti(true); setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [checkComplete, fetchNewJoke]);

  const handleCell = (r, c) => { if (!completed) setSelected([r, c]); };

  const handleNumber = useCallback((num) => {
    if (!selected || completed || num > gridSize) return;
    const [r, c] = selected;
    if (given.has(`${r}-${c}`)) return;
    const newBoard = board.map(row => [...row]); newBoard[r][c] = num; setBoard(newBoard);
    setNotes(prev => { const copy = { ...prev }; delete copy[`${r}-${c}`]; return copy; });
    setExcluded(prev => { const copy = { ...prev }; delete copy[`${r}-${c}`]; return copy; });
    const newErrors = new Set(errors);
    if (num !== solution[r][c]) newErrors.add(`${r}-${c}`); else newErrors.delete(`${r}-${c}`);
    setErrors(newErrors);
    onComplete(newBoard);
  }, [selected, completed, given, board, solution, errors, onComplete, gridSize]);

  const handleExclude = useCallback((num) => {
    if (!selected || completed) return;
    const [r, c] = selected;
    if (given.has(`${r}-${c}`) || board[r][c] !== 0) return;
    const key = `${r}-${c}`;
    setExcluded(prev => {
      const copy = { ...prev };
      const current = new Set(copy[key] || []);
      if (current.has(num)) current.delete(num); else current.add(num);
      if (current.size === 0) delete copy[key]; else copy[key] = current;
      return copy;
    });
  }, [selected, completed, given, board]);

  const handleErase = useCallback(() => {
    if (!selected || completed) return;
    const [r, c] = selected; if (given.has(`${r}-${c}`)) return;
    const newBoard = board.map(row => [...row]); newBoard[r][c] = 0; setBoard(newBoard);
    const newErrors = new Set(errors); newErrors.delete(`${r}-${c}`); setErrors(newErrors);
    setNotes(prev => { const copy = { ...prev }; delete copy[`${r}-${c}`]; return copy; });
    setExcluded(prev => { const copy = { ...prev }; delete copy[`${r}-${c}`]; return copy; });
  }, [selected, completed, given, board, errors]);

  const handleHint = useCallback(() => {
    if (completed || !difficulty || !gridKey) return;
    if (hintsUsed >= maxHintsNow) return;
    let targetR, targetC;
    if (selected) {
      const [r, c] = selected;
      if (!given.has(`${r}-${c}`) && board[r][c] !== solution[r][c]) { targetR = r; targetC = c; }
    }
    if (targetR === undefined) {
      const candidates = [];
      for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++)
        if (!given.has(`${r}-${c}`) && board[r][c] !== solution[r][c]) candidates.push([r, c]);
      if (candidates.length === 0) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      targetR = pick[0]; targetC = pick[1];
    }
    const newBoard = board.map(row => [...row]);
    newBoard[targetR][targetC] = solution[targetR][targetC]; setBoard(newBoard);
    const key = `${targetR}-${targetC}`;
    setNotes(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
    setExcluded(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
    const newErrors = new Set(errors); newErrors.delete(key); setErrors(newErrors);
    setHintCells(prev => new Set(prev).add(key)); setHintsUsed(h => h + 1);
    setSelected([targetR, targetC]); setHintFlash(key); setTimeout(() => setHintFlash(null), 800);
    onComplete(newBoard);
  }, [completed, difficulty, gridKey, hintsUsed, maxHintsNow, selected, given, board, solution, errors, onComplete, gridSize]);

  useEffect(() => {
    if (!board) return;
    const handler = (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= gridSize) {
        if (excludeMode) handleExclude(num); else handleNumber(num);
      }
      if (e.key === "Backspace" || e.key === "Delete") handleErase();
      if (e.key === "n" || e.key === "N") setNoteMode(m => !m);
      if (e.key === "x" || e.key === "X") setExcludeMode(m => !m);
      if (e.key === "h" || e.key === "H") handleHint();
      if (selected) {
        const [r, c] = selected;
        if (e.key === "ArrowUp" && r > 0) setSelected([r-1, c]);
        if (e.key === "ArrowDown" && r < gridSize - 1) setSelected([r+1, c]);
        if (e.key === "ArrowLeft" && c > 0) setSelected([r, c-1]);
        if (e.key === "ArrowRight" && c < gridSize - 1) setSelected([r, c+1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [board, handleNumber, handleExclude, handleErase, handleHint, selected, gridSize, excludeMode]);

  // ========== MENU ==========
  if (screen === "menu") {
    return (
      <div style={BG}>
        <style>{GLOBAL_CSS}</style>
        <HedgehogBackground />
        <div style={{ animation: "fadeUp 0.8s ease", textAlign: "center", marginBottom: 50, position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 14, letterSpacing: 8, textTransform: "uppercase", color: COLORS.accent, fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600, marginBottom: 16 }}>Puzzle & Puns</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(48px, 8vw, 80px)", fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -2, background: `linear-gradient(135deg, ${COLORS.text} 30%, ${COLORS.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sudoku</h1>
          <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 16, color: COLORS.textDim, fontWeight: 300, marginTop: 12 }}>Solve the grid. Earn a dad joke.</p>
        </div>
        <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: COLORS.textDim, fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600, marginBottom: 16, position: "relative", zIndex: 1 }}>Choose Grid Size</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 320, position: "relative", zIndex: 1 }}>
          {Object.entries(GRID_CONFIGS).map(([key, cfg], i) => (
            <button key={key} className="diff-btn" onClick={() => { setGridKey(key); setScreen("difficulty"); }} style={{
              animation: `fadeUp 0.8s ease ${0.2 + i * 0.15}s both`, background: COLORS.surface,
              border: `1px solid ${COLORS.accent}22`, borderRadius: 16, padding: "20px 28px",
              display: "flex", alignItems: "center", justifyContent: "space-between", color: COLORS.text,
              boxShadow: "0 4px 20px rgba(180,130,150,0.12)",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700 }}>{cfg.label}</div>
                <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: COLORS.textDim, fontWeight: 300, marginTop: 2 }}>{cfg.sub}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.boxCols}, 1fr)`, gap: 2, width: 20, height: 20 }}>
                  {Array.from({ length: cfg.boxRows * cfg.boxCols }, (_, j) => (
                    <div key={j} style={{ background: COLORS.accent, borderRadius: 1, opacity: 0.3 + (j * 0.08) }} />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========== DIFFICULTY ==========
  if (screen === "difficulty") {
    const cfg = GRID_CONFIGS[gridKey];
    return (
      <div style={BG}>
        <style>{GLOBAL_CSS}</style>
        <HedgehogBackground />
        <div style={{ animation: "fadeUp 0.6s ease", textAlign: "center", marginBottom: 50, position: "relative", zIndex: 1 }}>
          <button className="tool-btn" onClick={() => setScreen("menu")} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", padding: "8px 12px", borderRadius: 8, marginBottom: 20 }}>← Back</button>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900, margin: 0, background: `linear-gradient(135deg, ${COLORS.text} 30%, ${COLORS.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{cfg.label} Sudoku</h2>
          <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: COLORS.textDim, fontWeight: 300, marginTop: 8 }}>Pick your challenge level</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 320, position: "relative", zIndex: 1 }}>
          {[
            { key: "easy", label: "Easy", sub: "Gentle warmup", color: "#5aab7b" },
            { key: "medium", label: "Medium", sub: "A worthy challenge", color: "#c47a2e" },
            { key: "hard", label: "Hard", sub: "For the brave", color: "#d4637a" },
          ].map((d, i) => (
            <button key={d.key} className="diff-btn" onClick={() => startGame(gridKey, d.key)} style={{
              animation: `fadeUp 0.8s ease ${0.2 + i * 0.15}s both`, background: COLORS.surface,
              border: `1px solid ${d.color}33`, borderRadius: 16, padding: "20px 28px",
              display: "flex", alignItems: "center", justifyContent: "space-between", color: COLORS.text,
              boxShadow: "0 4px 20px rgba(180,130,150,0.12)",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700 }}>{d.label}</div>
                <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: COLORS.textDim, fontWeight: 300, marginTop: 2 }}>{d.sub}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${d.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>→</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========== GAME SCREEN ==========
  const selectedVal = selected ? board[selected[0]][selected[1]] : null;
  const { boxRows, boxCols } = gridConfig;
  const nums = Array.from({ length: gridSize }, (_, i) => i + 1);
  const noteGridCols = boxCols;
  const maxBoardWidth = gridSize <= 4 ? 300 : gridSize <= 6 ? 360 : 420;

  // Split numbers: first half above grid, second half below
  const splitAt = Math.ceil(gridSize / 2);
  const topNums = nums.slice(0, splitAt);
  const bottomNums = nums.slice(splitAt);

  // Auto-calculate candidates
  const getCandidates = (r, c) => {
    if (board[r][c] !== 0) return new Set();
    const used = new Set();
    for (let i = 0; i < gridSize; i++) {
      if (board[r][i] !== 0) used.add(board[r][i]);
      if (board[i][c] !== 0) used.add(board[i][c]);
    }
    const br = Math.floor(r / boxRows) * boxRows;
    const bc = Math.floor(c / boxCols) * boxCols;
    for (let i = br; i < br + boxRows; i++)
      for (let j = bc; j < bc + boxCols; j++)
        if (board[i][j] !== 0) used.add(board[i][j]);
    const candidates = new Set();
    const cellExcluded = excluded[`${r}-${c}`] || new Set();
    for (let n = 1; n <= gridSize; n++) if (!used.has(n) && !cellExcluded.has(n)) candidates.add(n);
    return candidates;
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fff0f3 0%, #ffe4e9 50%, #ffd6e0 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Georgia', serif", color: COLORS.text, padding: "16px 12px", position: "relative" }}>
      <HedgehogBackground />
      <style>{GLOBAL_CSS}</style>
      {showConfetti && <Confetti />}

      {/* Header */}
      <div style={{ width: "100%", maxWidth: maxBoardWidth, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, animation: "fadeUp 0.5s ease", position: "relative", zIndex: 1 }}>
        <button className="tool-btn" onClick={goToMenu} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>← Menu</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700 }}>{gridConfig.label} Sudoku</div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: difficulty === "easy" ? "#5aab7b" : difficulty === "medium" ? "#c47a2e" : "#d4637a", fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600 }}>
            {difficulty}{puzzlesCompleted > 0 ? ` · ${puzzlesCompleted} solved` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="tool-btn" onClick={() => startGame(gridKey, difficulty)} title="New puzzle" style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 18, padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>↻</button>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: COLORS.textDim, minWidth: 48, textAlign: "right" }}>{formatTime(time)}</div>
        </div>
      </div>

      {/* Top number pad */}
      {!completed && (
        <div style={{ width: `min(100%, ${maxBoardWidth}px)`, marginBottom: 10, position: "relative", zIndex: 1 }}>
          <NumRow numbers={topNums} board={board} gridSize={gridSize} handleNumber={handleNumber} excludeMode={excludeMode} selected={selected} excluded={excluded} handleExclude={handleExclude} />
        </div>
      )}

      {/* Board */}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        width: `min(100%, ${maxBoardWidth}px)`, aspectRatio: "1",
        background: COLORS.surface, borderRadius: 16, overflow: "hidden",
        border: `2px solid ${COLORS.boxBorder}`, boxShadow: "0 20px 60px rgba(180,130,150,0.2)",
        animation: "fadeUp 0.6s ease 0.1s both", position: "relative", zIndex: 1,
      }}>
        {board.map((row, r) => row.map((val, c) => {
          const isGiven = given.has(`${r}-${c}`);
          const isSelected = selected && selected[0] === r && selected[1] === c;
          const isError = errors.has(`${r}-${c}`);
          const isSameNum = selectedVal && val === selectedVal && val !== 0;
          const isInRowCol = selected && (selected[0] === r || selected[1] === c);
          const isInBox = selected && Math.floor(selected[0] / boxRows) === Math.floor(r / boxRows) && Math.floor(selected[1] / boxCols) === Math.floor(c / boxCols);
          const cellNotes = notes[`${r}-${c}`];
          const manualNotes = cellNotes && cellNotes.size > 0 ? cellNotes : null;
          const autoCandidates = noteMode && val === 0 ? getCandidates(r, c) : null;
          const displayNotes = val === 0 ? (manualNotes || autoCandidates) : null;
          const isHint = hintCells.has(`${r}-${c}`);
          const isFlashing = hintFlash === `${r}-${c}`;
          const cellExcluded = excluded[`${r}-${c}`];
          const hasExclusions = val === 0 && cellExcluded && cellExcluded.size > 0;
          const cellFontSize = gridSize <= 4 ? "clamp(22px, 7vw, 34px)" : gridSize <= 6 ? "clamp(18px, 5.5vw, 28px)" : "clamp(16px, 4.5vw, 24px)";

          return (
            <div key={`${r}-${c}`} className="cell" onClick={() => handleCell(r, c)} style={{
              display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1",
              fontSize: cellFontSize,
              fontFamily: isGiven ? "'Playfair Display', Georgia, serif" : "'Source Sans 3', sans-serif",
              fontWeight: isGiven ? 700 : 400,
              color: isError ? COLORS.error : isGiven ? COLORS.given : isHint ? COLORS.correct : COLORS.userInput,
              background: isSelected ? COLORS.selected : isSameNum ? COLORS.sameNum : (isInRowCol || isInBox) ? COLORS.highlight : "transparent",
              borderRight: (c + 1) % boxCols === 0 && c < gridSize - 1 ? `2px solid ${COLORS.boxBorder}` : `1px solid ${COLORS.cellBorder}`,
              borderBottom: (r + 1) % boxRows === 0 && r < gridSize - 1 ? `2px solid ${COLORS.boxBorder}` : `1px solid ${COLORS.cellBorder}`,
              position: "relative", animation: isFlashing ? "hintGlow 0.8s ease" : undefined,
            }}>
              {displayNotes ? (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${noteGridCols}, 1fr)`, width: "85%", height: "85%", alignItems: "center", justifyItems: "center" }}>
                  {nums.map(n => {
                    const isCandidate = displayNotes.has(n);
                    return (
                      <span key={n} style={{
                        fontSize: gridSize <= 4 ? "clamp(9px, 2.5vw, 13px)" : gridSize <= 6 ? "clamp(8px, 2vw, 11px)" : "clamp(7px, 1.8vw, 10px)",
                        color: isCandidate ? (autoCandidates && !manualNotes ? COLORS.textDim + "99" : COLORS.textDim) : "transparent",
                        lineHeight: 1,
                      }}>{n}</span>
                    );
                  })}
                </div>
              ) : val !== 0 ? val : ""}
            </div>
          );
        }))}
      </div>

      {/* Controls */}
      {!completed && (
        <div style={{ animation: "fadeUp 0.6s ease 0.2s both", width: `min(100%, ${maxBoardWidth}px)`, marginTop: 10, position: "relative", zIndex: 1 }}>
          {/* Bottom number pad */}
          <div style={{ marginBottom: 14 }}>
            <NumRow numbers={bottomNums} board={board} gridSize={gridSize} handleNumber={handleNumber} excludeMode={excludeMode} selected={selected} excluded={excluded} handleExclude={handleExclude} />
          </div>

          {/* Tool buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <button className="tool-btn" onClick={handleErase} style={{ background: COLORS.surface, border: "none", color: COLORS.textDim, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, padding: "8px 16px", borderRadius: 10 }}>Erase</button>
            <button className="tool-btn" onClick={() => setNoteMode(m => !m)} style={{ background: noteMode ? COLORS.accentSoft : COLORS.surface, border: noteMode ? `1px solid ${COLORS.accent}` : "none", color: noteMode ? COLORS.accent : COLORS.textDim, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, padding: "8px 16px", borderRadius: 10 }}>Notes {noteMode ? "ON" : "OFF"}</button>
            <button className="tool-btn" onClick={() => setExcludeMode(m => !m)} style={{ background: excludeMode ? "rgba(212,99,122,0.2)" : COLORS.surface, border: excludeMode ? `1px solid ${COLORS.accent}` : "none", color: excludeMode ? COLORS.error : COLORS.textDim, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, padding: "8px 16px", borderRadius: 10 }}>Remove {excludeMode ? "ON" : "OFF"}</button>
            <button className="tool-btn" onClick={handleHint} disabled={hintsUsed >= maxHintsNow} style={{ background: hintsUsed >= maxHintsNow ? `${COLORS.surface}88` : COLORS.surface, border: "none", color: hintsUsed >= maxHintsNow ? `${COLORS.textDim}44` : COLORS.correct, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, padding: "8px 16px", borderRadius: 10, opacity: hintsUsed >= maxHintsNow ? 0.5 : 1 }}>Hint ({maxHintsNow - hintsUsed})</button>
          </div>
        </div>
      )}

      {/* Completion */}
      {completed && (
        <div style={{ animation: "jokeReveal 0.8s ease", marginTop: 28, textAlign: "center", maxWidth: 400, position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 900, marginBottom: 4, background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Brilliant!</div>
          <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: COLORS.textDim, marginBottom: 24 }}>Completed in {formatTime(time)}</div>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.gold}33`, borderRadius: 20, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${COLORS.gold}15, transparent)`, borderRadius: "50%" }} />
            <div style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: COLORS.gold, fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600, marginBottom: 14 }}>Bubba's Dad Joke Prize</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, lineHeight: 1.6, color: COLORS.text, fontStyle: "italic" }}>
              {jokeLoading ? "Cooking up something funny..." : `"${joke}"`}
            </div>
          </div>
          <button className="diff-btn" onClick={() => startGame(gridKey, difficulty)} style={{ marginTop: 24, background: COLORS.accent, border: "none", color: "#fff", fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, fontWeight: 600, padding: "14px 36px", borderRadius: 14, cursor: "pointer" }}>Next Puzzle →</button>
          <button className="tool-btn" onClick={goToMenu} style={{ marginTop: 12, background: "transparent", border: "none", color: COLORS.textDim, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, padding: "8px 20px", borderRadius: 10, cursor: "pointer", display: "block", marginLeft: "auto", marginRight: "auto" }}>Change Size / Difficulty</button>
        </div>
      )}
    </div>
  );
}
