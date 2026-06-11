 import React from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Zap, Clock, MessageSquare, Users, LogOut, ArrowRight, ShieldCheck, Check, Sparkles, X, Camera } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { NeuralBlueprint } from '../components/NeuralBlueprint';
import { Logo } from '../components/Logo';
import { TransactionOverlay } from '../components/TransactionOverlay';

export default function ProfilePage() {
  const { user, profile, setProfile, connectionError } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [activeConnectionsCount, setActiveConnectionsCount] = React.useState(0);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  // States for user editable "My Story"
  const [isEditingStory, setIsEditingStory] = React.useState(false);
  const [storyDraft, setStoryDraft] = React.useState('');
  const [isSavingStory, setIsSavingStory] = React.useState(false);
  const [storyStatusMsg, setStoryStatusMsg] = React.useState<string | null>(null);

  // Sync draft edit buffer on load or profile sync
  React.useEffect(() => {
    if (profile && !isEditingStory) {
      setStoryDraft(profile.userMemorySummary || '');
    }
  }, [profile?.userMemorySummary, isEditingStory]);

  const handleSaveStory = async () => {
    if (!user) return;
    setIsSavingStory(true);
    setStoryStatusMsg(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        userMemorySummary: storyDraft 
      });
      
      if (setProfile) {
        setProfile(prev => prev ? { ...prev, userMemorySummary: storyDraft } : null);
      }
      
      setStoryStatusMsg("Story saved successfully!");
      setIsEditingStory(false);
      setTimeout(() => setStoryStatusMsg(null), 3000);
    } catch (err) {
      console.error("Failed to update story:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setStoryStatusMsg("Failed to save story");
      setTimeout(() => setStoryStatusMsg(null), 3500);
    } finally {
      setIsSavingStory(false);
    }
  };

  // Simulated upgrade states
  const [isProcessingUpgrade, setIsProcessingUpgrade] = React.useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    setIsProcessingUpgrade(true);
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          isPremium: true,
          messagesUsed: 0,
          cooldownEnd: null
        });
      } catch (err) {
        console.error("Failed to upgrade in profile:", err);
      } finally {
        setIsProcessingUpgrade(false);
      }
    }, 4200);
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 850000) {
      setUploadStatus("Error: Image must be under 800 KB");
      setTimeout(() => setUploadStatus(null), 6000);
      return;
    }

    setUploadStatus("Processing...");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL: base64String });
        setUploadStatus("Sucessfully Updated!");
        setTimeout(() => setUploadStatus(null), 3500);
      } catch (err) {
        console.error("Failed to upload image:", err);
        setUploadStatus("Upload Failed");
        setTimeout(() => setUploadStatus(null), 3500);
      }
    };
    reader.onerror = () => {
      setUploadStatus("Reader Error");
      setTimeout(() => setUploadStatus(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', user.uid),
      where('status', '==', 'accepted')
    );
    const unsub = onSnapshot(q, (snap) => {
      const active = snap.docs.filter(d => {
        const data = d.data() as any;
        return data.status === 'accepted' && (!data.removedBy || data.removedBy.length === 0);
      });
      setActiveConnectionsCount(active.length);
    }, (error) => {
      // Handled by global logger with state check
      console.warn("Profile connection stats update failed", error);
    });
    return unsub;
  }, [user]);

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-screen">
        <Logo className={connectionError ? 'text-red-500' : 'animate-pulse text-brand-primary'} size={60} />
        {connectionError ? (
          <div className="mt-8 text-center space-y-4">
             <p className="text-sm font-black uppercase tracking-widest text-red-500">{connectionError}</p>
             <button onClick={() => window.location.reload()} className="btn-secondary text-[10px]">Retry</button>
          </div>
        ) : (
          <p className="mt-8 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-brand-primary animate-pulse">Synchronizing Profile...</p>
        )}
      </div>
    );
  }

  return (
    <div className="page-base global-container section-gap pt-4 md:pt-6">
      <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16 cred-elevation p-10 sm:p-12 md:p-20 relative overflow-hidden backdrop-blur-xl border-brand-primary/10">
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-brand-primary/5 rounded-full blur-[80px] md:blur-[100px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-48 md:w-64 h-48 md:h-64 bg-brand-accent/5 rounded-full blur-[60px] md:blur-[80px] -z-10 animate-pulse delay-700"></div>
        
        <div className="flex flex-col items-center gap-5 flex-shrink-0">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 cred-inset rounded-full flex items-center justify-center border-4 border-brand-primary/20 p-2 group overflow-hidden relative cursor-pointer hover:border-brand-primary/40 active:scale-95 transition-all"
            title="Click to change photo"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 via-transparent to-brand-accent/20 animate-spin-slow opacity-20"></div>
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-bg-card border-2 border-brand-primary/10 relative z-10 transition-transform duration-700 group-hover:scale-105">
              {profile.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  className="w-full h-full object-cover" 
                  alt={profile.displayName} 
                />
              ) : (
                <User size={40} className="sm:size-[60px] md:size-[80px] text-brand-primary/30" />
              )}
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer group flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary/[0.04] border border-brand-primary/15 hover:bg-brand-primary/10 hover:border-brand-primary/30 transition-all font-mono font-black text-xs uppercase tracking-widest text-brand-primary rounded-full min-h-[44px] active:scale-95"
          >
            <Camera size={14} className="text-brand-primary" />
            <span>Change Photo</span>
          </button>

          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleProfilePictureUpload} 
          />
          
          {uploadStatus && (
            <p className={`text-[11px] font-black uppercase tracking-widest leading-none ${uploadStatus.includes('Error') || uploadStatus.includes('Failed') ? 'text-red-500 animate-shake' : 'text-brand-accent animate-pulse'}`}>
              {uploadStatus}
            </p>
          )}
        </div>

        <div className="text-center md:text-left space-y-4 sm:space-y-6 md:space-y-8 flex-1 w-full overflow-hidden">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-black uppercase italic tracking-tighter leading-none text-text-base drop-shadow-2xl break-words">
              {profile.displayName}
            </h1>
            <p className="text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-primary italic opacity-60 truncate max-w-[200px] sm:max-w-xs md:max-w-none mx-auto md:mx-0">
              Verified Soul // {user?.email}
            </p>
          </div>

          {/* Real-time Journey Narrative summarized dynamically by Maya, now user-editable */}
          {!isEditingStory ? (
            <div className="cred-inset p-5 md:p-6 bg-white/[0.01] border-brand-primary/10 max-w-2.5xl space-y-3 relative group transition-all duration-300 hover:border-brand-primary/30">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-primary/60">My Story</p>
                <button
                  type="button"
                  onClick={() => {
                    setStoryDraft(profile.userMemorySummary || "");
                    setIsEditingStory(true);
                  }}
                  className="cursor-pointer flex items-center justify-center px-4 py-1.5 bg-brand-primary/[0.04] border border-brand-primary/15 hover:bg-brand-primary/10 hover:border-brand-primary/30 transition-all font-mono font-bold text-[10px] uppercase tracking-wider text-brand-primary rounded-full min-h-[28px]"
                  title="Write My Story"
                >
                  <span>Edit Story</span>
                </button>
              </div>
              <p className="text-xs font-bold leading-relaxed italic text-text-muted uppercase tracking-[0.05em] whitespace-pre-wrap">
                {profile.userMemorySummary || "Deeply reflecting, exploring support avenues, and conversing with Maya to unfold a unique soul narrative. Syncing with matching models in real-time."}
              </p>
              {storyStatusMsg && (
                <p className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-accent animate-pulse">
                  {storyStatusMsg}
                </p>
              )}
            </div>
          ) : (
            <div className="cred-inset p-5 md:p-6 bg-bg-card border-brand-primary/20 max-w-2.5xl space-y-4 relative transition-all duration-300 shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-primary">
                  Writing My Story...
                </p>
                <span className="text-[9px] font-mono text-text-muted/50 lowercase tracking-wider">
                  {storyDraft.length} / 1000 characters
                </span>
              </div>

              <div className="relative">
                <textarea
                  value={storyDraft}
                  onChange={(e) => setStoryDraft(e.target.value.slice(0, 1000))}
                  placeholder="Write your story here... Convey your feelings, experiences, and journey."
                  rows={4}
                  className="w-full bg-[#FAF7F2] border border-brand-primary/10 hover:border-brand-primary/20 focus:border-brand-primary/50 focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded-xl p-4 text-xs font-mono tracking-wide leading-relaxed text-text-base focus:outline-none transition-all resize-none shadow-[inset_0_2px_8px_rgba(128,0,32,0.02)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {storyStatusMsg && (
                    <p className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand-accent animate-pulse">
                      {storyStatusMsg}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingStory(false)}
                    disabled={isSavingStory}
                    className="px-3 py-1.5 border border-brand-primary/10 hover:border-brand-primary/30 text-text-muted hover:text-text-base rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[30px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStory}
                    disabled={isSavingStory}
                    className="px-4 py-1.5 bg-brand-primary hover:bg-[#A3002E] disabled:opacity-50 text-white rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center transition-all shadow-[0_2px_10px_rgba(128,0,32,0.1)] cursor-pointer min-h-[30px]"
                  >
                    {isSavingStory ? "Saving..." : "Save Story"}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 md:gap-6">
            <div className={`flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 cred-elevation border-2 transition-all duration-500 scale-95 hover:scale-100 ${profile.isPremium ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-[0_0_20px_rgba(255,215,0,0.1)]' : 'border-brand-primary/10 text-brand-primary/50'}`}>
              <Zap size={12} className={profile.isPremium ? 'animate-pulse' : ''} />
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">
                {profile.isPremium ? 'PRO MEMBER' : 'BASIC MEMBER'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 cred-inset text-[10px] md:text-[11px] font-black uppercase tracking-widest text-text-muted border-brand-primary/5">
              <Clock size={12} /> {new Date(profile.createdAt || Date.now()).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12">
        <div className="lg:col-span-8 space-y-10 md:space-y-12">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
             <div className="cred-elevation p-6 md:p-8 space-y-4 md:space-y-6 group hover:border-brand-primary transition-all">
                <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-brand-primary flex items-center gap-2">
                  <span className="w-2 h-2 bg-brand-primary rounded-full"></span> 
                  Mood Level
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-3xl md:text-4xl font-black italic">{profile.emotionalProfile?.moodBaseline || 0}%</h4>
                  <span className="text-[11px] font-black uppercase text-text-muted">Score</span>
                </div>
                <div className="h-1 cred-inset overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${profile.emotionalProfile?.moodBaseline || 0}%` }}
                     transition={{ duration: 1.5, ease: "circOut" }}
                     className="h-full bg-brand-primary"
                   />
                </div>
             </div>

             <div className="cred-elevation p-6 md:p-8 space-y-4 md:space-y-6 group hover:border-brand-accent transition-all">
                <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-brand-accent flex items-center gap-2">
                  <span className="w-2 h-2 bg-brand-accent rounded-full"></span> 
                  Friend Limit
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-3xl md:text-4xl font-black italic">{activeConnectionsCount}/{profile.isPremium ? '∞' : '2'}</h4>
                  <span className="text-[11px] font-black uppercase text-text-muted">Friends</span>
                </div>
                <div className="h-1 cred-inset overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${profile.isPremium ? 100 : (activeConnectionsCount * 50)}%` }}
                     transition={{ duration: 1.5, ease: "circOut" }}
                     className="h-full bg-brand-accent shadow-[0_0_10px_var(--color-brand-accent)]"
                   />
                </div>
             </div>

             <div className="cred-elevation p-6 md:p-8 space-y-4 md:space-y-6 group hover:border-white transition-all">
                <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-text-base flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> 
                  My Age
                </p>
                <h4 className="text-3xl md:text-4xl font-black italic">{Array.isArray(profile.age) ? profile.age[0] : (profile.age || 'N/A')}</h4>
                <p className="text-[11px] font-black uppercase text-text-muted tracking-widest">Age Range</p>
             </div>
          </div>

          {/* Emotional Map/Neural Blueprint */}
          <NeuralBlueprint profile={profile} isMe={true} />
        </div>

        <aside className="lg:col-span-4 space-y-10 md:space-y-12">
          <div className="cred-elevation p-8 md:p-10 space-y-6 md:space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted border-b border-brand-primary/10 pb-4 flex items-center gap-3">
              <Zap size={14} className="text-brand-primary" /> My Stats
            </h3>
            <div className="space-y-6 md:space-y-8">
               <div className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-[11px] md:text-xs font-black uppercase tracking-widest text-text-muted group-hover:text-brand-primary transition-colors">Talk time with Maya</p>
                    <p className="text-lg md:text-xl font-black italic">{profile.activityMetrics?.totalMayaTime || 0}<span className="text-[11px] lowercase ml-1 opacity-40">minutes</span></p>
                  </div>
                  <MessageSquare size={20} className="text-brand-primary/20 group-hover:text-brand-primary transition-all" />
               </div>
               <div className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-[11px] md:text-xs font-black uppercase tracking-widest text-text-muted group-hover:text-brand-accent transition-colors">Talk time with friends</p>
                    <p className="text-lg md:text-xl font-black italic">{profile.activityMetrics?.totalPeerTime || 0}<span className="text-[11px] lowercase ml-1 opacity-40">minutes</span></p>
                  </div>
                  <Users size={20} className="text-brand-accent/20 group-hover:text-brand-accent transition-all" />
               </div>
            </div>
          </div>



          <div className="cred-inset p-8 md:p-10 space-y-6 md:space-y-8 border-brand-primary/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Account</h3>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-between group p-4 md:p-6 btn-logout-round border-brand-primary/5 hover:border-white/50 bg-bg-card transition-all duration-500"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <LogOut size={16} className="text-text-muted group-hover:text-text-base transition-colors" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-text-base transition-colors">LOGOUT</p>
                  <p className="text-[8px] font-bold text-text-muted/60 group-hover:text-text-muted uppercase transition-colors">Exit account</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:text-text-base opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
            </button>
          </div>
        </aside>
      </div>

      {/* Premium Velvet Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-bg-base/70 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-card border-2 border-brand-primary/20 max-w-sm w-full p-8 rounded-[2rem] space-y-6 text-center shadow-[15px_15px_60px_rgba(128,0,32,0.15)] pointer-events-auto"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary mb-2 border border-brand-primary/15 animate-pulse">
                <LogOut size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-black uppercase italic text-text-base">
                  A Temporary Pause?
                </h3>
                <p className="font-sans text-[10px] text-text-muted leading-relaxed uppercase tracking-wider">
                  Are you sure you want to end your current deep connection session?
                </p>
              </div>
              <div className="flex gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-secondary flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-base hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all border border-brand-primary/10 rounded-xl"
                >
                  No, Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    auth.signOut();
                  }}
                  className="btn-primary flex-1 py-3 bg-brand-primary hover:bg-[#A3002E] text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-xl"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TransactionOverlay 
        isVisible={isProcessingUpgrade} 
        type="premium_upgrade"
      />
    </div>
  );
}
