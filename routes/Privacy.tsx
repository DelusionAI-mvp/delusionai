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
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">2. Google User Data Policy and Disclosures</h2>
              <p className="text-[11px] md:text-sm">
                In compliance with the Google API Services User Data Policy and Google APIs Terms of Service, we thoroughly document how our application interacts with Google user data acquired through Google Sign-In.
              </p>
              <div className="space-y-3 bg-brand-primary/[0.02] p-4 rounded-xl border border-brand-primary/10">
                <p className="text-[11px] md:text-sm font-bold text-brand-primary uppercase tracking-wider">A) Specific Google User Data Accessed & Collected</p>
                <p className="text-[11px] md:text-sm">
                  We request and collect the following specific user identity parameters from your joined Google account:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-[11px] md:text-sm">
                  <li>Your authenticated Google Email Address</li>
                  <li>Your Display Name and Full Name</li>
                  <li>Your Profile Photo / Avatar URL</li>
                  <li>Your unique secret authenticated Google User Identifier (UID)</li>
                </ul>
              </div>

              <div className="space-y-3 bg-brand-primary/[0.02] p-4 rounded-xl border border-brand-primary/10">
                <p className="text-[11px] md:text-sm font-bold text-brand-primary uppercase tracking-wider">B) Purpose & Detailed Data Usage</p>
                <p className="text-[11px] md:text-sm">
                  The Google user data we obtain is utilized strictly to provide, protect, and optimize your personal companion and chatbot experience within DelusionAI:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-[11px] md:text-sm">
                  <li><strong>Account Onboarding & Authentication:</strong> Your authenticated email and Google ID are processed by Google Firebase Auth to create your unique database reference and verify secure login sessions safely across devices.</li>
                  <li><strong>Custom Report Delivery:</strong> We use your Google email address to deliver your personalized, custom-compiled "Oasis Discovery Reflection Report" (meticulously analyzed by Maya during your companion chat session) directly to your inbox using our secure email relays.</li>
                  <li><strong>Dashboard Aesthetics:</strong> Your display name and profile picture URL are loaded locally dynamically to construct your interactive peer-matching dashboard and welcome your presence in the chats.</li>
                </ul>
              </div>

              <div className="space-y-3 bg-brand-primary/[0.02] p-4 rounded-xl border border-brand-primary/10">
                <p className="text-[11px] md:text-sm font-bold text-brand-primary uppercase tracking-wider">C) Secure Storage, Sharing, and Protection</p>
                <p className="text-[11px] md:text-sm">
                  Your Google user data is securely stored within our hosted Google Firebase/Firestore cloud database infrastructure in strict isolation.
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-[11px] md:text-sm">
                  <li><strong>Absolute Privacy Guarantee:</strong> We <strong>NEVER</strong> rent, sell, monetize, or share your Google user data with third-party advertisers, data brokers, or external marketing entities.</li>
                  <li><strong>Third-Party Processing:</strong> The only third parties involved in handling any aspect of this data are Google (as our database cloud hosting and authentication processor) and secure e-mail dispatch systems (Resend) when you explicitly opt to receive the emotional reports in your mailbox.</li>
                  <li><strong>Data Minimization and Controls:</strong> You retain complete master control. You can request immediate, total deletion of all associated Google user records, chat logs, and profile info at any time from your portal.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">3. The Scope of Synthesis</h2>
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
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">4. Data Retention and Deletion</h2>
              <p className="text-[11px] md:text-sm">
                Maya AI conversations are purged every 24 hours to maintain neural clarity, though synthesized insights are persisted in your Emotional Profile until account termination. Connection history is stored until manually severed by either party or upon account deletion.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">5. Third-Party Integrations</h2>
              <p className="text-[11px] md:text-sm">
                We utilize Google Firebase for secure data storage and Gemini AI (Google) for emotional synthesis. These entities act as Data Processors. We do not share your individual identifying data with advertisers.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-text-base italic border-b border-black/5 pb-4">6. Disclaimer of Liability</h2>
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
