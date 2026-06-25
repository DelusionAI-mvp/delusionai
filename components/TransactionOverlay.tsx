import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, Loader2, Crown, Zap, CheckCircle2 } from 'lucide-react';

interface TransactionOverlayProps {
  isVisible: boolean;
  type?: 'sync' | 'shield' | 'process' | 'premium_upgrade';
  label?: string;
  onComplete?: () => void;
}

export const TransactionOverlay = ({ 
  isVisible, 
  type = 'process', 
  label = 'Processing Neural Link...',
  onComplete 
}: TransactionOverlayProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (isVisible && type === 'premium_upgrade') {
      setStage(0);
      const t1 = setTimeout(() => setStage(1), 1200);
      const t2 = setTimeout(() => setStage(2), 2400);
      const t3 = setTimeout(() => setStage(3), 3600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isVisible, type]);

  const stages = [
    { text: "Securing Neural Gateway...", sub: "Verifying secure encrypted credentials" },
    { text: "Reconciling Mindset Frequencies...", sub: "Syncing comforting patterns on server layers" },
    { text: "Stabilizing Unlimited Comfort Layer...", sub: "Removing daily caps & enabling infinity connections" },
    { text: "Welcome to DelusionAI Premium", sub: "Neural connection completed successfully" }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-black"
        >
          {type === 'premium_upgrade' ? (
            <>
              {/* Cinematic Ambient Glows */}
              <motion.div 
                animate={{
                  x: [0, 40, -20, 0],
                  y: [0, -30, 30, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-primary/20 rounded-full blur-[140px] pointer-events-none"
              />
              <motion.div 
                animate={{
                  x: [0, -30, 40, 0],
                  y: [0, 30, -30, 0],
                }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-brand-accent/10 rounded-full blur-[120px] pointer-events-none"
              />

              {/* Infinite Starry Particles Floating Up */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: Math.random() * 1920 - 960, 
                      y: 1080, 
                      opacity: 0, 
                      scale: Math.random() * 0.5 + 0.5 
                    }}
                    animate={{ 
                      y: -100, 
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{ 
                      duration: Math.random() * 5 + 4,
                      repeat: Infinity,
                      delay: Math.random() * 4,
                      ease: "linear"
                    }}
                    className={`absolute left-1/2 w-1.5 h-1.5 rounded-full ${i % 2 === 0 ? 'bg-brand-accent' : 'bg-brand-primary'}`}
                  />
                ))}
              </div>

              <div className="text-center space-y-12 relative z-10 p-6 max-w-lg">
                {/* Visual Geometry */}
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  {/* Concentric Spinning Rings */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-brand-primary/25 rounded-full shadow-[0_0_30px_rgba(128,0,32,0.1)]"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border border-dashed border-brand-accent/20 rounded-full"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-8 bg-brand-primary/5 rounded-full filter blur-md"
                  />

                  {/* Pulsating Center Sphere */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.08, 1],
                      boxShadow: [
                        "0 0 20px rgba(128,0,32,0.3)", 
                        "0 0 50px rgba(255,215,0,0.4)", 
                        "0 0 20px rgba(128,0,32,0.3)"
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-24 h-24 cred-elevation bg-black rounded-full flex items-center justify-center text-brand-accent relative border-2 border-brand-accent/30"
                  >
                    <AnimatePresence mode="wait">
                      {stage === 0 && (
                        <motion.div
                          key="zap"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="text-brand-accent"
                        >
                          <Zap size={36} className="animate-pulse" />
                        </motion.div>
                      )}
                      {stage === 1 && (
                        <motion.div
                          key="sparkles"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="text-brand-primary"
                        >
                          <Sparkles size={36} />
                        </motion.div>
                      )}
                      {stage === 2 && (
                        <motion.div
                          key="crown"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="text-brand-accent"
                        >
                          <Crown size={38} />
                        </motion.div>
                      )}
                      {stage === 3 && (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="text-green-400"
                        >
                          <CheckCircle2 size={38} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Processing Texts */}
                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stage}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-2"
                    >
                      <h3 className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-tighter text-text-base leading-tight">
                        {stages[stage]?.text}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-text-muted">
                        {stages[stage]?.sub}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <div className="w-48 h-1 bg-zinc-950 mx-auto rounded-full overflow-hidden p-[1px] border border-brand-primary/10">
                    <motion.div 
                      key={isVisible ? 'loading' : 'idle'}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 4.2, ease: "easeInOut" }}
                      className="h-full bg-gradient-to-r from-brand-primary to-brand-accent shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-8 relative z-10">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-24 h-24 cred-elevation rounded-full flex items-center justify-center text-brand-primary mx-auto"
              >
                {type === 'sync' && <Sparkles size={32} />}
                {type === 'shield' && <ShieldCheck size={32} />}
                {type === 'process' && <Loader2 size={32} className="animate-spin" />}
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                  {label}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">
                  Please wait...
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
