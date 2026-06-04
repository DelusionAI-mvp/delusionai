import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, FileText, ChevronLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function Privacy() {
  return (
    <div className="page-base pt-4 md:pt-6">
      <div className="global-container space-y-12 md:space-y-20">
        <Link to="/" className="inline-flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-colors mb-8 md:mb-12">
          <ChevronLeft size={14} /> Back to Nexus
        </Link>

        <header className="space-y-4 md:space-y-6">
          <div className="w-12 h-12 md:w-16 md:h-16 cred-elevation flex items-center justify-center text-brand-primary">
            <Lock size={24} className="md:size-[32px]" />
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase italic tracking-tighter leading-none">Privacy<br/>Directive</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Effective Neural Cycle: 2026.05.13</p>
        </header>

        <section className="space-y-8 md:space-y-12">
          <div className="prose prose-sm max-w-none text-text-muted leading-relaxed space-y-6 md:space-y-8 italic font-medium">
            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">1. Data Controller and Compliance</h2>
              <p className="text-[11px] md:text-sm">
                DelusionAI (hereinafter "the Company", "We", "Us") operates as a Data Controller under global data protection frameworks including GDPR (EU) and relevant local digital acts. We take the stewardship of your emotional and personal data with absolute gravity.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">2. The Scope of Synthesis</h2>
              <p className="text-[11px] md:text-sm">
                When you initialize a profile, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[11px] md:text-sm">
                <li>Identity Markers: Name, email address, and authenticated identifiers.</li>
                <li>Emotional Metadata: Responses to onboarding protocols and chat logs with Maya AI.</li>
                <li>Network Interaction: Timestamps of peer connections, message status (sent/delivered/seen), and active status.</li>
                <li>Device Telemetry: IP addresses and browser fingerprints used for security and fraud prevention.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">3. Data Retention and Deletion</h2>
              <p className="text-[11px] md:text-sm">
                Maya AI conversations are purged every 24 hours to maintain neural clarity, though synthesized insights are persisted in your Emotional Profile until account termination. Connection history is stored until manually severed by either party or upon account deletion.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">4. Third-Party Integrations</h2>
              <p className="text-[11px] md:text-sm">
                We utilize Google Firebase for secure data storage and Gemini AI (Google) for emotional synthesis. These entities act as Data Processors. We do not share your individual identifying data with advertisers.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">5. Disclaimer of Liability</h2>
              <p className="text-[11px] md:text-sm">
                The Company is not liable for data leaks originating from compromised user devices or unauthorized access to user-managed authentication tokens. We provide the platform "as-is" without warranty of continuous neural link stability.
              </p>
            </div>

            <div className="space-y-4 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] bg-black/5 p-6 md:p-8 border-l-4 border-brand-primary leading-loose">
              GOVERNANCE: By using this platform, you waive the right to class-action litigation against DelusionAI. All disputes shall be resolved through binding arbitration in the jurisdiction of the Company's choosing.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
