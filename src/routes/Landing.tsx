 import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { MessageCircle, Users, ShieldCheck, Mail, Send, Sparkles, Linkedin, Instagram, ArrowRight } from 'lucide-react';
import { useAuth } from '../App';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Logo } from '../components/Logo';
import { AboutSection } from '../components/AboutSection';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistData, setWaitlistData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  
  React.useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' });
    }
  }, [user, navigate]);

  if (user) return null;

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'waitlist'), {
        ...waitlistData,
        submittedAt: new Date().toISOString()
      });
      setWaitlistSuccess(true);
      setTimeout(() => {
        setShowWaitlist(false);
        setWaitlistSuccess(false);
        setWaitlistData({ name: '', email: '' });
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-base relative overflow-hidden min-h-screen flex flex-col">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
      <div className="absolute top-1/4 -left-64 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[150px] -z-10"></div>
      <div className="absolute bottom-1/4 -right-64 w-[600px] h-[600px] bg-brand-secondary/5 rounded-full blur-[150px] -z-10"></div>

      <div className="global-container pt-8 md:pt-16 pb-16 md:pb-24 flex-grow flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-5xl space-y-8 md:space-y-12 relative z-10">
          
          {/* Elegant Top Badge */}
          <div className="flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-brand-primary/5 border border-brand-primary/10 rounded-full py-2 px-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] hover:bg-brand-primary/10 transition-colors">
              <Logo size={20} className="text-brand-primary" />
              <span className="text-[10px] font-sans font-black uppercase tracking-[0.25em] text-brand-primary">
                DelusionAI
              </span>
            </div>
          </div>

          <h1 id="landing-hero-heading" className="text-5xl xs:text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-display font-light leading-[1.05] tracking-tight uppercase relative text-text-base text-balance px-4 mx-auto">
            Find support <br className="hidden sm:block" />
            <span className="text-brand-primary font-medium italic relative inline-block">
              that gets you
            </span>
          </h1>
        
          <p className="font-sans font-light text-base sm:text-lg md:text-xl text-text-muted max-w-3xl mx-auto leading-relaxed tracking-wide px-4 mt-4 md:mt-6 text-balance opacity-90">
            Maya is a psychologist-like AI. It first listens to your problems, understands your pain, and suggests the right companion with a similar mindset to talk to.
          </p>

          <div className="pt-4 md:pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4">
            <button 
              onClick={() => navigate({ to: '/auth' })}
              className="btn-get-started w-full sm:w-auto px-12 py-4.5 text-xs sm:text-sm flex items-center justify-center gap-3.5 group cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Foundations Cards replicated from uploaded screenshot */}
          <div className="pt-12 md:pt-20 w-full px-4 md:px-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-brand-primary/10 pt-10">
              {/* Box 1: Maya AI */}
              <div className="bg-white/95 border border-brand-primary/[0.15] hover:border-brand-primary hover:shadow-[8px_8px_0px_0px_rgba(128,0,32,1)] hover:-translate-x-1.5 hover:-translate-y-1.5 rounded-[2.5rem] p-6 sm:p-10 md:p-12 flex flex-col items-start text-left transition-all duration-300 min-h-none sm:min-h-[350px] w-full">
                <div className="w-16 h-16 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/85 flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex-shrink-0">
                  <MessageCircle size={26} className="text-brand-primary" />
                </div>
                <h4 className="text-2xl sm:text-3xl font-display font-light text-brand-primary tracking-wide leading-tight mb-4">
                  MayaAI
                </h4>
                <p className="font-sans font-light text-sm sm:text-base text-text-muted leading-[1.8] text-balance">
                  Maya is a psychologist-like AI. It listens to your thoughts, understands your emotions, and carefully suggests the right person to talk to.
                </p>
              </div>

              {/* Box 2: Peer Matching - highlighted on hover only now */}
              <div className="bg-white/95 border border-brand-primary/[0.15] hover:border-brand-primary hover:shadow-[8px_8px_0px_0px_rgba(128,0,32,1)] hover:-translate-x-1.5 hover:-translate-y-1.5 rounded-[2.5rem] p-6 sm:p-10 md:p-12 flex flex-col items-start text-left transition-all duration-300 min-h-none sm:min-h-[350px] w-full">
                <div className="w-16 h-16 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/85 flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex-shrink-0">
                  <Users size={26} className="text-brand-primary" />
                </div>
                <h4 className="text-2xl sm:text-3xl font-display font-light text-brand-primary tracking-wide leading-tight mb-4">
                  Similar Mindsets
                </h4>
                <p className="font-sans font-light text-sm sm:text-base text-text-muted leading-[1.8] text-balance">
                  Maya understands your feelings and struggles, finding someone with a compatible mindset so you can talk comfortably.
                </p>
              </div>

              {/* Box 3: Total Privacy */}
              <div className="bg-white/95 border border-brand-primary/[0.15] hover:border-brand-primary hover:shadow-[8px_8px_0px_0px_rgba(128,0,32,1)] hover:-translate-x-1.5 hover:-translate-y-1.5 rounded-[2.5rem] p-6 sm:p-10 md:p-12 flex flex-col items-start text-left transition-all duration-300 min-h-none sm:min-h-[350px] w-full">
                <div className="w-16 h-16 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/85 flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex-shrink-0">
                  <ShieldCheck size={26} className="text-brand-primary" />
                </div>
                <h4 className="text-2xl sm:text-3xl font-display font-light text-brand-primary tracking-wide leading-tight mb-4">
                  Total Privacy
                </h4>
                <p className="font-sans font-light text-sm sm:text-base text-text-muted leading-[1.8] text-balance">
                  Everything you say is secure. Your identity is kept safe, and you are in complete control of your conversations.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {showWaitlist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-bg-base/90 backdrop-blur-xl">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="w-full max-w-md cred-elevation p-6 sm:p-10 md:p-12 space-y-6 sm:space-y-10 text-left"
            >
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">Join Us</h2>
                <p className="text-[10px] sm:text-xs text-text-muted font-bold uppercase tracking-[0.2em]">Sign up for our early access list.</p>
              </div>

              {waitlistSuccess ? (
                <div className="cred-inset p-6 sm:p-10 text-center space-y-4 border-2 border-brand-primary/20">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto text-brand-primary shadow-[0_0_15px_rgba(61,90,254,0.3)]">
                    <Send size={24} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">You're on the list!</p>
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted ml-1">Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Your Name"
                      className="input-base"
                      value={waitlistData.name}
                      onChange={e => setWaitlistData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted ml-1">Email Address</label>
                    <div className="relative">
                      <input 
                         type="email" 
                         required
                         placeholder="email@example.com"
                         className="input-base pl-12"
                         value={waitlistData.email}
                         onChange={e => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
                      />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowWaitlist(false)}
                      className="flex-1 btn-secondary text-[10px]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="flex-[2] btn-primary py-4 text-[10px] flex items-center justify-center gap-2"
                    >
                      {submitting ? 'Submitting...' : 'Join Now'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full border-t border-black/5 mt-auto bg-bg-base/50 pt-8 pb-6">
        <div className="global-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="border-b border-black/5 pb-2 flex items-center h-[29px]">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-text-muted">Platform</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Logo size={32} className="text-brand-primary" />
                  <span className="font-display font-black uppercase italic text-xl tracking-tighter">DelusionAI</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted leading-relaxed max-w-xs">
                  We help you feel better through support from AI and your Peer connection.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted border-b border-black/5 pb-2">Connect</h4>
              <div className="flex gap-4 pt-1">
                <a href="https://www.linkedin.com/company/delusionai/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 cred-elevation flex items-center justify-center text-zinc-650 hover:text-brand-primary hover:border-brand-primary transition-all group">
                  <Linkedin size={16} className="group-hover:scale-110 transition-transform" />
                </a>
                <a href="https://www.instagram.com/delusionai.in?igsh=YTVvcGFkZWkzN3N3" target="_blank" rel="noopener noreferrer" className="w-10 h-10 cred-elevation flex items-center justify-center text-zinc-650 hover:text-brand-primary hover:border-brand-primary transition-all group">
                  <Instagram size={16} className="group-hover:scale-110 transition-transform" />
                </a>
                <a href="https://x.com/Delusion_Ai" target="_blank" rel="noopener noreferrer" className="w-10 h-10 cred-elevation flex items-center justify-center text-zinc-650 hover:text-brand-primary hover:border-brand-primary transition-all group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted border-b border-black/5 pb-2">Contact</h4>
              <div className="space-y-3 pt-1">
                <div className="border-l border-brand-primary/15 pl-4 py-0.5 space-y-0.5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">Inquiries</p>
                  <a href="mailto:contact.us@delusionai.in" className="text-xs font-black italic hover:text-brand-primary transition-colors text-text-base">contact.us@delusionai.in</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">
            <p>© 2026 DelusionAI</p>
            <div className="flex gap-8">
              <Link to="/protocol" className="hover:text-text-base cursor-pointer">App Safety</Link>
              <Link to="/privacy" className="hover:text-text-base cursor-pointer">Privacy</Link>
              <Link to="/terms" className="hover:text-text-base cursor-pointer">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description, isLarge }: { icon: React.ReactNode, title: string, description: string, isLarge?: boolean }) => {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
      }}
      whileHover={{ y: -8 }}
      className={`cred-elevation text-left space-y-8 group hover:border-brand-primary transition-all duration-500 hover:shadow-[0_20px_40px_rgba(128,0,32,0.1)] cursor-default ${isLarge ? 'p-8 md:p-16' : 'p-6 md:p-10'}`}
    >
      <div className={`cred-inset bg-bg-base/50 flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:border-brand-primary ${isLarge ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'}`}>
        <div className="relative z-10 scale-75 md:scale-100">
          {icon}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-text-base group-hover:text-brand-primary transition-colors duration-500">{title}</h3>
        <p className="text-text-muted leading-relaxed font-black uppercase text-[10px] md:text-[11px] tracking-widest group-hover:text-text-base transition-colors duration-500">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
