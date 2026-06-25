import React from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Sparkles, ChevronLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function Protocol() {
  return (
    <div className="page-base pt-4 md:pt-6">
      <div className="global-container space-y-12 md:space-y-20">
        <Link to="/" className="inline-flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-colors mb-8 md:mb-12">
          <ChevronLeft size={14} /> Back Home
        </Link>

        <header className="space-y-4 md:space-y-6">
          <div className="w-12 h-12 md:w-16 md:h-16 cred-elevation flex items-center justify-center text-brand-primary">
            <Shield size={24} className="md:size-[32px]" />
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase italic tracking-tighter leading-none">App<br/>Safety</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Keeping you safe on DelusionAI</p>
        </header>

        <section className="space-y-12 md:space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-4 text-brand-primary">
                <Zap size={18} />
                <h3 className="text-lg md:text-xl font-black uppercase tracking-widest italic">Talking to Maya</h3>
              </div>
              <p className="text-[10px] font-bold leading-relaxed text-text-muted uppercase italic tracking-widest">
                Maya helps make sure our app is a safe place for everyone. 
                Maya checks in with you to see how you are feeling before you talk to others.
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-4 text-brand-primary">
                <Shield size={18} />
                <h3 className="text-lg md:text-xl font-black uppercase tracking-widest italic">User Safety</h3>
              </div>
              <p className="text-[10px] font-bold leading-relaxed text-text-muted uppercase italic tracking-widest">
                We have systems that stop mean or harmful behavior right away. 
                We take all reports seriously to keep our community safe and friendly.
              </p>
            </div>
          </div>

          <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter border-b border-black/5 pb-4">Our Foundation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-text-muted italic font-medium leading-relaxed uppercase text-[9px] md:text-[10px] tracking-widest">
              <div className="space-y-4">
                <p><b>Company:</b> DelusionAI Technologies inc.</p>
                <p><b>Mission:</b> To help people feel better by connecting them with caring support and others who understand.</p>
                <p><b>Technology:</b> Built using advanced Google technology to provide real-time support for your mind.</p>
              </div>
              <div className="space-y-4">
                <p><b>Privacy:</b> We never sell your data or use it for ads. Your privacy always comes first.</p>
                <p><b>Rules:</b> We have high safety standards to make sure everyone feels good using our app.</p>
              </div>
            </div>
          </div>

          <div className="cred-elevation p-8 md:p-12 bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10 space-y-6 md:space-y-8">
              <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Our Rules</h2>
              <div className="space-y-4 md:space-y-6 text-[11px] md:text-xs text-text-muted italic font-medium leading-relaxed">
                <p>
                  1. <b>Discovery:</b> Maya learns how to help you by listening to what you say.
                </p>
                <p>
                  2. <b>Support:</b> We match you with people who really understand what you are going through.
                </p>
                <p>
                  3. <b>Privacy:</b> You decide how much you want to share about yourself with others.
                </p>
                <p>
                  4. <b>Your Data:</b> You own your data. If you delete your account, all your data is gone forever.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
             <div className="inline-block px-6 md:px-10 py-3 md:py-4 cred-inset text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] text-brand-primary">
               Compliance Verified: 2026
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
