import React from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Heart, Users, Smile, ArrowRight, BookOpen, MessageCircle, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../App';

const About = () => {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring" as const, 
        stiffness: 120, 
        damping: 14 
      }
    }
  };

  return (
    <div className="page-base global-container section-gap pt-4 md:pt-6">
      {/* Hero Section */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="text-center relative max-w-4xl mx-auto space-y-6 md:space-y-8 border-b border-brand-primary/10 pb-8 md:pb-12"
      >
        <motion.div variants={itemVariants} className="flex justify-center">
          <Logo size={120} className="text-brand-primary drop-shadow-[0_0_35px_rgba(128,0,32,0.25)]" />
        </motion.div>
        
        <motion.h1 
          variants={itemVariants}
          className="text-5xl sm:text-7xl md:text-8xl font-display font-light text-text-base tracking-wide leading-tight text-balance"
        >
          Your Safe <br />
          <span className="text-brand-primary italic font-medium">Space</span>
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="font-sans font-light text-sm sm:text-base text-text-muted leading-[1.8] max-w-3xl mx-auto"
        >
          Maya is a psychologist-like AI that listens to your thoughts, understands your pain, and gently suggests the right companion with a similar mindset to talk to.
        </motion.p>
      </motion.section>

      {/* Concept Explanation & Bright Containers Aligned */}
      <section className="space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 items-center">
          <div className="lg:col-span-8 space-y-8 text-left">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-text-muted italic flex items-center gap-2">
                <Smile size={14} className="text-brand-primary" /> Who We Are
              </h2>
              <div className="flex-grow border-t border-brand-primary/15"></div>
            </div>

            <h3 className="text-3xl sm:text-5xl font-display font-light text-brand-primary tracking-wide leading-tight">
              You do not have to carry heavy feelings alone.
            </h3>

            <div className="space-y-6 font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8]">
              <p>
                Sometimes life feels too heavy to carry by ourselves. That is why we created Maya.
              </p>
              <p>
                This is a private, simple, and comfortable space to talk and find quiet relief. Maya is a psychologist-like AI that listens to your worries, truly understands what you are going through, and gently suggests another warm person who has been down the same path, so you can overcome loneliness together.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="w-full max-w-[320px] aspect-square rounded-full border-2 border-brand-accent bg-[#FAF7F2] p-4 flex items-center justify-center shadow-[inset_4px_4px_8px_rgba(0,0,0,0.05),_0_12px_32px_rgba(128,0,32,0.06)] relative overflow-hidden">
              <Logo size={200} className="opacity-90 scale-105" />
            </div>
          </div>
        </div>

        {/* 3 Aligned Containers in Single Beautiful Primary Brand Color (burgundy) */}
        <div className="space-y-8">
          <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-text-muted italic text-left">Our Foundations</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
            {/* Box 1: Maya AI */}
            <div id="box-maya" className="bg-white/95 border border-brand-primary/[0.15] hover:border-brand-primary hover:shadow-[8px_8px_0px_0px_rgba(128,0,32,1)] hover:-translate-x-1.5 hover:-translate-y-1.5 rounded-[2.5rem] p-6 sm:p-10 md:p-12 flex flex-col items-start text-left transition-all duration-300 min-h-none sm:min-h-[350px] w-full">
              <div className="w-16 h-16 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex-shrink-0">
                <MessageCircle size={26} className="text-brand-primary" />
              </div>
              <h4 className="text-2xl sm:text-3xl font-display font-light text-brand-primary tracking-wide leading-tight mb-4">
                MayaAI
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8] text-balance">
                Maya is a psychologist-like AI. It listens to your thoughts, understands your emotions, and carefully suggests the right person to talk to.
              </p>
            </div>

            {/* Box 2: Peer Matching - highlighted on hover only now */}
            <div id="box-peer" className="bg-white/95 border border-brand-primary/[0.15] hover:border-brand-primary hover:shadow-[8px_8px_0px_0px_rgba(128,0,32,1)] hover:-translate-x-1.5 hover:-translate-y-1.5 rounded-[2.5rem] p-6 sm:p-10 md:p-12 flex flex-col items-start text-left transition-all duration-300 min-h-none sm:min-h-[350px] w-full">
              <div className="w-16 h-16 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex-shrink-0">
                <Users size={26} className="text-brand-primary" />
              </div>
              <h4 className="text-2xl sm:text-3xl font-display font-light text-brand-primary tracking-wide leading-tight mb-4">
                Similar Mindsets
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8] text-balance">
                Maya understands your feelings and struggles, finding someone with a compatible mindset so you can talk comfortably.
              </p>
            </div>

            {/* Box 3: Total Privacy */}
            <div id="box-privacy" className="bg-white/95 border border-brand-primary/[0.15] hover:border-brand-primary hover:shadow-[8px_8px_0px_0px_rgba(128,0,32,1)] hover:-translate-x-1.5 hover:-translate-y-1.5 rounded-[2.5rem] p-6 sm:p-10 md:p-12 flex flex-col items-start text-left transition-all duration-300 min-h-none sm:min-h-[350px] w-full">
              <div className="w-16 h-16 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex-shrink-0">
                <ShieldCheck size={26} className="text-brand-primary" />
              </div>
              <h4 className="text-2xl sm:text-3xl font-display font-light text-brand-primary tracking-wide leading-tight mb-4">
                Total Privacy
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8] text-balance">
                Everything you say is secure. Your identity is kept safe, and you are in complete control of your conversations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step by Step Timeline (No overlaps!) */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-text-muted italic flex items-center gap-2">
            <Sparkles size={14} className="text-brand-primary" /> How It Works
          </h2>
          <div className="flex-grow border-t border-brand-primary/15"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-6">
          {/* Step 1 */}
          <div className="cred-elevation p-6 md:p-8 rounded-[2rem] border border-border-base bg-bg-card transition-all duration-300 hover:border-brand-primary/40 text-left flex flex-col gap-6 h-full min-h-[320px] justify-start">
            <div className="w-12 h-12 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center text-brand-primary font-sans font-medium text-lg flex-shrink-0">
              1
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-start">
              <h4 className="text-xl sm:text-2xl font-display font-light text-brand-primary tracking-wide leading-tight mb-1">
                Talk to MayaAI
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8]">
                Share whatever is on your mind or heavy in your heart. Maya is always ready to listen to you.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="cred-elevation p-6 md:p-8 rounded-[2rem] border border-border-base bg-bg-card transition-all duration-300 hover:border-brand-primary/40 text-left flex flex-col gap-6 h-full min-h-[320px] justify-start">
            <div className="w-12 h-12 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center text-brand-primary font-sans font-medium text-lg flex-shrink-0">
              2
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-start">
              <h4 className="text-xl sm:text-2xl font-display font-light text-brand-primary tracking-wide leading-tight mb-1">
                Maya Understands
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8]">
                With psychologist-like care, Maya listens and deeply understands your worries, problems, and emotions.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="cred-elevation p-6 md:p-8 rounded-[2rem] border border-border-base bg-bg-card transition-all duration-300 hover:border-brand-primary/40 text-left flex flex-col gap-6 h-full min-h-[320px] justify-start">
            <div className="w-12 h-12 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center text-brand-primary font-sans font-medium text-lg flex-shrink-0">
              3
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-start">
              <h4 className="text-xl sm:text-2xl font-display font-light text-brand-primary tracking-wide leading-tight mb-1">
                Maya Suggests
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8]">
                Maya carefully suggests someone who is going through a similar experience or shares your mindset.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="cred-elevation p-6 md:p-8 rounded-[2rem] border border-border-base bg-bg-card transition-all duration-300 hover:border-brand-primary/40 text-left flex flex-col gap-6 h-full min-h-[320px] justify-start">
            <div className="w-12 h-12 rounded-full border border-brand-primary/10 bg-[#FAF8F5]/80 flex items-center justify-center text-brand-primary font-sans font-medium text-lg flex-shrink-0">
              4
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-start">
              <h4 className="text-xl sm:text-2xl font-display font-light text-brand-primary tracking-wide leading-tight mb-1">
                A Safe Private Space
              </h4>
              <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8]">
                Begin a private, comfortable conversation. Share your stories and rest, knowing you are heard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles We Live By (Hover feedback & perfect text-start baseline alignment) */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-text-muted italic flex items-center gap-2">
            <Shield size={14} className="text-brand-primary" /> Principles We Live By
          </h2>
          <div className="flex-grow border-t border-brand-primary/15"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-4">
          {/* Card 1 */}
          <motion.div 
            whileHover={{ 
              y: -8, 
              scale: 1.02, 
              boxShadow: "0 20px 40px rgba(128, 0, 32, 0.12)",
              borderColor: "rgba(128, 0, 32, 0.4)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="p-8 md:p-10 cred-elevation bg-bg-card border border-border-base rounded-[2rem] relative overflow-hidden text-left flex flex-col justify-start min-h-[220px] cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-2.5 h-full bg-brand-primary"></div>
            <h4 className="text-2xl font-display font-light text-brand-primary tracking-wide leading-tight">
              Genuinely Listening
            </h4>
            <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8] mt-4">
              You don't have to carry your heavy thoughts all by yourself. We are always here to listen with an open heart, without ever judging you, and always making room for whatever you feel.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            whileHover={{ 
              y: -8, 
              scale: 1.02, 
              boxShadow: "0 20px 40px rgba(128, 0, 32, 0.12)",
              borderColor: "rgba(128, 0, 32, 0.4)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="p-8 md:p-10 cred-elevation bg-bg-card border border-border-base rounded-[2rem] relative overflow-hidden text-left flex flex-col justify-start min-h-[220px] cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-2.5 h-full bg-brand-accent"></div>
            <h4 className="text-2xl font-display font-light text-brand-primary tracking-wide leading-tight">
              Better Days Together
            </h4>
            <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8] mt-4">
              Loneliness is too difficult to face by yourself. We gently bring you together with another real, warm person who truly understands your perspective, so you can share your paths and feel a little lighter.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            whileHover={{ 
              y: -8, 
              scale: 1.02, 
              boxShadow: "0 20px 40px rgba(128, 0, 32, 0.12)",
              borderColor: "rgba(128, 0, 32, 0.4)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="p-8 md:p-10 cred-elevation bg-bg-card border border-border-base rounded-[2rem] relative overflow-hidden text-left flex flex-col justify-start min-h-[220px] cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-2.5 h-full bg-[#5C0120]/40"></div>
            <h4 className="text-2xl font-display font-light text-brand-primary tracking-wide leading-tight">
              A Safe, Quiet Space
            </h4>
            <p className="font-sans font-light text-xs sm:text-sm text-text-muted leading-[1.8] mt-4">
              Your secrets, thoughts, and conversations are safely kept here. This is your personal comfort space where you can share your stories slowly, whenever you are ready, with absolute peace of mind.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Container */}
      <motion.section 
        className="cred-elevation py-16 px-8 rounded-3xl text-center bg-gradient-to-br from-bg-card to-brand-primary/5 border border-brand-primary/20 space-y-8 relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl"></div>
        
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-light text-brand-primary tracking-wide leading-tight">
          Ready to find <br className="sm:hidden" /> your safe space?
        </h2>
        
        <p className="font-sans font-light text-xs sm:text-sm md:text-base text-text-muted max-w-2xl mx-auto leading-[1.8]">
          It only takes a moment to share your burden. Let Maya listen, understand, and bring you comfort by suggesting the right person who gets you.
        </p>

        {user ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/dashboard" 
              className="btn-primary flex items-center justify-center gap-2 group w-full sm:w-auto"
            >
              <span>Go to Home</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link 
              to="/maya" 
              className="cred-clickable py-4 px-8 border border-brand-primary/30 rounded-full font-black text-xs uppercase tracking-widest text-text-base hover:bg-brand-primary/10 transition-all duration-300 w-full sm:w-auto"
            >
              Chat with Maya
            </Link>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            <Link 
              to="/auth" 
              className="btn-get-started group w-full sm:w-auto"
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default About;
