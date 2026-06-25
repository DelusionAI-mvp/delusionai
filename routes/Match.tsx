import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function MatchPage() {
  return (
    <div className="flex-grow min-h-[80vh] flex items-center justify-center p-4 bg-bg-base">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl bg-bg-card rounded-[2.5rem] border-2 border-brand-accent/30 shadow-[24px_24px_60px_rgba(128,0,32,0.15)] p-8 sm:p-14 space-y-8 relative overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary to-brand-accent"></div>
        
        <div className="space-y-8 py-4">
          <div className="w-16 h-16 rounded-3xl bg-brand-accent/15 flex items-center justify-center text-brand-accent mx-auto animate-pulse">
            <Heart size={28} className="fill-brand-accent/10" />
          </div>

          <div className="space-y-4">
            <p className="text-xs md:text-sm font-sans font-light tracking-[0.2em] uppercase text-brand-accent">
              Curated Connection System
            </p>
            <h2 className="text-4xl md:text-5xl font-display font-light uppercase tracking-tight text-text-base leading-none">
              Match System
            </h2>
            <div className="h-[1px] w-12 bg-brand-primary/20 mx-auto"></div>
          </div>

          <div className="space-y-1">
            <p className="text-sm sm:text-base font-sans font-light text-[#8B1A2F] tracking-wide">
              Meaningful bonds,
            </p>
            <p className="text-sm sm:text-base font-sans font-light text-[#8B1A2F] tracking-wide">
              lovingly crafted.
            </p>
          </div>

          <p className="font-sans font-light text-sm sm:text-base text-text-muted max-w-md mx-auto leading-[1.8]">
            Match is coming soon. We're carefully crafting meaningful connections for our official launch.
          </p>
        </div>

        <div className="pt-2 border-t border-brand-primary/5">
          <Link 
            to="/dashboard"
            className="btn-primary w-full py-4 text-xs tracking-widest bg-brand-primary hover:bg-[#A3002E] block text-center"
          >
            Return to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
