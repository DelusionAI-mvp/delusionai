import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  Users, 
  Bell, 
  Sparkles, 
  Heart, 
  ArrowRight,
  UserPlus,
  Check,
  X,
  Trash2,
  Linkedin,
  Instagram
} from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { getCachedProfile } from '../lib/userService';
import { Connection, UserProfile } from '../types';
import { Logo } from '../components/Logo';
import { TransactionOverlay } from '../components/TransactionOverlay';
import { AboutSection } from '../components/AboutSection';
import { createNotification, subscribeToNotifications, markNotificationAsRead, deleteNotification, UserNotification } from '../lib/notifications';
import { CinematicConnection } from '../components/CinematicConnection';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem = ({ notification, onAccept, onReject }: any) => {
  const [sender, setSender] = useState<any>(null);

  useEffect(() => {
    const fetchSender = async () => {
      const data = await getCachedProfile(notification.initiatorId);
      if (data) setSender(data);
    };
    fetchSender();
  }, [notification]);

  return (
      <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cred-elevation p-6 sm:p-8 flex items-center justify-between gap-4 md:gap-8 hover:border-brand-primary transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
      <div className="flex items-center gap-4 md:gap-8">
        <div className="w-16 h-16 md:w-20 md:h-20 cred-inset bg-bg-base flex items-center justify-center relative overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-700">
          {sender?.photoURL ? <img src={sender.photoURL} className="w-full h-full object-cover" alt="" /> : <Users size={24} className="text-brand-primary/20" />}
        </div>
        <div>
          <h4 className="font-display text-xl md:text-2xl font-black uppercase italic tracking-tighter text-text-base">{sender?.displayName || 'Loading...'}</h4>
          <p className="text-[8px] md:text-[9px] text-brand-primary font-black uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={10} className="animate-pulse" /> Connection Request
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:gap-4">
        <button 
          onClick={onReject}
          className="w-10 h-10 sm:w-12 sm:h-12 cred-inset flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all"
        >
          <X size={18} />
        </button>
        <button 
          onClick={onAccept}
          className="w-10 h-10 sm:w-12 sm:h-12 btn-primary flex items-center justify-center p-0"
        >
          <Check size={18} />
        </button>
      </div>
    </motion.div>
  );
};

const ConnectionCard = ({ connection, currentUserId, onRemove }: { connection: Connection, currentUserId: string, onRemove: (name: string) => void }) => {
  const otherUserId = connection.users.find(uid => uid !== currentUserId);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (otherUserId) {
      const fetchUser = async () => {
        const data = await getCachedProfile(otherUserId);
        if (data) setOtherUser(data);
      };
      fetchUser();
    }
  }, [otherUserId]);

  const isOtherUserRemoved = connection.removedBy?.includes(otherUserId || '');

  let isOnlineFlag = false;
  if (!isOtherUserRemoved && otherUser && otherUser.status === 'active') {
    const lastActiveStr = otherUser.activityMetrics?.lastActive || otherUser.lastSeen;
    if (lastActiveStr) {
      isOnlineFlag = (Date.now() - new Date(lastActiveStr).getTime()) < 180000;
    }
  }

  const getPresenceText = () => {
    if (isOtherUserRemoved) return 'DISCONNECTED';
    if (!otherUser) return 'LOADING...';
    if (isOnlineFlag) return 'ONLINE';
    
    const lastActiveStr = otherUser.activityMetrics?.lastActive || otherUser.lastSeen;
    if (!lastActiveStr) return 'OFFLINE';
    
    try {
      const lastActiveDate = new Date(lastActiveStr);
      const diffMs = Date.now() - lastActiveDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'ONLINE';
      if (diffMins < 60) return `LAST SEEN ${diffMins}m AGO`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `LAST SEEN ${diffHours}h AGO`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'LAST SEEN YESTERDAY';
      
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `LAST SEEN ${lastActiveDate.toLocaleDateString('en-US', options)}`.toUpperCase();
    } catch (e) {
      return 'OFFLINE';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full relative group"
    >
      <Link 
        to={`/chat/${connection.id}`}
        className="cred-elevation p-6 sm:p-10 flex items-center justify-between hover:border-brand-primary transition-all group w-full block"
      >
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-24 sm:h-24 cred-inset bg-bg-base flex items-center justify-center overflow-hidden">
              {otherUser?.photoURL && !isOtherUserRemoved ? <img src={otherUser.photoURL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" alt="" /> : <Users size={24} className="text-brand-primary/10" />}
            </div>
            {!isOtherUserRemoved && isOnlineFlag && (
              <div id={`active-indicator-${otherUserId}`} className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse z-20 shadow-[0_2px_8px_rgba(34,197,94,0.4)]"></div>
            )}
          </div>
          <div>
            <h4 className="font-display text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-text-base group-hover:text-brand-primary transition-colors">
              {isOtherUserRemoved ? 'Removed User' : (otherUser?.displayName || 'Loading...')}
            </h4>
            <p className="text-[10px] sm:text-xs text-brand-primary font-black uppercase tracking-widest opacity-60">
              {getPresenceText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <ArrowRight size={20} className="text-brand-primary/20 group-hover:text-brand-primary group-hover:translate-x-2 transition-all mr-2" />
        </div>
      </Link>
    </motion.div>
  );
};

const BellNotificationItem = ({ notif, onMarkRead, onDelete, onRedirect }: {
  notif: UserNotification;
  onMarkRead: () => void;
  onDelete: () => void;
  onRedirect: () => void;
}) => {
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!notif.senderId) return;
    const fetchSender = async () => {
      const p = await getCachedProfile(notif.senderId!);
      if (p) setSenderProfile(p);
    };
    fetchSender();
  }, [notif.senderId]);

  return (
    <div 
      className={`pb-4 border-b border-brand-accent/15 last:border-0 flex items-start justify-between gap-4 relative transition-all duration-300 text-left ${notif.read ? 'opacity-55' : 'opacity-100'}`}
    >
      <div className="flex-1 flex gap-3 cursor-pointer items-start" onClick={onRedirect}>
        {/* Profile Picture or Initials avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-brand-primary/20 flex items-center justify-center bg-bg-card relative">
          {senderProfile?.photoURL ? (
            <img src={senderProfile.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-brand-primary font-display text-sm font-black uppercase italic">
              {(notif.senderName || 'A')[0]}
            </div>
          )}
          {/* Pulsing indicator for unread */}
          {!notif.read && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-brand-accent rounded-full border border-bg-card animate-pulse" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-light leading-relaxed text-text-base hover:text-brand-primary transition-colors">
            <span className="font-bold">{notif.senderName || 'Someone'}</span> {notif.text.replace(notif.senderName || 'Someone', '').trim()}
          </p>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
              notif.type === 'request' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' :
              notif.type === 'accept' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
              notif.type === 'reject' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
              'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
            }`}>
              {notif.type || 'message'}
            </span>
            <p className="text-[10px] font-sans font-medium text-text-muted uppercase tracking-widest whitespace-nowrap">
              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
        {!notif.read && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            className="w-5 h-5 rounded-full border border-brand-primary/15 bg-bg-card text-brand-primary hover:bg-brand-primary/20 hover:text-brand-primary transition-all flex items-center justify-center"
            title="Mark read"
          >
            <Check size={9} />
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-5 h-5 rounded-full border border-red-200 bg-bg-card text-red-500 hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center"
          title="Delete"
        >
          <X size={9} />
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, profile, loading, triggerBordeaux } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Connecting...');

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [targetConn, setTargetConn] = useState<{id: string, name: string} | null>(null);
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionMatch, setTransitionMatch] = useState<UserProfile | null>(null);


  useEffect(() => {
    if (!profile || !user) return;
    
    const now = new Date();
    const lastResetStr = profile.activityMetrics?.lastDailyResetAt;
    const isNewDay = !lastResetStr || new Date(lastResetStr).toDateString() !== now.toDateString();

    // If it's a new calendar day, reset daily metrics
    if (isNewDay) {
      const RESET_KEY = `delusion_reset_${user.uid}_${now.toDateString().replace(/\s/g, '_')}`;
      if (!localStorage.getItem(RESET_KEY)) {
        localStorage.setItem(RESET_KEY, 'true');
        
        const performDailyResetSync = async () => {
          try {
            // 1. Reset user activity metrics and counters in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
              messagesUsed: 0,
              cooldownEnd: null,
              'activityMetrics.totalMayaTime': 0,
              'activityMetrics.totalPeerTime': 0,
              'activityMetrics.lastDailyResetAt': now.toISOString(),
              'activityMetrics.lastActive': now.toISOString(),
              updatedAt: now.toISOString()
            });

            // 2. Clear Maya chat history in Firestore
            const convRef = doc(db, 'conversations_maya', user.uid);
            const welcomeMsg = { 
              role: 'assistant', 
              content: `Hi ${profile?.displayName?.split(' ')[0] || 'there'}, I'm Maya. I am a psychologist-like AI. I'm here to listen to your problems, understand your pain, and suggest the right companion who shares your mindset. How have you been feeling lately?`
            };
            await setDoc(convRef, {
              userId: user.uid,
              messages: [welcomeMsg],
              lastUpdated: now.toISOString()
            }, { merge: true });

            console.log("Dashboard daily synchronized midnight reset completed successfully.");
          } catch (err) {
            localStorage.removeItem(RESET_KEY);
            console.error("Dashboard daily reset failed:", err);
          }
        };

        performDailyResetSync();
      }
    }
  }, [profile, user]);

  useEffect(() => {
    if (profile && !profile.onboarded) {
      navigate({ to: '/onboarding' });
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Connection))
        .filter(c => !c.removedBy || c.removedBy.length === 0);
      
      setConnections(docs);

      // Simple notification logic
      const notifs = docs.filter(c => c.status === 'pending' && c.receiverId === user.uid);
      setNotifications(notifs);
    }, (err) => {
      if (auth.currentUser) {
        handleFirestoreError(err, OperationType.LIST, 'connections');
      }
    });

    return unsub;
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;
    const unsubNotifs = subscribeToNotifications(user.uid, (data) => {
      setUserNotifications(data);
    });
    return unsubNotifs;
  }, [user, loading]);

  const handleAction = async (connId: string, status: 'accepted' | 'rejected') => {
    setIsProcessing(true);
    setProcessingLabel(status === 'accepted' ? 'Connecting...' : 'Removing...');
    
    // Simulate high-end verification
    await new Promise(r => setTimeout(r, 1000));

    const connRef = doc(db, 'connections', connId);
    
    if (status === 'accepted') {
      const activeConnectionsCount = connections.filter(c => c.status === 'accepted').length;
      if (!profile?.isPremium && activeConnectionsCount >= 2) {
        alert("Connection limit reached. Non-premium users are restricted to 2 active parallel links. Upgrade to Premium to expand your capacity.");
        setIsProcessing(false);
        return;
      }

      // Find other user details for cinematic connection transition
      const connDoc = connections.find(c => c.id === connId);
      if (connDoc) {
        const otherId = connDoc.users.find(uid => uid !== user?.uid);
        if (otherId) {
          try {
            const senderProfileData = await getCachedProfile(otherId);
            if (senderProfileData) {
              setTransitionMatch(senderProfileData);
              setTransitionVisible(true);
            }
          } catch (err) {
            console.error("Error setting transition profile:", err);
          }
        }
      }

      await updateDoc(connRef, { 
        status,
        updatedAt: new Date().toISOString()
      });

      // --- Notify Initiator via persistent notification in Firestore ---
      try {
        const connSnap = await getDoc(connRef);
        if (connSnap.exists()) {
          const connData = connSnap.data() as Connection;
          await createNotification(connData.initiatorId, {
            text: `${profile?.displayName || 'Someone'} accepted your friend request!`,
            type: 'accept',
            senderId: user?.uid,
            senderName: profile?.displayName || 'Anonymous',
            connectionId: connId
          });
        }
      } catch (err) {
        console.error("Failed to create Firestore accept notification", err);
      }

      // --- Notify Initiator via Email ---
      try {
        const connSnap = await getDoc(connRef);
        if (connSnap.exists()) {
          const connData = connSnap.data() as Connection;
          const initiatorRef = doc(db, 'users', connData.initiatorId);
          const initiatorSnap = await getDoc(initiatorRef);
          if (initiatorSnap.exists()) {
            const initiatorData = initiatorSnap.data();
            fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'accept',
                recipientEmail: initiatorData.email,
                recipientName: initiatorData.displayName,
                senderName: profile?.displayName
              })
            });
          }
        }
      } catch (err) {
        console.error("Accept notification failed", err);
      }
    } else {
      // --- Notify Initiator via persistent notification in Firestore ---
      try {
        const connRef = doc(db, 'connections', connId);
        const connSnap = await getDoc(connRef);
        if (connSnap.exists()) {
          const connData = connSnap.data() as Connection;
          await createNotification(connData.initiatorId, {
            text: `${profile?.displayName || 'Someone'} declined your friend request.`,
            type: 'reject',
            senderId: user?.uid,
            senderName: profile?.displayName || 'Anonymous'
          });
        }
      } catch (err) {
        console.error("Failed to create Firestore reject notification", err);
      }
      // If rejected, delete the request to keep the stream clean
      await deleteDoc(connRef);
    }

    setIsProcessing(false);
  };

  const handleRemoveConnection = async (connId: string) => {
    if (!confirm('Remove this connection?')) return;
    
    setIsProcessing(true);
    setProcessingLabel('Removing...');
    
    try {
      await deleteDoc(doc(db, 'connections', connId));
    } catch (error) {
      console.error("Error removing connection:", error);
    }
    setIsProcessing(false);
  };

  const activeConnections = connections.filter(c => c.status === 'accepted');
  const isOverLimit = !profile?.isPremium && activeConnections.length > 2;

  const handleDisconnect = async (connId: string) => {
    if (!user) return;
    setIsProcessing(true);
    setProcessingLabel('Disconnecting...');
    try {
      const connRef = doc(db, 'connections', connId);
      const connObj = connections.find(c => c.id === connId);
      const otherUserId = connObj?.users.find(uid => uid !== user.uid);

      if (otherUserId) {
        // Notify other user about connection removal
        await createNotification(otherUserId, {
          text: `${profile?.displayName || 'Someone'} removed you from their friend circle`,
          type: 'reject',
          senderId: user.uid,
          senderName: profile?.displayName || 'Anonymous'
        });
      }

      const hasOtherUserRemoved = otherUserId && connObj?.removedBy?.includes(otherUserId);

      if (hasOtherUserRemoved) {
        await deleteDoc(connRef);
      } else {
        await updateDoc(connRef, {
          removedBy: arrayUnion(user.uid),
          updatedAt: new Date().toISOString()
        });
      }
      setIsDisconnecting(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message || 'Could not remove the connection'}.`);
    } finally {
      setIsProcessing(false);
    }
  };

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 260, 
        damping: 20 
      }
    }
  };

  if (!user || !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base">
        <Logo className="animate-pulse text-brand-primary" size={60} />
        <p className="mt-8 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-brand-primary animate-pulse">Synchronizing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-base global-container section-gap pt-4 md:pt-6">
      <TransactionOverlay 
        isVisible={isProcessing} 
        label={processingLabel} 
        type={processingLabel.includes('Authorizing') ? 'shield' : 'process'} 
      />
      {/* Header section */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 md:gap-14 border-b border-brand-primary/5 pb-8 md:pb-12"
      >
        <div className="space-y-6 md:space-y-8 flex-1">
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-sans font-light tracking-[0.2em] text-brand-primary uppercase">My Dashboard</span>
          </motion.div>
          <motion.h1 
            variants={itemVariants}
            className="text-5xl sm:text-7xl font-display font-light uppercase tracking-tight leading-none text-text-base"
          >
            Hello, <br className="hidden sm:block" />
            <span className="text-brand-primary italic font-medium">{profile?.displayName?.split(' ')[0]}</span>
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="font-sans font-light text-sm sm:text-base text-text-muted leading-[1.8] max-w-xl"
          >
            "A peaceful and safe place for your mind."
          </motion.p>
        </div>

        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-6 w-full lg:w-auto relative"
        >
          {/* Bell Icon Notification Button */}
          <div className="relative">
            <button 
              onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
              className="w-14 h-14 cred-elevation flex items-center justify-center text-text-base hover:text-brand-primary relative transition-all active:scale-95 bg-bg-card border border-brand-primary/10 rounded-full"
              title="Notifications"
            >
              <Bell size={20} className={userNotifications.some(n => !n.read) ? "animate-bounce" : ""} />
              {userNotifications.filter(n => !n.read).length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-accent text-white text-[11px] font-black flex items-center justify-center rounded-full border-2 border-bg-base shadow-lg">
                  {userNotifications.filter(n => !n.read).length}
                </div>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            <AnimatePresence>
              {showNotificationsPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.98 }}
                  className="absolute left-[-1.25rem] lg:left-auto lg:right-0 mt-4 w-[calc(100vw-2.5rem)] min-[350px]:w-[320px] xs:w-[350px] sm:w-[400px] md:w-[420px] bg-bg-card cred-elevation p-5 sm:p-8 z-[100] space-y-6 max-h-[480px] overflow-y-auto shadow-[12px_12px_45px_rgba(128,0,32,0.12)] border border-brand-accent/20 rounded-[2rem]"
                >
                  <div className="flex items-center justify-between border-b border-brand-primary/10 pb-4">
                    <h3 className="font-display text-lg font-medium text-brand-primary tracking-wide italic leading-none">Notifications</h3>
                    {userNotifications.length > 0 && (
                      <button 
                        onClick={async () => {
                          for (const n of userNotifications) {
                            if (!n.read) await markNotificationAsRead(user!.uid, n.id);
                          }
                        }}
                        className="px-3 py-1 bg-transparent hover:bg-brand-primary/5 text-brand-primary border border-brand-primary/15 rounded-full font-sans text-[11px] uppercase tracking-widest transition-all duration-300"
                      >
                        Read All
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {userNotifications.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <p className="font-display font-light text-base text-text-muted italic">Clear skies today.</p>
                        <p className="font-sans text-[11px] uppercase tracking-widest text-zinc-400">No new messages or actions</p>
                      </div>
                    ) : (
                      userNotifications.map(notif => (
                        <BellNotificationItem
                          key={notif.id}
                          notif={notif}
                          onMarkRead={async () => {
                            await markNotificationAsRead(user!.uid, notif.id);
                          }}
                          onDelete={async () => {
                            await deleteNotification(user!.uid, notif.id);
                          }}
                          onRedirect={async () => {
                            if (!notif.read) await markNotificationAsRead(user!.uid, notif.id);
                            setShowNotificationsPanel(false);
                            if (notif.type === 'request') {
                              if (triggerBordeaux) {
                                triggerBordeaux(() => navigate({ to: '/dashboard' }));
                              } else {
                                navigate({ to: '/dashboard' });
                              }
                            } else if (notif.type === 'reject') {
                              if (triggerBordeaux) {
                                triggerBordeaux(() => navigate({ to: '/match' }));
                              } else {
                                navigate({ to: '/match' });
                              }
                            } else if (notif.connectionId) {
                              if (triggerBordeaux) {
                                triggerBordeaux(() => navigate({ to: `/chat/${notif.connectionId}` }));
                              } else {
                                navigate({ to: `/chat/${notif.connectionId}` });
                              }
                            } else {
                              if (triggerBordeaux) {
                                triggerBordeaux(() => navigate({ to: '/match' }));
                              } else {
                                navigate({ to: '/match' });
                              }
                            }
                          }}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link 
              to="/maya"
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-6"
            >
              <Sparkles size={12} className="opacity-40" />
              <span>Chat with Maya</span>
            </Link>
            <Link 
              to="/match"
              className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-6 text-brand-primary hover:text-[#A3002E] border-brand-primary/10 hover:border-brand-primary/40 bg-white group"
            >
              <Heart size={12} className="opacity-60 text-brand-accent fill-brand-accent/20 transition-transform group-hover:scale-110" />
              <span>Match System</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
        {/* Connection Requests Notifications */}
        <section className="lg:col-span-12 xl:col-span-8 space-y-8 md:space-y-12">
          
          {/* Curated Match System Module Custom Card */}
          <motion.div 
            variants={itemVariants}
            onClick={() => navigate({ to: '/match' })}
            className="cred-elevation p-8 sm:p-12 bg-bg-card border-2 border-brand-accent/20 hover:border-brand-accent/60 transition-all rounded-[2rem] cursor-pointer relative overflow-hidden group text-left shadow-[12px_12px_45px_rgba(218,165,32,0.06)]"
          >
            {/* Visual background accents */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-2xl"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse"></span>
                  <span className="text-xs font-sans font-light tracking-[0.2em] text-brand-accent uppercase">Curated Connection System</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-display font-light leading-none uppercase tracking-tight text-text-base">
                  Match <span className="text-brand-primary italic font-medium">System</span>
                </h3>
                
                <p className="font-sans font-light text-sm sm:text-base text-text-muted leading-[1.8]">
                  Meaningful bonds, lovingly crafted.
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <span className="px-6 py-3 rounded-full border border-brand-accent/30 text-brand-accent group-hover:bg-brand-accent group-hover:text-white font-sans text-xs font-light uppercase tracking-widest transition-all duration-300">
                  Access System
                </span>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-4 md:gap-6 pt-6">
            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-text-muted italic flex items-center gap-3">
              <Bell size={14} /> Requests
            </h2>
            <div className="flex-grow border-t-2 border-brand-primary/5"></div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 md:space-y-6"
          >
            {notifications.length === 0 && (
              <motion.div 
                variants={itemVariants}
                className="cred-inset p-10 md:p-16 text-center text-text-muted font-normal uppercase tracking-[0.2em] text-[12px] md:text-sm"
              >
                No new requests
              </motion.div>
            )}
            {notifications.map(notif => (
              <motion.div key={notif.id} variants={itemVariants}>
                <NotificationItem 
                  notification={notif} 
                  onAccept={() => handleAction(notif.id, 'accepted')}
                  onReject={() => handleAction(notif.id, 'rejected')}
                />
              </motion.div>
            ))}
          </motion.div>


        </section>

        {/* Sidebar / Info */}
        <aside className="lg:col-span-12 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 xl:gap-10">
          <div className="cred-elevation p-6 md:p-10 space-y-6 md:space-y-8 relative overflow-hidden group h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="space-y-6 relative z-10 text-center flex flex-col h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 cred-inset flex items-center justify-center text-brand-primary mx-auto">
                <Logo size={32} className="text-brand-primary sm:size-[40px]" />
              </div>
              <div className="space-y-4 flex-1">
                <h3 className="text-lg md:text-2xl font-black uppercase tracking-widest italic border-b border-brand-primary/10 pb-4">Activity</h3>
                
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="cred-inset p-3 md:p-4 space-y-1">
                    <p className="text-xs md:text-sm font-normal text-text-muted uppercase tracking-[0.2em]">Chat with Maya</p>
                    <p className="text-base md:text-xl font-black italic">{profile?.activityMetrics?.totalMayaTime || 0}<span className="text-[11px] text-text-muted ml-0.5 md:ml-1">minutes</span></p>
                  </div>
                  <div className="cred-inset p-3 md:p-4 space-y-1">
                    <p className="text-xs md:text-sm font-normal text-text-muted uppercase tracking-[0.2em]">Chat with Friends</p>
                    <p className="text-base md:text-xl font-black italic">{profile?.activityMetrics?.totalPeerTime || 0}<span className="text-[11px] text-text-muted ml-0.5 md:ml-1">minutes</span></p>
                  </div>
                </div>

                <div className="cred-inset p-3 md:p-4 space-y-1">
                  <p className="text-xs md:text-sm font-normal text-text-muted uppercase tracking-[0.2em]">My Mood Today</p>
                  <p className="text-sm md:text-lg font-black italic text-brand-accent uppercase tracking-[0.2em] md:tracking-widest">
                    {profile?.lastMayaInteractionAt && new Date(profile.lastMayaInteractionAt).toDateString() === new Date().toDateString() ? (
                      profile?.emotionalProfile?.moodBaseline ? (profile.emotionalProfile.moodBaseline > 70 ? 'FEELING GOOD' : profile.emotionalProfile.moodBaseline > 40 ? 'FEELING OKAY' : 'HAVING A HARD TIME') : 'NONE'
                    ) : 'NONE'}
                  </p>
                </div>
              </div>

              <Link to="/profile" className="btn-secondary w-full py-4 text-xs mt-4">
                My Profile
              </Link>
            </div>
          </div>

          <div className="cred-inset p-6 md:p-10 space-y-4 md:space-y-6 h-full">
            <h3 className="text-sm md:text-base font-normal uppercase tracking-[0.3em] text-text-muted italic">Rules</h3>
            <ul className="space-y-3 md:space-y-6 text-[11px] md:text-xs font-black uppercase tracking-[0.1em]">
              <li className="flex items-start gap-3">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-brand-primary/20 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-brand-primary rounded-full"></div>
                </div>
                Be nice to everyone.
              </li>
              <li className="flex items-start gap-3">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-brand-primary/20 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-brand-primary rounded-full"></div>
                </div>
                Keep secrets safe.
              </li>
              <li className="flex items-start gap-3">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-brand-primary/20 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-brand-primary rounded-full"></div>
                </div>
                Think before you send.
              </li>
            </ul>
          </div>

        </aside>
      </div>

      {/* Disconnect Modal */}
      <AnimatePresence>
        {isDisconnecting && targetConn && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bg-base/90 backdrop-blur-3xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md cred-elevation p-12 bg-bg-card border-t-4 border-t-red-600 space-y-10"
            >
              <div className="space-y-4">
                <h3 className="text-3xl font-display font-light uppercase tracking-tight text-red-650">Remove Companion?</h3>
                <p className="font-sans font-light text-sm text-text-muted leading-[1.8]">
                  Are you sure you want to stop talking to {targetConn.name}? This friend will be removed from your dashboard.
                </p>
              </div>
              
              <div className="flex gap-4">
                 <button 
                   onClick={() => setIsDisconnecting(false)}
                   className="flex-1 btn-secondary py-5 text-[10px]"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={() => handleDisconnect(targetConn.id)}
                   className="flex-1 bg-red-600 text-white font-black uppercase tracking-[0.3em] text-[10px] italic py-5 hover:bg-red-700 transition-all font-display"
                 >
                   DISCONNECT
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      <CinematicConnection 
        isVisible={transitionVisible} 
        type="match" 
        userPhoto={profile?.photoURL || undefined}
        matchPhoto={transitionMatch?.photoURL || undefined}
        userName={profile?.displayName || 'You'}
        matchName={transitionMatch?.displayName || 'Companion'}
        onComplete={() => {
          setTransitionVisible(false);
          setTransitionMatch(null);
        }}
      />
      
      {/* Footer */}
      <footer className="w-full pt-20 pb-12 border-t border-black/5 mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Logo size={40} className="text-brand-primary" />
              <span className="font-display font-black uppercase italic text-2xl tracking-tighter">DelusionAI</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted leading-relaxed max-w-xs">
              A safe place to talk, share your feelings, and find support from others.
            </p>
          </div>

          <div className="space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted border-b border-black/5 pb-4">Connect</h4>
            <div className="flex gap-6">
              <a href="https://www.linkedin.com/company/delusionai/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 cred-elevation flex items-center justify-center text-zinc-600 hover:text-brand-primary hover:border-brand-primary transition-all group">
                <Linkedin size={20} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="https://www.instagram.com/delusionai.in?igsh=YTVvcGFkZWkzN3N3" target="_blank" rel="noopener noreferrer" className="w-12 h-12 cred-elevation flex items-center justify-center text-zinc-600 hover:text-brand-primary hover:border-brand-primary transition-all group">
                <Instagram size={20} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="https://x.com/Delusion_Ai" target="_blank" rel="noopener noreferrer" className="w-12 h-12 cred-elevation flex items-center justify-center text-zinc-600 hover:text-brand-primary hover:border-brand-primary transition-all group">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="space-y-8">
            <h4 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted border-b border-black/5 pb-4">Contact</h4>
            <div className="space-y-6">
              <div className="group border-l-2 border-brand-primary/10 pl-6 space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">General Inquiry</p>
                <a href="mailto:delusionai.in@gmail.com" className="text-xs font-black italic hover:text-brand-primary transition-colors">delusionai.in@gmail.com</a>
              </div>
              <div className="group border-l-2 border-brand-primary/10 pl-6 space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">Support & Partnership</p>
                <a href="mailto:contact.us@delusionai.in" className="text-xs font-black italic hover:text-brand-primary transition-colors">contact.us@delusionai.in</a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-black uppercase tracking-[0.4em] text-zinc-400">
          <p>© 2026 DelusionAI</p>
          <div className="flex gap-10">
            <Link to="/protocol" className="hover:text-text-base cursor-pointer">App Safety</Link>
            <Link to="/privacy" className="hover:text-text-base cursor-pointer">Privacy</Link>
            <Link to="/terms" className="hover:text-text-base cursor-pointer">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
