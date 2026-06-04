import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Users } from 'lucide-react';

export const AboutSection = () => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-7xl mx-auto px-8 py-32 sm:py-48 md:py-64 space-y-32"
      id="about"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <div className="space-y-12 text-left">
          <div className="space-y-6">
            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-brand-primary">Our Mission</span>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-display font-black uppercase italic tracking-tighter leading-[0.85] text-balance">
              Finding Your <br/> 
              <span className="text-brand-primary">Inner Peace</span>
            </h2>
          </div>
          
          <p className="text-[13px] sm:text-lg md:text-xl text-text-muted font-normal uppercase tracking-widest leading-relaxed max-w-xl text-balance">
            DelusionAI is a safe space for your mind. A private, simple, and comfortable place where you can find support when you need it most, helping you overcome loneliness.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-12 border-t border-black/5 mt-12">
            <div className="flex flex-col items-start space-y-6 group">
              <div className="w-14 h-14 cred-elevation flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform flex-shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="space-y-3">
                <h4 className="font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs">mayaAI (Psychologist)</h4>
                <p className="text-[11px] sm:text-xs text-text-muted uppercase tracking-widest leading-loose text-balance">
                  Maya is a psychologist-like AI. It listens to your thoughts, understands your pain, and gently suggests the right companion with a similar mindset.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start space-y-6 group">
              <div className="w-14 h-14 cred-elevation flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform flex-shrink-0">
                <Users size={24} />
              </div>
              <div className="space-y-3">
                <h4 className="font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs">Mindset Alignment</h4>
                <p className="text-[11px] sm:text-xs text-text-muted uppercase tracking-widest leading-loose text-balance">
                  Maya finds someone with a compatible experience so you can talk comfortably in a fully private, safe environment.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-brand-primary/5 blur-3xl -z-10 rounded-full"></div>
          <div className="cred-elevation p-1 bg-gradient-to-br from-brand-primary/20 to-transparent">
            <div className="bg-bg-base p-8 md:p-12 space-y-10">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b border-black/5 pb-6 text-center lg:text-left">Why Choose Us?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-8">
                {[
                  { t: "mayaAI Psychologist", d: "Maya listens to your thoughts and recommends companionship." },
                  { t: "Mindset Alignment", d: "Connect with people who share your mindset." },
                  { t: "Total Privacy", d: "Your data and chats stay private and anonymous." },
                  { t: "Overcome Isolation", d: "Comfortable and safe space to overcome feeling alone." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-center lg:items-start">
                    <span className="text-brand-primary font-display font-black text-xl italic opacity-30 flex-shrink-0">0{i+1}</span>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-base">{item.t}</p>
                      <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-text-muted">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

