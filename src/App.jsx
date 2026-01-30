import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';

// --- Small UI Components ---

const Button = ({ onClick, disabled, children, className = '', variant = 'primary' }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-bold transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 disabled:opacity-50",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

// --- Confetti Logic ---
const useConfetti = () => {
  const fire = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }, []);

  return { fire };
};

// --- Main App Component ---

export default function App() {
  // Configuration
  const [range, setRange] = useState({ min: 1, max: 100 });
  
  // App state
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [history, setHistory] = useState([]); 
  const [currentNumber, setCurrentNumber] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [winner, setWinner] = useState(null);
  
  const { fire: fireConfetti } = useConfetti();
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const initializeNumbers = () => {
    const nums = [];
    for (let i = parseInt(range.min); i <= parseInt(range.max); i++) {
      nums.push(i);
    }
    setAvailableNumbers(nums);
    setHistory([]);
    setWinner(null);
    setCurrentNumber("?");
    setShowConfig(false);
  };

  const handleSpin = () => {
    if (availableNumbers.length === 0) {
      alert("All numbers have been drawn!");
      return;
    }

    setIsSpinning(true);
    setWinner(null);
    
    // Number shuffle effect
    intervalRef.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      setCurrentNumber(availableNumbers[randomIndex]);
    }, 200);

    // Stop after 3s
    timerRef.current = setTimeout(() => {
      stopSpin();
    }, 3000);
  };

  const stopSpin = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    const finalIndex = Math.floor(Math.random() * availableNumbers.length);
    const winningNumber = availableNumbers[finalIndex];

    setWinner(winningNumber);
    setCurrentNumber(winningNumber);
    setHistory(prev => [winningNumber, ...prev]);
    
    const newAvailable = availableNumbers.filter(n => n !== winningNumber);
    setAvailableNumbers(newAvailable);

    setIsSpinning(false);
    fireConfetti();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // --- Render Views ---

  if (showConfig) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
              Lucky Draw Setup
            </h1>
            <p className="text-slate-400">Set up your lucky number range</p>
          </div>
          <Card>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Start number</label>
                  <input
                    type="number"
                    value={range.min}
                    onChange={(e) => setRange({ ...range, min: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">End number</label>
                  <input
                    type="number"
                    value={range.max}
                    onChange={(e) => setRange({ ...range, max: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-sm">
                Total: <span className="font-bold text-white">{parseInt(range.max) - parseInt(range.min) + 1}</span> numbers will be generated.
              </div>
              <Button onClick={initializeNumbers} className="w-full text-lg h-14">Initialize & Start</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans overflow-hidden flex flex-col md:flex-row gap-6">
      
      {/* Left column: Main area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute top-0 left-0 w-full flex justify-between items-center p-4 z-20">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">LUCKY DRAW</h2>
          <Button variant="secondary" onClick={() => setShowConfig(true)} className="text-sm px-4 py-2">
            Settings
          </Button>
        </div>

        {/* --- WHEEL AREA --- */}
        <div className="relative mb-12 mt-10 group">
          
          {/* 1. Pointer */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 drop-shadow-xl pointer-events-none">
            {/* Downward triangle pointer */}
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-yellow-400 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
          </div>

          {/* 2. Glow effect behind wheel */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] h-[22rem] md:w-[28rem] md:h-[28rem] rounded-full blur-[60px] transition-all duration-500 ${winner ? 'bg-yellow-500/30' : 'bg-purple-600/30'}`}></div>
          
          {/* 3. Main wheel container */}
          <div className={`relative w-80 h-80 md:w-[26rem] md:h-[26rem] rounded-full flex items-center justify-center shadow-2xl border-[10px] border-slate-800 transition-all duration-500 ${winner ? 'scale-105 shadow-yellow-500/20' : 'shadow-black/50'}`}>
            
            {/* 4. Visual wheel */}
            <div className={`absolute inset-0 rounded-full overflow-hidden transition-transform duration-[3000ms] ease-out ${isSpinning ? 'animate-spin-fast blur-[1px]' : ''}`}>
              <div className="w-full h-full opacity-80 wheel-gradient" />
            </div>

            {/* 5. Center circle (display number) */}
            <div className="absolute inset-4 md:inset-6 rounded-full bg-slate-900 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border-[6px] border-slate-700/50 z-10">
               
               {/* 6. Display number */}
               <span className={`text-[7rem] md:text-[9rem] font-black tracking-tighter transition-all duration-200 ${
                 winner 
                 ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110 animate-bounce' 
                 : 'text-slate-200 drop-shadow-md'
               }`}>
                 {currentNumber}
               </span>
            </div>

          </div>
          
          {/* Placeholder for removed code */}
        </div>
        {/* --- END WHEEL AREA --- */}

        {/* --- RESULT DISPLAY AREA --- */}
        <div className="min-h-[6rem] flex items-center justify-center mb-6 z-20 w-full transition-all duration-300">
           {winner ? (
             <div className="text-center animate-fade-in-up translate-x-1/2">
                <div className="text-yellow-400 font-bold text-3xl md:text-4xl uppercase tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-2">
                  🎉 CONGRATULATIONS 🎉
                </div>
                <div className="text-slate-300 font-mono text-lg bg-slate-800/60 px-6 py-1 rounded-full border border-slate-600/50 inline-block backdrop-blur-sm shadow-lg">
                   Lucky number
                </div>
             </div>
           ) : (
             /* Spacer for layout stability */
             <div className="h-full"></div>
           )}
        </div>

        {/* Control buttons */}
        <div className="flex flex-col items-center gap-4 z-10">
          <Button 
            onClick={handleSpin} 
            disabled={isSpinning || availableNumbers.length === 0}
            className={`w-64 h-16 text-xl uppercase tracking-wider ${isSpinning ? 'opacity-80 cursor-wait' : ''}`}
          >
            {isSpinning ? "Spinning..." : availableNumbers.length === 0 ? "No numbers left" : "SPIN"}
          </Button>
          
          <div className="text-slate-500 text-sm bg-slate-900/50 px-3 py-1 rounded-full">
            Remaining: <span className="text-white font-bold">{availableNumbers.length}</span> numbers
          </div>
        </div>
      </div>

      {/* Right column: History */}
      <div className="w-full md:w-80 h-64 md:h-auto flex flex-col gap-4">
        <Card className="h-full flex flex-col p-4 bg-slate-800/80">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="font-bold text-lg text-slate-200">Winner history</h3>
            <span className="bg-slate-700 text-xs px-2 py-1 rounded-full text-slate-300">
              {history.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-sm">
                <p>No winners yet</p>
              </div>
            ) : (
              history.map((num, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600 animate-fade-in-left">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-xs text-slate-400 font-mono">
                      #{history.length - idx}
                    </span>
                    <span className="text-xl font-bold text-green-400">{num}</span>
                  </div>
                  <span className="text-xs text-slate-500">Just now</span>
                </div>
              ))
            )}
          </div>
          
          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
               <Button variant="danger" onClick={initializeNumbers} className="w-full text-sm py-2">
                 Reset All
               </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}