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
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">4. Google User Data Disclosures</h2>
              <p className="text-[11px] md:text-sm">
                When you authenticate with your Google Account, our application accesses specific categories of Google user data in strict compliance with the Google API Services User Data Policy, including the Limited Use requirements:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[11px] md:text-sm">
                <li>
                  <strong>Google Data Accessed:</strong> We access your primary Google email address (via the <code className="bg-black/5 px-1 rounded font-mono text-[10px]">email</code> scope) and basic public profile information, including your name and profile photo URL (via the <code className="bg-black/5 px-1 rounded font-mono text-[10px]">profile</code> and <code className="bg-black/5 px-1 rounded font-mono text-[10px]">openid</code> scopes).
                </li>
                <li>
                  <strong>Purpose of Usage:</strong>
                  <ul className="list-disc pl-6 mt-1 space-y-1">
                    <li>We use your Google email address to uniquely identify and establish your user account, authenticate secure login sessions, and automatically deliver your requested Oasis Discovery Reports directly to your inbox.</li>
                    <li>We use your name and profile photo to customize and personalize your individual companion dashboard, greeting details, and AI chat simulations (with the virtual keeper Maya).</li>
                  </ul>
                </li>
                <li>
                  <strong>Data Storage & Safety:</strong> Your credentials and metadata are stored securely using industry-standard encryption within Google Firebase Authentication and Cloud Firestore.
                </li>
                <li>
                  <strong>Data Sharing & Restrictions:</strong> We do not sell, rent, disclose, or trade your Google user data to any third-party marketing networks, advertising bureaus, or data brokers. It is shared strictly with secure processors (such as EmailJS or Resend) solely to compile and dispatch reports that you explicitly request. Your Google user data is never used to train artificial intelligence or machine learning models.
                </li>
              </ul>
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
