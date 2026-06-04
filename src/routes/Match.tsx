import React from 'react';
import { useAuth } from '../App';
import { motion } from 'motion/react';
import { Sparkles, Clock, Lock, Users, Heart, ArrowRight, Star, Compass, Shield } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Logo } from '../components/Logo';

export default function MatchPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[90vh] sm:min-h-[85vh] flex items-center justify-center p-4 sm:p-8 bg-bg-base relative overflow-hidden">
      {/* Decorative luxury gradient ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-bg-card rounded-[2.5rem] border-2 border-brand-primary/10 shadow-[24px_24px_48px_rgba(128,0,32,0.03)] p-8 sm:p-14 text-center space-y-10 relative overflow-hidden">
        {/* Top burgundy line indicator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>

        {/* Elegant top micro-badge */}
        <div className="flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/5 border border-brand-primary/10 text-brand-primary text-[9px] uppercase tracking-[0.25em] font-black"
          >
            <Users size={11} className="animate-pulse" />
            <span>Curated Connection System</span>
          </motion.div>
        </div>

        {/* Middle brand badge - Hearts interlaced */}
        <div className="flex justify-center -space-y-2 flex-col items-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-2 border-brand-primary/10 shadow-lg relative group overflow-hidden"
          >
            <div className="absolute inset-0 rounded-full bg-brand-primary/[0.02] animate-pulse"></div>
            <Heart size={28} className="text-brand-primary stroke-[1.5]" />
          </motion.div>
          <h2 className="text-sm font-sans font-black uppercase tracking-[0.4em] text-brand-primary mt-4">Match System</h2>
        </div>

        {/* Core statement */}
        <div className="space-y-4 max-w-lg mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-4xl font-display font-black tracking-tight uppercase text-text-base leading-tight"
          >
            Meaningful Bonds, <br />
            <span className="text-brand-primary italic">Lovingly Crafted</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-sm sm:text-base text-text-muted leading-[1.8] font-light"
          >
            Match is coming soon. We're carefully crafting meaningful connections for our official launch.
          </motion.p>
        </div>


      </div>
    </div>
  );
}
