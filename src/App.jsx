import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';

// Lucky draw sounds (Mixkit – royalty-free, no attribution)
// tick: short beep during wheel spin | win: celebration when winner revealed | complete: round finished / next round
const SOUND_URLS = {
  tick: [
    'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.m4a',
    'https://assets.mixkit.co/active_storage/sfx/2568/2568.wav',
  ],
  win: [
    'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.m4a',
    'https://assets.mixkit.co/active_storage/sfx/2000/2000.wav',
  ],
  complete: [
    'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.m4a',
    'https://assets.mixkit.co/active_storage/sfx/2019/2019.wav',
  ],
};

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

// --- Audio Hook (tries m4a first, falls back to wav for compatibility) ---
const useSound = () => {
  const tickRef = useRef(new Audio(SOUND_URLS.tick[0]));
  const winRef = useRef(new Audio(SOUND_URLS.win[0]));
  const completeRef = useRef(new Audio(SOUND_URLS.complete[0]));

  useEffect(() => {
    const applyFallback = (ref, urls) => {
      const el = ref.current;
      const onError = () => {
        const next = urls.indexOf(el.src) + 1;
        if (next < urls.length) {
          el.src = urls[next];
          el.load();
        }
      };
      el.addEventListener('error', onError, { once: true });
      return () => el.removeEventListener('error', onError);
    };
    applyFallback(tickRef, SOUND_URLS.tick);
    applyFallback(winRef, SOUND_URLS.win);
    applyFallback(completeRef, SOUND_URLS.complete);
  }, []);

  useEffect(() => {
    tickRef.current.volume = 0.5;
    winRef.current.volume = 0.6;
    completeRef.current.volume = 0.6;
  }, []);

  const playTick = () => {
    if (tickRef.current.paused) {
      tickRef.current.play().catch(() => {});
    } else {
      tickRef.current.currentTime = 0;
    }
  };

  const playWin = () => {
    winRef.current.currentTime = 0;
    winRef.current.play().catch(() => {});
  };

  const playComplete = () => {
    completeRef.current.currentTime = 0;
    completeRef.current.play().catch(() => {});
  };

  const stopAll = () => {
    winRef.current.pause();
    winRef.current.currentTime = 0;
    completeRef.current.pause();
    completeRef.current.currentTime = 0;
  };

  return { playTick, playWin, playComplete, stopAll };
};

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
  const [steps, setSteps] = useState([
    { id: 1, name: 'Round 1', count: 1 },
  ]);

  // App state
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [winner, setWinner] = useState(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});

  const { fire: fireConfetti } = useConfetti();
  const { playTick, playWin, playComplete, stopAll } = useSound();
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const addStep = () => {
    const newId = steps.length > 0 ? Math.max(...steps.map(s => s.id)) + 1 : 1;
    setSteps([...steps, { id: newId, name: `Round ${steps.length + 1}`, count: 1 }]);
  };

  const removeStep = (id) => {
    if (steps.length === 1) return;
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateStep = (id, field, value) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleStepExpansion = (stepId) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const initializeNumbers = () => {
    const min = parseInt(range.min);
    const max = parseInt(range.max);
    const totalAvailable = max - min + 1;
    const totalWinnersNeeded = steps.reduce((sum, step) => sum + parseInt(step.count), 0);

    if (totalWinnersNeeded > totalAvailable) {
      alert(`Error: You need ${totalWinnersNeeded} numbers for all rounds, but only have ${totalAvailable} in the range!`);
      return;
    }

    const nums = [];
    for (let i = min; i <= max; i++) nums.push(i);

    setAvailableNumbers(nums);
    setHistory([]);
    setWinner(null);
    setCurrentNumber("?");
    setCurrentStepIndex(0);
    setIsTransitioning(false);
    setShowConfig(false);
    if (steps.length > 0) setExpandedSteps({ [steps[0].id]: true });
    stopAll();
  };

  const getCurrentStepProgress = () => {
    if (currentStepIndex >= steps.length) return { current: 0, total: 0, finished: true };
    const currentStep = steps[currentStepIndex];
    const winnersInThisStep = history.filter(h => h.stepId === currentStep.id).length;
    return {
      current: winnersInThisStep,
      total: parseInt(currentStep.count),
      finished: winnersInThisStep >= parseInt(currentStep.count),
    };
  };

  const handleSpin = () => {
    if (availableNumbers.length === 0) {
      alert("All numbers have been drawn!");
      return;
    }
    if (currentStepIndex >= steps.length) {
      alert("All rounds completed!");
      return;
    }
    if (isTransitioning) return;

    setIsSpinning(true);
    setWinner(null);
    stopAll();

    intervalRef.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      setCurrentNumber(availableNumbers[randomIndex]);
      playTick();
    }, 120);

    timerRef.current = setTimeout(() => stopSpin(), 3000);
  };

  const stopSpin = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    const finalIndex = Math.floor(Math.random() * availableNumbers.length);
    const winningNumber = availableNumbers[finalIndex];
    const currentStep = steps[currentStepIndex];

    const winRecord = {
      number: winningNumber,
      stepId: currentStep.id,
      stepName: currentStep.name,
      timestamp: new Date(),
    };

    setWinner(winningNumber);
    setCurrentNumber(winningNumber);
    setHistory(prev => [winRecord, ...prev]);
    setAvailableNumbers(availableNumbers.filter(n => n !== winningNumber));
    setIsSpinning(false);
    fireConfetti();
    playWin();

    const winnersInThisStep = history.filter(h => h.stepId === currentStep.id).length + 1;
    if (winnersInThisStep >= parseInt(currentStep.count)) {
      setIsTransitioning(true);
      setTimeout(() => {
        playComplete();
        if (currentStepIndex < steps.length - 1) {
          const nextStepIndex = currentStepIndex + 1;
          const currentStepId = steps[currentStepIndex].id;
          const nextStepId = steps[nextStepIndex].id;
          setCurrentStepIndex(nextStepIndex);
          setExpandedSteps(prev => ({
            ...prev,
            [currentStepId]: false,
            [nextStepId]: true,
          }));
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
        setIsTransitioning(false);
      }, 2000);
    }
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
        <div className="max-w-2xl w-full">
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

              <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-300 text-sm">Rounds</h3>
                  <button type="button" onClick={addStep} className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white transition-colors">
                    + Add round
                  </button>
                </div>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex gap-2 items-center">
                      <span className="text-slate-500 font-mono text-sm w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                        placeholder="Round name"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="w-20 flex items-center gap-1">
                        <span className="text-slate-400 text-xs">Qty</span>
                        <input
                          type="number"
                          min={1}
                          value={step.count}
                          onChange={(e) => updateStep(step.id, 'count', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        disabled={steps.length === 1}
                        className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-30"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-sm">
                Total: <span className="font-bold text-white">{parseInt(range.max) - parseInt(range.min) + 1}</span> numbers will be generated.
                Required: <span className="font-bold text-white">{steps.reduce((acc, s) => acc + parseInt(s.count), 0)}</span> for all rounds.
              </div>
              <Button onClick={initializeNumbers} className="w-full text-lg h-14">Initialize & Start</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const progress = getCurrentStepProgress();
  const currentStep = steps[currentStepIndex];
  const isGameFinished = currentStepIndex >= steps.length;

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
             <div className="text-center animate-fade-in-up">
                <div className="text-yellow-400 font-bold text-3xl md:text-4xl uppercase tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-2">
                  🎉 CONGRATULATION! 🎉
                </div>
                <div className="text-slate-300 font-mono text-lg bg-slate-800/60 px-6 py-1 rounded-full border border-slate-600/50 inline-block backdrop-blur-sm shadow-lg">
                   {history[0]?.stepName ?? 'Lucky number'}
                </div>
             </div>
           ) : isGameFinished ? (
             <div className="text-green-400 font-bold text-xl md:text-2xl uppercase tracking-widest bg-green-500/10 px-6 py-2 rounded-xl border border-green-500/30">
               All rounds completed!
             </div>
           ) : (
             <div className="h-full" />
           )}
        </div>

        {/* Control buttons */}
        <div className="flex flex-col items-center gap-4 z-10">
          <Button 
            onClick={handleSpin} 
            disabled={isSpinning || isTransitioning || availableNumbers.length === 0 || isGameFinished}
            className={`w-64 h-16 text-xl uppercase tracking-wider ${(isSpinning || isTransitioning) ? 'opacity-80 cursor-wait' : ''} ${isGameFinished ? 'grayscale opacity-50' : ''}`}
          >
            {isSpinning ? "Spinning..." : isTransitioning ? "Next round..." : isGameFinished ? "Finished" : availableNumbers.length === 0 ? "No numbers left" : "SPIN"}
          </Button>
          
          <div className="text-slate-500 text-sm bg-slate-900/50 px-3 py-1 rounded-full">
            Remaining: <span className="text-white font-bold">{availableNumbers.length}</span> numbers
          </div>
        </div>
      </div>

      {/* Right column: History (accordion, logic & style like App2) */}
      <div className="w-full md:w-80 h-96 md:h-[calc(100vh-2rem)] flex flex-col gap-4 flex-shrink-0 sticky top-4">
        <Card className="h-full flex flex-col p-4 bg-slate-800/80">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="font-bold text-lg text-slate-200">History</h3>
            <span className="bg-slate-700 text-xs px-2 py-1 rounded-full text-slate-300">
              {history.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-sm">
                <p>No winners yet</p>
              </div>
            ) : (
              steps.map(step => {
                const stepWinners = history.filter(h => h.stepId === step.id);
                if (stepWinners.length === 0 && steps[currentStepIndex]?.id !== step.id) return null;

                const isExpanded = expandedSteps[step.id];

                return (
                  <div key={step.id} className="animate-fade-in-up border border-slate-700/50 rounded-lg overflow-hidden bg-slate-800/50">
                    <div
                      onClick={() => toggleStepExpansion(step.id)}
                      className="flex items-center justify-between p-3 bg-slate-800 cursor-pointer hover:bg-slate-700/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${steps[currentStepIndex]?.id === step.id ? 'text-blue-400' : 'text-slate-400'}`}>
                          {step.name}
                        </span>
                        <span className="bg-slate-700 text-[10px] text-slate-300 px-1.5 rounded-full">
                          {stepWinners.length}/{step.count}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {isExpanded && stepWinners.length > 0 && (
                      <div className="p-2 space-y-2 bg-slate-900/30 border-t border-slate-700/50">
                        {stepWinners.map((record, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg border border-slate-600/50">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-600 text-[10px] text-slate-400 font-mono">
                                {stepWinners.length - idx}
                              </span>
                              <span className="text-lg font-bold text-green-400">{record.number}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {record.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && stepWinners.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        Waiting for winners...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <Button variant="danger" onClick={initializeNumbers} className="w-full text-sm py-2">
                Reset Game
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}