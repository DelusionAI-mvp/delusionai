import React from 'react';
import { motion } from 'motion/react';
import { Shield, MessageSquare, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { UserProfile } from '../types';

interface NeuralBlueprintProps {
  profile: UserProfile;
  isMe?: boolean;
}

export const NeuralBlueprint: React.FC<NeuralBlueprintProps> = ({ profile, isMe }) => {
  // Dynamic Activity and Stability percentages calculated in real-time based on activity metrics and traits
  const totalActivityTime = (profile.activityMetrics?.totalMayaTime || 0) + (profile.activityMetrics?.totalPeerTime || 0);
  const activePercent = Math.min(100, Math.max(35, 60 + Math.min(40, totalActivityTime * 2)));
  
  const baseStability = profile.emotionalProfile?.moodBaseline || 70;
  const messageVolumeFactor = Math.min(25, (profile.messagesUsed || 0) * 3);
  const depthPercent = Math.min(100, Math.max(30, baseStability + messageVolumeFactor));

  return (
    <div className="cred-elevation p-6 sm:p-8 md:p-12 space-y-8 sm:space-y-12 relative overflow-hidden group">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-primary/5 rounded-full blur-[140px] group-hover:bg-brand-primary/10 transition-colors duration-1000"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-brand-primary/10 pb-6 sm:pb-8 md:pb-10 gap-6 sm:gap-8">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-0.5 bg-brand-primary"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-brand-primary">Your Mood Map</p>
          </div>
          <h3 className="text-3xl sm:text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-text-base leading-[0.8] mb-2">
            My <br /> Style
          </h3>
        </div>
        <div className="flex flex-col items-end gap-3">
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
        {/* Left Column: Metrics */}
        <div className="space-y-8 sm:space-y-12 md:space-y-16">
          {/* Communication Metric */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Talking Style</p>
                <h4 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter leading-none">{profile.emotionalProfile?.communicationStyle === 'balanced' ? 'Balanced' : (profile.emotionalProfile?.communicationStyle || 'Awaiting Talk')}</h4>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] mb-1">Activity</p>
                <p className="text-lg sm:text-xl font-display font-black italic">{profile.emotionalProfile ? activePercent : 0}%</p>
              </div>
            </div>
            <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden p-1 border border-brand-primary/20">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${profile.emotionalProfile ? activePercent : 0}%` }}
                className="h-full bg-gradient-to-r from-brand-primary to-brand-accent rounded-full shadow-[0_0_20px_var(--color-brand-primary)]"
              />
            </div>
          </div>

          {/* Role Metric */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Personality</p>
                <h4 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter leading-none text-brand-accent">
                  {profile.emotionalProfile?.personalityType || 'Discovery Mode'}
                </h4>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-brand-accent uppercase tracking-[0.2em] mb-1">Stability</p>
                <p className="text-lg sm:text-xl font-display font-black italic">{profile.emotionalProfile ? depthPercent : 0}%</p>
              </div>
            </div>
            <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden p-1 border border-brand-accent/20">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${profile.emotionalProfile ? depthPercent : 0}%` }}
                className="h-full bg-gradient-to-r from-brand-accent to-red-400 rounded-full shadow-[0_0_20px_var(--color-brand-accent)]"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="pt-6 sm:pt-8 md:pt-10 border-t border-brand-primary/10">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted mb-6 sm:mb-8">Tags</p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center justify-start">
              {profile.emotionalProfile?.moodKeywords && profile.emotionalProfile.moodKeywords.length > 0 ? (
                profile.emotionalProfile.moodKeywords.map((tag: string) => (
                  <div key={tag} className="group/tag relative flex-shrink-0">
                    <span className="relative z-10 block px-4 py-2 sm:px-5 sm:py-2.5 bg-bg-base border border-brand-primary/20 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] italic transition-all hover:-translate-y-0.5 hover:border-brand-primary hover:text-brand-primary hover:shadow-[0_8px_16px_rgba(128,0,32,0.15)] whitespace-nowrap">
                      {tag.replace('_', ' ')}
                    </span>
                    <div className="absolute inset-0 bg-brand-primary opacity-0 group-hover/tag:opacity-5 blur-xl transition-opacity"></div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">No deep analysis yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis & Secondary Data */}
        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          <div className="cred-elevation p-6 sm:p-8 md:p-10 bg-black/5 space-y-6 sm:space-y-8 border-l-4 border-l-brand-primary relative group/card">
            <div className="flex items-center gap-4 text-brand-primary">
              <div className="relative">
                <MessageSquare size={24} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full animate-ping"></div>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.5em]">Maya's Insight</p>
            </div>
            <div className="text-xs sm:text-sm font-bold leading-relaxed italic text-text-muted uppercase tracking-[0.08em] border-l border-brand-primary/20 pl-4 sm:pl-6">
              {profile.emotionalProfile?.needs || "Talk to me so I can learn about your journey and find people who resonate with your frequency."}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            <div className="cred-inset p-6 sm:p-8 space-y-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors col-span-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-60">Status</p>
              <p className="text-xl sm:text-2xl font-display font-black italic text-text-base">{profile.emotionalProfile ? 'Analyzed' : 'New Soul'}</p>
            </div>
          </div>


          {!isMe && (
            <div className="p-6 sm:p-8 border border-dashed border-brand-primary/20 flex items-center justify-between group/link cursor-default overflow-hidden relative">
              <div className="space-y-1 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Friend Match</p>
                <p className="text-lg sm:text-xl font-black italic uppercase">Great Match!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
