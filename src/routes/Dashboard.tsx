import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  Bell, 
  Sparkles, 
  User as UserIcon,
  Linkedin,
  Instagram
} from 'lucide-react';
import { useNavigate, Link } from '@tanstack/react-router';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Logo } from '../components/Logo';
import { getCachedProfile } from '../lib/userService';
import { createNotification, subscribeToNotifications, UserNotification, markNotificationAsRead, deleteNotification } from '../lib/notifications';
import { UserProfile, Connection } from '../types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [incomingRequests, setIncomingRequests] = useState<Connection[]>([]);
  const [activeFriends, setActiveFriends] = useState<Connection[]>([]);
  const [peerProfiles, setPeerProfiles] = useState<Record<string, UserProfile>>({});
  const [activeNotifications, setActiveNotifications] = useState<UserNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Subscriptions to notifications
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setActiveNotifications(notifs);
    });
    return unsub;
  }, [user]);

  // Subscriptions to incoming pending connection requests
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'connections'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      const conns = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      setIncomingRequests(conns);
    }, (error) => {
      console.warn("[Dashboard] Fetch pending requests restriction / rules error ignored", error);
    });
    return unsub;
  }, [user]);

  // Subscriptions to active peer connections (accepted)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', user.uid),
      where('status', '==', 'accepted')
    );
    const unsub = onSnapshot(q, (snap) => {
      const conns = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      setActiveFriends(conns);
    }, (error) => {
      console.warn("[Dashboard] Fetch accepted connections rules error ignored", error);
    });
    return unsub;
  }, [user]);

  // Handle caching profile records dynamically
  useEffect(() => {
    if (!user) return;
    const uidsToLoad = new Set<string>();
    incomingRequests.forEach(conn => {
      if (conn.initiatorId) uidsToLoad.add(conn.initiatorId);
    });
    activeFriends.forEach(conn => {
      const otherUid = conn.users.find(uid => uid !== user.uid);
      if (otherUid) uidsToLoad.add(otherUid);
    });

    uidsToLoad.forEach(async (uid) => {
      if (!peerProfiles[uid]) {
        try {
          const p = await getCachedProfile(uid);
          if (p) {
            setPeerProfiles(prev => ({ ...prev, [uid]: p }));
          }
        } catch (err) {
          console.warn(`Failed getting profile for UI list of ${uid}`, err);
        }
      }
    });
  }, [incomingRequests, activeFriends, user]);

  // Request actions
  const handleAcceptRequest = async (connId: string, initiatorId: string) => {
    if (!user) return;
    try {
      const connRef = doc(db, 'connections', connId);
      await updateDoc(connRef, {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });
      if (initiatorId) {
        await createNotification(initiatorId, {
          type: 'accept',
          text: `${profile?.displayName || 'Someone'} accepted your connection request. Tap here to start chatting!`,
          senderId: user.uid,
          senderName: profile?.displayName || 'User',
          connectionId: connId
        });
      }
    } catch (error) {
      console.error("[Dashboard] Error accepting request", error);
    }
  };

  const handleRejectRequest = async (connId: string, initiatorId: string) => {
    if (!user) return;
    try {
      const connRef = doc(db, 'connections', connId);
      await updateDoc(connRef, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      if (initiatorId) {
        await createNotification(initiatorId, {
          type: 'reject',
          text: `${profile?.displayName || 'Someone'} declined your connection request.`,
          senderId: user.uid,
          senderName: profile?.displayName || 'User',
          connectionId: connId
        });
      }
    } catch (error) {
      console.error("[Dashboard] Error rejecting request", error);
    }
  };

  const getPresenceTracker = (lastSeenStr?: string, status?: string) => {
    if (!lastSeenStr) return "OFFLINE";
    
    const lastActiveDate = new Date(lastSeenStr);
    const diffMs = Date.now() - lastActiveDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 3 || status === 'active') {
      return "ONLINE";
    }
    
    if (diffMinutes < 60) {
      return `LAST SEEN ${diffMinutes}M AGO`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `LAST SEEN ${diffHours}H AGO`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
      return "LAST SEEN YESTERDAY";
    }
    
    return `LAST SEEN ${diffDays} DAYS AGO`;
  };

  const getMoodState = (score?: number) => {
    if (score === undefined) return "FEELING OKAY";
    if (score >= 75) return "FEELING GOOD";
    if (score >= 55) return "FEELING OKAY";
    return "HAVING A HARD TIME";
  };

  const activeCount = activeFriends.length;
  const isPremium = profile?.isPremium === true;
  const limit = isPremium ? '∞' : '2';
  const limitReached = !isPremium && activeCount >= 2;
  const unreadNotifs = activeNotifications.filter(n => !n.read);
  const unreadCount = unreadNotifs.length;

  return (
    <div id="dashboard-canvas" className="min-h-screen flex flex-col bg-bg-base text-text-base relative overflow-hidden font-sans">
      
      {/* Subtle warm glow orbs in the background */}
      <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] bg-[#8B1A2F]/3 rounded-full blur-[140px] -z-10"></div>
      <div className="absolute bottom-1/4 -right-64 w-[500px] h-[500px] bg-brand-accent/3 rounded-full blur-[140px] -z-10"></div>

      <div className="global-container pt-8 pb-20 flex-grow">
        
        {/* Bento Grid Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 items-start">
          
          {/* LEFT PANEL: HEADING + REQUESTS + ACTIVE PEER DIRECTORY */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* 1. VIEW CONTROLLER HEADER & CAPABILITY ACTIONS */}
            <div id="dashboard-header" className="space-y-6 text-left">
              <div className="space-y-2">
                <span className="text-[10px] sm:text-xs font-sans font-black uppercase tracking-[0.4em] text-brand-primary italic block">
                  My Dashboard
                </span>
                
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-light text-text-base tracking-wide leading-tight text-balance block">
                  Hello, <span className="text-brand-primary italic font-medium">{profile?.displayName || 'Soul'}</span>
                </h1>
                
                <p className="text-lg sm:text-xl md:text-2xl font-sans font-light text-text-muted text-balance max-w-xl">
                  A peaceful and safe place for your mind.
                </p>
              </div>

              {/* Action Buttons Group */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {/* Chat with Maya Button */}
                <button 
                  id="btn-chat-maya"
                  onClick={() => navigate({ to: '/maya' })}
                  className="btn-get-started px-6 py-3 cursor-pointer"
                >
                  <MessageCircle size={14} className="stroke-[2.5]" />
                  <span>Chat with Maya</span>
                </button>

                {/* Bell-Notification Button with Portal Dropdown */}
                <div className="relative">
                  <button 
                    id="btn-bell-notif"
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="w-12 h-12 rounded-full border border-brand-primary/10 hover:border-[#8B1A2F]/60 flex items-center justify-center text-text-muted hover:text-text-base bg-[#FAF7F2] cursor-pointer relative shadow-[4px_4px_12px_rgba(128,0,32,0.02)] transition-all hover:scale-105"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#8B1A2F] border-2 border-[#FAF7F2] text-white text-[9px] font-mono font-medium w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifDropdown && (
                      <motion.div 
                        id="notif-dropdown"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 lg:left-auto lg:right-0 mt-3 w-80 bg-bg-card border-2 border-brand-primary/10 rounded-2xl shadow-[12px_12px_36px_rgba(128,0,32,0.08)] z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-brand-primary/10 flex justify-between items-center bg-[#FAF7F2]">
                          <span className="text-[10px] font-sans font-black uppercase tracking-widest text-[#8B1A2F]">Notifications Inbox</span>
                          {activeNotifications.length > 0 && (
                            <button 
                              onClick={() => {
                                activeNotifications.forEach(async (n) => {
                                  if (user) await deleteNotification(user.uid, n.id);
                                });
                              }}
                              className="text-[9px] font-bold text-text-muted hover:text-brand-primary uppercase tracking-widest font-sans"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-brand-primary/5">
                          {activeNotifications.length === 0 ? (
                            <div className="p-8 text-center text-xs font-sans font-bold text-text-muted uppercase tracking-widest">
                              No active pending counts
                            </div>
                          ) : (
                            activeNotifications.map(notif => (
                              <div key={notif.id} className={`p-4 text-left space-y-2 transition-colors ${notif.read ? 'bg-transparent' : 'bg-[#8B1A2F]/5'}`}>
                                <p className="text-xs font-sans text-text-base uppercase tracking-wide leading-relaxed">{notif.text}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-sans font-semibold uppercase text-text-muted">{new Date(notif.createdAt).toLocaleDateString()}</span>
                                  <div className="flex gap-2">
                                    {!notif.read && (
                                      <button 
                                        onClick={() => user && markNotificationAsRead(user.uid, notif.id)}
                                        className="text-[9px] font-sans font-black text-[#8B1A2F] hover:underline uppercase"
                                      >
                                        Mark Read
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => user && deleteNotification(user.uid, notif.id)}
                                      className="text-[9px] font-sans font-semibold text-text-muted hover:text-rose-600 uppercase"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* 2. CONNECTION REQUESTS SECTION (RECEPTIVE PANEL) - HIDE ENTIRELY IF THERE ARE NONE */}
            {incomingRequests.length > 0 && (
              <div id="dashboard-requests" className="space-y-6 text-left">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-sans font-semibold uppercase tracking-[0.3em] text-text-muted italic">
                    Requests
                  </h2>
                  <div className="flex-grow border-t border-brand-primary/10"></div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingRequests.map(conn => {
                      const peerProfile = peerProfiles[conn.initiatorId];
                      return (
                        <motion.div 
                          key={conn.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-bg-card border-2 border-brand-primary/5 rounded-2xl p-5 flex items-center justify-between shadow-[8px_8px_20px_rgba(128,0,32,0.02)]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-primary/10 bg-[#FAF7F2] flex items-center justify-center flex-shrink-0">
                              {peerProfile?.photoURL ? (
                                <img src={peerProfile.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon size={16} className="text-brand-primary/30" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-sans font-medium text-text-base">
                                {peerProfile?.displayName || 'Peer Candidate'}
                              </h4>
                              <p className="text-[10px] font-sans font-light text-[#8B1A2F] tracking-wide flex items-center gap-1 mt-0.5">
                                <span>wants to connect</span>
                                <span className="animate-ping rounded-full h-1 w-1 bg-[#8B1A2F]"></span>
                              </p>
                            </div>
                          </div>
                          
                          {/* Controls */}
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAcceptRequest(conn.id, conn.initiatorId)}
                              className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all duration-300 flex items-center justify-center border border-emerald-500/20 cursor-pointer"
                            >
                              ✓
                            </button>
                            <button 
                              onClick={() => handleRejectRequest(conn.id, conn.initiatorId)}
                              className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white transition-all duration-300 flex items-center justify-center border border-rose-500/20 cursor-pointer"
                            >
                              ✗
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}



          </div>

          {/* RIGHT SIDEBAR: LOGO + METRICS + MIND PROTOCOL */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* 4. LOGO & ACTIVITY METRICS WIDGET (SIDEBAR) */}
            <div id="activity-widget" className="cred-elevation p-6 space-y-6 relative overflow-hidden bg-bg-card">
              <div className="flex items-center gap-4">
                <Logo size={42} className="border border-brand-primary/10" />
                <div className="text-left">
                  <span className="text-[10px] font-sans font-black uppercase tracking-widest text-brand-primary">DelusionAI</span>
                  <p className="text-[8px] font-sans text-text-muted uppercase tracking-widest mt-0.5">Mindset Platform</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-display font-light text-brand-primary tracking-wide border-b border-brand-primary/10 pb-2 text-left">
                  Activity
                </h3>
                
                <div className="space-y-3 font-sans text-xs text-left">
                  {/* Chat with Maya Telemetry */}
                  <div className="flex justify-between items-center bg-[#FAF7F2] p-3 rounded-xl border-2 border-brand-primary/5 text-text-base">
                    <span className="text-text-muted">Chat with Maya</span>
                    <span className="text-[#8B1A2F] font-semibold font-mono text-[11px] tracking-wider">
                      {profile?.activityMetrics?.totalMayaTime || 0} MINS
                    </span>
                  </div>

                  {/* Chat with Friends Telemetry */}
                  <div className="flex justify-between items-center bg-[#FAF7F2] p-3 rounded-xl border-2 border-brand-primary/5 text-text-base">
                    <span className="text-text-muted">Chat with Friends</span>
                    <span className="text-[#8B1A2F] font-semibold font-mono text-[11px] tracking-wider">
                      {profile?.activityMetrics?.totalPeerTime || 0} MINS
                    </span>
                  </div>

                  {/* Mood Today Score */}
                  <div className="flex justify-between items-center bg-[#FAF7F2] p-3 rounded-xl border-2 border-[#8B1A2F]/5 text-text-base">
                    <span className="text-text-muted">My Mood Today</span>
                    <span className="text-[#8B1A2F] font-semibold font-mono text-[10px] tracking-wider">
                      {getMoodState(profile?.emotionalProfile?.moodBaseline)}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate({ to: '/profile' })}
                  className="btn-secondary w-full py-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserIcon size={12} />
                  <span>My Profile</span>
                </button>
              </div>
            </div>

            {/* 5. MIND PROTOCOL RULES WIDGET (SIDEBAR) */}
            <div id="mind-protocol-widget" className="p-6 border-2 border-brand-primary/5 rounded-3xl bg-[#FAF7F2] text-left space-y-4 shadow-[inset_4px_4px_12px_rgba(0,0,0,0.02)]">
              <h3 className="text-xl font-display font-light text-brand-primary tracking-wide text-left">
                Mind Protocol
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs font-sans text-text-muted font-medium leading-normal">
                  <span className="text-brand-primary font-black text-sm leading-none">•</span>
                  <span>Be nice to everyone.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs font-sans text-text-muted font-medium leading-normal">
                  <span className="text-brand-primary font-black text-sm leading-none">•</span>
                  <span>Keep secrets safe.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs font-sans text-text-muted font-medium leading-normal">
                  <span className="text-brand-primary font-black text-sm leading-none">•</span>
                  <span>Think before you send.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-brand-primary/10 mt-auto bg-bg-base/50 pt-8 pb-6 relative z-10">
        <div className="global-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="border-b border-brand-primary/10 pb-2 flex items-center h-[29px]">
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
              <h4 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted border-b border-brand-primary/10 pb-2">Connect</h4>
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
              <h4 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted border-b border-brand-primary/10 pb-2">Contact</h4>
              <div className="space-y-3 pt-1">
                <div className="border-l border-brand-primary/15 pl-4 py-0.5 space-y-0.5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">Inquiries</p>
                  <a href="mailto:contact.us@delusionai.in" className="text-xs font-black italic hover:text-brand-primary transition-colors text-text-base">contact.us@delusionai.in</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-brand-primary/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">
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
