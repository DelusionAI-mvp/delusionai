import React from 'react';
import { motion } from 'motion/react';
import { FileText, Gavel, AlertCircle, ChevronLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function Terms() {
  return (
    <div className="page-base pt-4 md:pt-6">
      <div className="global-container space-y-12 md:space-y-20">
        <Link to="/" className="inline-flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-colors mb-8 md:mb-12">
          <ChevronLeft size={14} /> Back Home
        </Link>

        <header className="space-y-4 md:space-y-6">
          <div className="w-12 h-12 md:w-16 md:h-16 cred-elevation flex items-center justify-center text-brand-primary">
            <Gavel size={24} className="md:size-[32px]" />
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase italic tracking-tighter leading-none">Terms of<br/>Service</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Updated: 2026</p>
        </header>

        <section className="space-y-8 md:space-y-12">
          <div className="prose prose-sm max-w-none text-text-muted leading-relaxed space-y-6 md:space-y-8 italic font-medium">
            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">1. Using our App</h2>
              <p className="text-[11px] md:text-sm">
                By using DelusionAI, you agree to these terms. If you do not agree, please stop using the app and delete your account.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">2. Our Responsibility</h2>
              <p className="text-[11px] md:text-sm">
                We are not responsible for what other users say or do on this app.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[11px] md:text-sm">
                <li>Talking with Others: We help you connect, but we don't check every user. You are responsible for your interactions with others.</li>
                <li>Maya AI: Maya is an AI and can make mistakes. Its words are NOT medical or professional advice.</li>
                <li>Links: We are not responsible for websites linked by other users.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">3. Prohibited Conduct and System Integrity</h2>
              <p className="text-[11px] md:text-sm">
                Users are strictly forbidden from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[11px] md:text-sm">
                <li>Automated Scraping: Using bots to extract Emotional Profiles or PII.</li>
                <li>Impersonation: Representing oneself as another individual or a DelusionAI employee.</li>
                <li>Neural Manipulation: Using the platform to harvest vulnerability for psychological profiling outside of the app's intent.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">4. Indemnification</h2>
              <p className="text-[11px] md:text-sm">
                The User agrees to indemnify, defend, and hold harmless the Company from any third-party claims, damages, or costs (including legal fees) arising from the User's breach of these terms or misuse of the platform's social features.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">5. Governing Law and Severability</h2>
              <p className="text-[11px] md:text-sm">
                These terms are governed by the laws of the digital infrastructure's primary hosting region. If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </div>

            <div className="space-y-4 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] bg-red-500/5 p-6 md:p-8 border-l-4 border-red-500 italic leading-loose">
              NOTICE: DELUSIONAI IS NOT FOR CRISIS HELP. IF YOU ARE HAVING AN EMERGENCY, PLEASE CALL EMERGENCY SERVICES RIGHT AWAY.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
