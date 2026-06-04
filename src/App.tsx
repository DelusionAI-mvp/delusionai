import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  RouterProvider, 
  Outlet,
  Link,
  useNavigate,
  useLocation
} from '@tanstack/react-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, Connection, Message } from './types';
import { Sun, Moon, LogOut, MessageCircle, Users, Home, User as UserIcon, Sparkles, Info, X, Bell, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import { getCachedProfile, bootstrapPeersInDatabase } from './lib/userService';
import { Starfield } from './components/Starfield';
import { BordeauxTransition } from './components/BordeauxTransition';
import { subscribeToNotifications, UserNotification } from './lib/notifications';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  connectionError: string | null;
  triggerBordeaux?: (onMeetCenter?: () => void, onComplete?: () => void, isOnboardingTransition?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Routes Implementation ---
// (We'll define the components in separate files later or define them as lazy)
// For now, let's setup the root and skeleton.

const Root = () => {
  const { user, profile, loading, theme, toggleTheme, triggerBordeaux } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [activeConnections, setActiveConnections] = useState<Connection[]>([]);
  const [incomingMessageToast, setIncomingMessageToast] = useState<{ 
    senderName: string; 
    text: string; 
    connectionId: string; 
    messageId: string;
    type?: string;
    senderId?: string;
  } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<UserNotification[]>([]);
  const isInitialLoadRef = useRef(true);
  const activeNotificationsRef = useRef<UserNotification[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 10) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide header (slide it up block)
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header (slide it down block)
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  useEffect(() => {
    if (!user) {
      setActiveConnections([]);
      return;
    }
    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', user.uid),
      where('status', '==', 'accepted')
    );
    return onSnapshot(q, (snap) => {
      const conns = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      setActiveConnections(conns);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'connections');
    });
  }, [user]);

  useEffect(() => {
    if (!user || activeConnections.length === 0) return;

    const unsubs = activeConnections.map(conn => {
      const q = query(
        collection(db, 'connections', conn.id, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      return onSnapshot(q, async (snap) => {
        if (snap.empty) return;
        const msg = { id: snap.docs[0].id, ...snap.docs[0].data() } as Message;
        
        const isMine = msg.senderId === user.uid;
        // Check if the message is extremely recent (created within the last 15 seconds) to prevent old alerts
        const isRecent = (Date.now() - new Date(msg.timestamp).getTime()) < 15000;
        const currentChatPath = '/chat/' + conn.id;
        const isCurrentChatPath = window.location.pathname.includes(currentChatPath);

        if (!isMine && isRecent && !isCurrentChatPath) {
          const otherUserId = conn.users.find(uid => uid !== user.uid);
          if (otherUserId) {
            const senderProfile = await getCachedProfile(otherUserId);
            if (senderProfile) {
              const msgId = msg.id || '';
              setIncomingMessageToast({
                senderName: senderProfile.displayName || 'Anonymous',
                text: msg.text,
                connectionId: conn.id,
                messageId: msgId
              });
              
              // Auto hide toast after 5 seconds
              setTimeout(() => {
                setIncomingMessageToast(prev => prev && prev.messageId === msgId ? null : prev);
              }, 5000);
            }
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `connections/${conn.id}/messages`);
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, activeConnections]);

  useEffect(() => {
    if (loading || !user) {
      if (!user && !loading) {
        setActiveNotifications([]);
        activeNotificationsRef.current = [];
        isInitialLoadRef.current = true;
      }
      return;
    }

    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        activeNotificationsRef.current = notifs;
        setActiveNotifications(notifs);
        return;
      }

      // Find any brand new notifications (difference) using the Ref to avoid infinite loop
      const newNotifs = notifs.filter(n => !activeNotificationsRef.current.some(old => old.id === n.id));
      if (newNotifs.length > 0) {
        const latest = newNotifs[0];
        const isRecent = (Date.now() - new Date(latest.createdAt).getTime()) < 15005;
        
        // Only trigger toast for extremely recent notifications that we haven't read yet
        if (isRecent && !latest.read) {
          setIncomingMessageToast({
            senderName: latest.senderName || 'Notification',
            text: latest.text,
            connectionId: latest.connectionId || '',
            messageId: latest.id,
            type: latest.type,
            senderId: latest.senderId
          });

          const msgId = latest.id;
          setTimeout(() => {
            setIncomingMessageToast(prev => prev && prev.messageId === msgId ? null : prev);
          }, 6000);
        }
      }

      activeNotificationsRef.current = notifs;
      setActiveNotifications(notifs);
    });

    return unsub;
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      // Logic removed to save quota. Primary heartbeat in App.tsx handle this.
    };

    window.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (loading) return;
    
    const path = location.pathname;
    
    // Auth redirect
    if (!user) {
      if (!['/', '/auth', '/privacy', '/terms', '/protocol', '/about'].includes(path)) {
        navigate({ to: '/' });
      }
      return;
    }

    // If already fully synced and onboarded, clean up the session override
    if (profile?.onboarded) {
      sessionStorage.removeItem('just_onboarded');
    }

    const isReallyOnboarded = profile?.onboarded || sessionStorage.getItem('just_onboarded') === 'true';

    // Onboarding redirect
    if (profile && !isReallyOnboarded && !['/onboarding', '/auth', '/privacy', '/terms', '/protocol', '/about'].includes(path)) {
      navigate({ to: '/onboarding', replace: true });
      return;
    }
    
    // Redirect logged-in and onboarded users away from landing
    if (isReallyOnboarded && path === '/') {
      navigate({ to: '/dashboard' });
    }
  }, [loading, user, profile?.onboarded, location.pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-base font-display text-2xl font-black uppercase tracking-[0.4em] italic"
        >
          Delusion<span className="text-brand-accent">AI</span>
        </motion.div>
      </div>
    );
  }

  const isOnboarding = path === '/onboarding';
  const isAuth = path === '/auth';
  const isLanding = path === '/';

  // Navigation logic: Show if user is logged in and not on core entry/setup pages, and NOT inside individual chat threads
  const showNav = user && !isAuth && !isOnboarding && !isLanding && !path.startsWith('/chat/');
  const showPublicNav = !user && (isLanding || path === '/about' || path === '/protocol' || path === '/privacy' || path === '/terms');

  const handleNav = (to: string) => {
    if (triggerBordeaux) {
      triggerBordeaux(() => {
        navigate({ to });
      });
    } else {
      navigate({ to });
    }
  };

  const handleJoinWaitlistClick = () => {
    if (!user) {
      handleNav('/auth');
    } else {
      const isReallyOnboarded = profile?.onboarded || sessionStorage.getItem('just_onboarded') === 'true';
      if (!isReallyOnboarded) {
        handleNav('/onboarding');
      } else {
        handleNav('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-text-base selection:bg-brand-primary selection:text-white relative">
      <Starfield />
      {(showNav || showPublicNav) && (
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 py-4 sm:py-6 border-b-4 border-brand-primary/20 bg-bg-base/80 backdrop-blur-md transition-all duration-300 ${
            showHeader ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="global-container flex items-center justify-between">
            <button 
              onClick={() => handleNav(user ? "/dashboard" : "/")} 
              className="text-lg sm:text-2xl font-display font-black tracking-[0.1em] uppercase italic flex items-center gap-2 sm:gap-6 group text-left cursor-pointer pointer-events-auto bg-transparent border-0 p-0"
            >
              <Logo size={34} className="sm:size-[56px]" />
              <span className="text-text-base hidden min-[380px]:inline font-display">Delusion<span className="text-brand-accent font-display">AI</span></span>
            </button>
            <div className="flex items-center gap-2 sm:gap-6">
              {showNav ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="hidden md:flex items-center gap-1 lg:gap-2">
                    <button 
                      onClick={() => handleNav('/dashboard')} 
                      className={`relative group flex items-center gap-1.5 px-3 py-2 font-sans font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                        path === '/dashboard' 
                          ? 'text-[#8B1A2F] scale-105' 
                          : 'text-[#2B050C] hover:text-[#8B1A2F] hover:scale-105'
                      }`}
                    >
                      <Home size={14} className="stroke-[2.5px] transition-transform group-hover:scale-110" />
                      <span>Home</span>
                      {path === '/dashboard' && (
                        <div className="absolute bottom-[-4px] left-3 right-3 h-[2px] bg-[#8B1A2F] rounded-full" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleNav('/about')} 
                      className={`relative group flex items-center gap-1.5 px-3 py-2 font-sans font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                        path === '/about' 
                          ? 'text-[#8B1A2F] scale-105' 
                          : 'text-[#2B050C] hover:text-[#8B1A2F] hover:scale-105'
                      }`}
                    >
                      <Info size={14} className="stroke-[2.5px] transition-transform group-hover:scale-110" />
                      <span>About</span>
                      {path === '/about' && (
                        <div className="absolute bottom-[4px] left-3 right-3 h-[2px] bg-[#8B1A2F] rounded-full" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleNav('/maya')} 
                      className={`relative group flex items-center gap-1.5 px-3 py-2 font-sans font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                        path === '/maya' 
                          ? 'text-[#9F7E39] scale-105' 
                          : 'text-[#7A5F24] hover:text-[#9F7E39] hover:scale-105'
                      }`}
                    >
                      <MessageCircle size={14} className="stroke-[2.5px] transition-transform group-hover:scale-110" />
                      <span>Maya</span>
                      {path === '/maya' && (
                        <div className="absolute bottom-[4px] left-3 right-3 h-[2px] bg-[#9F7E39] rounded-full" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleNav('/match')} 
                      className={`relative group flex items-center gap-1.5 px-3 py-2 font-sans font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                        path === '/match' 
                          ? 'text-[#8B1A2F] scale-105' 
                          : 'text-[#2B050C] hover:text-[#8B1A2F] hover:scale-105'
                      }`}
                    >
                      <Sparkles size={14} className="stroke-[2.5px] transition-transform group-hover:scale-110" />
                      <span>Match</span>
                      {path === '/match' && (
                        <div className="absolute bottom-[-4px] left-3 right-3 h-[2px] bg-[#8B1A2F] rounded-full" />
                      )}
                    </button>
                  </div>
                  <div className="h-8 w-[2px] bg-brand-primary/20 hidden md:block mx-1 sm:mx-2"></div>
                  <button 
                    onClick={() => handleNav('/profile')} 
                    className="group relative flex items-center gap-3 px-3 py-2 cred-elevation hover:bg-brand-primary/5 transition-all border-brand-primary/10 text-left rounded-xl"
                  >
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden border-2 border-brand-primary/20 flex items-center justify-center bg-bg-card">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={16} className="text-brand-primary/40" />
                      )}
                    </div>
                    <div className="hidden lg:block text-left mr-2 font-display">
                      <p className="text-[10px] font-black uppercase text-text-base leading-tight truncate max-w-[100px] font-display">
                        {profile?.displayName?.split(' ')[0] || 'User'}
                      </p>
                      <p className="text-[8px] font-bold uppercase text-brand-accent tracking-widest leading-tight font-display">
                        {profile?.isPremium ? 'PRO member' : 'Basic Member'}
                      </p>
                    </div>
                  </button>
                  <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="group relative btn-logout-round w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center text-text-muted hover:text-text-base"
                  >
                    <LogOut size={18} className="sm:size-[20px]" />
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded opacity-0 lg:group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-[0_4px_10px_rgba(128,0,32,0.15)] bg-slate-800">
                      Logout
                    </span>
                  </button>
                </div>
              ) : showPublicNav ? (
                <div className="flex items-center gap-1.5 sm:gap-4">
                  <button 
                    onClick={() => handleNav('/about')} 
                    className={`btn-glassy group flex items-center justify-center gap-2 hover:text-[#9F7E39] ${path === '/about' ? 'btn-glassy-active' : 'text-[#5A1E2D]'}`}
                  >
                    <span>About</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </nav>
      )}

      <main className={`flex-1 flex flex-col ${(showNav || showPublicNav) ? 'pt-24 sm:pt-32' : ''} ${path.startsWith('/chat/') ? 'pb-0' : 'pb-36'} md:pb-0`}>
        <Outlet />
      </main>

      {showNav && (
        <div 
          className="md:hidden fixed bottom-6 left-4 right-4 py-2.5 px-4 flex justify-between items-center z-50 rounded-full bg-[#F8F4EE]/90 backdrop-blur-xl border border-[#5A1E2D]/15 shadow-[0_12px_30px_rgba(90,30,45,0.12)] animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <button 
            onClick={() => handleNav('/dashboard')} 
            className={`transition-all duration-300 flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-full ${
              path === '/dashboard' 
                ? 'text-[#8B1A2F]' 
                : 'text-[#2B050C] hover:text-[#8B1A2F] active:scale-95'
            }`}
          >
            <Home size={18} className="stroke-[2.5px]" />
            <span className={`text-[8px] font-black uppercase tracking-wider font-sans transition-all ${path === '/dashboard' ? 'opacity-100 scale-105' : ''}`}>Home</span>
          </button>
          <button 
            onClick={() => handleNav('/maya')} 
            className={`transition-all duration-300 flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-full ${
              path === '/maya' 
                ? 'text-[#9F7E39]' 
                : 'text-[#7A5F24] hover:text-[#9F7E39] active:scale-95'
            }`}
          >
            <MessageCircle size={18} className="stroke-[2.5px]" />
            <span className={`text-[8px] font-black uppercase tracking-wider font-sans transition-all ${path === '/maya' ? 'opacity-100 scale-105' : ''}`}>Maya</span>
          </button>
          <button 
            onClick={() => handleNav('/match')} 
            className={`transition-all duration-300 flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-full ${
              path === '/match' 
                ? 'text-[#8B1A2F]' 
                : 'text-[#2B050C] hover:text-[#8B1A2F] active:scale-95'
            }`}
          >
            <Sparkles size={18} className="stroke-[2.5px]" />
            <span className={`text-[8px] font-black uppercase tracking-wider font-sans transition-all ${path === '/match' ? 'opacity-100 scale-105' : ''}`}>Match</span>
          </button>
          <button 
            onClick={() => handleNav('/profile')} 
            className={`transition-all duration-300 flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-full ${
              path === '/profile' 
                ? 'text-[#8B1A2F]' 
                : 'text-[#2B050C] hover:text-[#8B1A2F] active:scale-95'
            }`}
          >
            <UserIcon size={18} className="stroke-[2.5px]" />
            <span className={`text-[8px] font-black uppercase tracking-wider font-sans transition-all ${path === '/profile' ? 'opacity-100 scale-105' : ''}`}>Me</span>
          </button>
          <button 
            onClick={() => handleNav('/about')} 
            className={`transition-all duration-300 flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-full ${
              path === '/about' 
                ? 'text-[#8B1A2F]' 
                : 'text-[#2B050C] hover:text-[#8B1A2F] active:scale-95'
            }`}
          >
            <Info size={18} className="stroke-[2.5px]" />
            <span className={`text-[8px] font-black uppercase tracking-wider font-sans transition-all ${path === '/about' ? 'opacity-100 scale-105' : ''}`}>About</span>
          </button>
        </div>
      )}

      {/* Elegant Card-style Message / Activity Received Toast */}
      <AnimatePresence>
        {incomingMessageToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-[110px] md:bottom-8 right-6 md:right-8 z-[200] max-w-sm w-full bg-bg-card border-2 border-brand-primary/20 text-text-base rounded-2xl shadow-[15px_15px_50px_rgba(128,0,32,0.18)] flex items-start p-5 gap-4 pointer-events-auto"
          >
            <div className="flex-1 space-y-1.5 text-left cursor-pointer font-sans" onClick={() => {
              const toConnId = incomingMessageToast.connectionId;
              const notifType = incomingMessageToast.type;
              setIncomingMessageToast(null);

              let targetTo = '/dashboard';
              if (notifType === 'request') {
                targetTo = '/dashboard';
              } else if (notifType === 'reject') {
                targetTo = '/match';
              } else if (toConnId) {
                targetTo = `/chat/${toConnId}`;
              } else {
                targetTo = '/dashboard';
              }

              if (triggerBordeaux) {
                triggerBordeaux(() => navigate({ to: targetTo }));
              } else {
                navigate({ to: targetTo });
              }
            }}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse flex-shrink-0"></span>
                <p className="text-[9px] font-sans font-black uppercase tracking-widest text-brand-accent font-display">
                  {incomingMessageToast.type === 'request' ? 'Friend Request' :
                   incomingMessageToast.type === 'accept' ? 'Request Accepted' :
                   incomingMessageToast.type === 'reject' ? 'Request Update' :
                   'New Message'}
                </p>
              </div>
              <h5 className="text-base font-display font-black uppercase italic leading-none text-text-base">
                {incomingMessageToast.senderName}
              </h5>
              <p className="font-sans font-light text-xs text-text-muted pr-6 block max-w-[280px] leading-relaxed break-words font-sans">
                {incomingMessageToast.text}
              </p>
              
              {/* Added to Bell Indicator */}
              <div className="flex items-center gap-1.5 text-[9px] font-sans font-black uppercase tracking-widest text-[#E3A857] animate-pulse mt-2.5 bg-[#E3A857]/5 border border-[#E3A857]/20 px-2.5 py-1 rounded-lg w-max">
                <Bell size={10} className="fill-current animate-pulse mr-0.5 text-[#E3A857]" /> Stored in Bell Inbox
              </div>
            </div>
            <button 
              onClick={() => setIncomingMessageToast(null)}
              className="text-text-muted hover:text-brand-primary transition-colors p-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
};

import IndexPage from './routes/Landing';
import AuthPage from './routes/Auth';
import OnboardingPage from './routes/Onboarding';
import DashboardPage from './routes/Dashboard';
import MayaChatPage from './routes/MayaChat';
import MatchPage from './routes/Match';
import AboutPage from './routes/About';
import ChatPage from './routes/Chat';
import ProfilePage from './routes/Profile';
import PrivacyPage from './routes/Privacy';
import TermsPage from './routes/Terms';
import ProtocolPage from './routes/Protocol';

// --- Routes Implementation ---
const rootRoute = createRootRoute({
  component: Root,
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: IndexPage });
const authRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthPage });
const onboardingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/onboarding', component: OnboardingPage });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: DashboardPage });
const mayaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/maya', component: MayaChatPage });
const matchRoute = createRoute({ getParentRoute: () => rootRoute, path: '/match', component: MatchPage });
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: AboutPage });
const chatRoute = createRoute({ getParentRoute: () => rootRoute, path: '/chat/$connectionId', component: ChatPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage });
const privacyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/privacy', component: PrivacyPage });
const termsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/terms', component: TermsPage });
const protocolRoute = createRoute({ getParentRoute: () => rootRoute, path: '/protocol', component: ProtocolPage });

const routeTree = rootRoute.addChildren([
  indexRoute, 
  authRoute, 
  onboardingRoute, 
  dashboardRoute, 
  mayaRoute, 
  matchRoute,
  aboutRoute,
  chatRoute,
  profileRoute,
  privacyRoute,
  termsRoute,
  protocolRoute
]);
const router = createRouter({ routeTree });

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let unsubSnapshot: (() => void) | null = null;

    const initProfile = async () => {
      // Bootstrap real matching profiles in Firestore
      await bootstrapPeersInDatabase();

      // Load local profile fallback if defined in localStorage for resilience
      const localSaved = localStorage.getItem(`delusion_local_profile_${user.uid}`);
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (parsed && parsed.onboarded) {
            setProfile(parsed);
          }
        } catch (_) {}
      }

      const profileRef = doc(db, 'users', user.uid);
      try {
        const profileDoc = await getDoc(profileRef);
        
        if (!profileDoc.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            onboarded: false,
            matchRequestCount: 0,
            createdAt: new Date().toISOString(),
            activityMetrics: {
              lastActive: new Date().toISOString(),
              lastDailyResetAt: new Date().toISOString(),
              totalMayaTime: 0,
              totalPeerTime: 0
            }
          };
          await setDoc(profileRef, newProfile, { merge: true });

          // Send automatic "Thank you for joining" waitlist email immediately for new registration
          if (newProfile.email) {
            fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'waitlist_joined',
                recipientEmail: newProfile.email,
                recipientName: newProfile.displayName || 'VIP Member'
              })
            }).catch(e => {
              console.warn("Autosent waitlist email from App.tsx failed:", e);
            });
          }

          setProfile(prev => {
             if (prev?.onboarded) return prev;
             return newProfile;
          });
        } else {
          const data = profileDoc.data() as UserProfile;
          if (data.onboarded !== true) {
            // Existing user logged into pre-existing account: bypass pre-questions as requested
            const defaultEmotionalProfile = {
              moodBaseline: 70,
              moodKeywords: ["seeking_balance"],
              communicationStyle: "balanced",
              needs: "caring conversation",
              traits: ["resilient"],
              interests: ["mindfulness"],
              personalityType: "Quiet Supporter",
              profileScore: 80
            };
            await updateDoc(profileRef, {
              onboarded: true,
              age: 'Unknown',
              ageGroup: 'Unknown',
              currentSituation: [],
              whyJoined: [],
              interests: [],
              personality: [],
              emotionalProfile: defaultEmotionalProfile,
              updatedAt: new Date().toISOString()
            });
          }
        }

        unsubSnapshot = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            
            // Sync with local memory for resilient offline fallback
            localStorage.setItem(`delusion_local_profile_${user.uid}`, JSON.stringify(data));
            setProfile(data);
            setConnectionError(null);

            // Sleep / Prathi Rathri daily reset check
            const now = new Date();
            const lastResetStr = data.activityMetrics?.lastDailyResetAt;
            const isNewDay = !lastResetStr || new Date(lastResetStr).toDateString() !== now.toDateString();
            if (isNewDay) {
              const RESET_KEY = `delusion_reset_${user.uid}_${now.toDateString().replace(/\s/g, '_')}`;
              if (!localStorage.getItem(RESET_KEY)) {
                localStorage.setItem(RESET_KEY, 'true');
                
                // Dynamic warm welcome message tailored for the user
                const welcomeMsg = {
                  role: 'assistant',
                  content: `Hi ${data.displayName?.split(' ')[0] || 'there'}, I'm Maya. I'm here to listen, support you, and help you find peer connections who truly understand you. How have you been feeling lately?`
                };

                // 1. Reset user daily metrics, messages limit used count and active cooldown in profile
                updateDoc(profileRef, {
                  'activityMetrics.totalMayaTime': 0,
                  'activityMetrics.totalPeerTime': 0,
                  'activityMetrics.lastDailyResetAt': now.toISOString(),
                  'messagesUsed': 0,
                  'cooldownEnd': null,
                  'updatedAt': now.toISOString()
                }).catch(err => {
                  localStorage.removeItem(RESET_KEY);
                  console.error("Global daily reset in App.tsx failed:", err);
                });

                // 2. Reset the Maya conversation session completely at midnight for a fresh daily talk
                setDoc(doc(db, 'conversations_maya', user.uid), {
                  userId: user.uid,
                  messages: [welcomeMsg],
                  lastUpdated: now.toISOString()
                }, { merge: true }).catch(err => {
                  console.error("Global daily reset of Maya chat in App.tsx failed:", err);
                });
              }
            }
            
            if (!data.displayName && user.displayName) {
              updateDoc(profileRef, { displayName: user.displayName });
            }
          }
        }, (error) => {
          // Only report if we haven't logged out
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            if (error instanceof Error && error.message.includes('Quota exceeded')) {
              setConnectionError("Daily access limit reached. Please try again later.");
            } else {
              setConnectionError("Failed to synchronize profile.");
            }
          }
        });
      } catch (e) {
        if (auth.currentUser) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
          setConnectionError("Network connection error.");
        }
      } finally {
        setLoading(false);
      }
    };

    initProfile();

    return () => {
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    
    const updatePresence = async () => {
      try {
        if (auth.currentUser) {
          const nowStr = new Date().toISOString();
          await updateDoc(doc(db, 'users', user.uid), {
            'activityMetrics.lastActive': nowStr,
            lastSeen: nowStr,
            status: 'active'
          });
        }
      } catch (e) {
        console.warn("Presence update ignored (profile doc might be initializing):", e);
      }
    };

    updatePresence(); // Trigger immediately on mount/load

    const interval = setInterval(async () => {
      if (auth.currentUser && !document.hidden) {
        await updatePresence();
      }
    }, 60000); // Trigger every 1 minute for precise active tracking
    return () => clearInterval(interval);
  }, [user?.uid, !!profile]);

  const [bordeauxConfig, setBordeauxConfig] = useState<{
    show: boolean;
    onMeetCenter?: () => void;
    onComplete?: () => void;
  }>({ show: false });

  const toggleTheme = React.useCallback(() => setTheme(prev => prev === 'light' ? 'dark' : 'light'), []);

  const triggerBordeaux = React.useCallback((onMeetCenter?: () => void, onComplete?: () => void, isOnboardingTransition?: boolean) => {
    if (!isOnboardingTransition) {
      if (onMeetCenter) onMeetCenter();
      if (onComplete) onComplete();
      return;
    }

    setBordeauxConfig({
      show: true,
      onMeetCenter,
      onComplete
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, theme, toggleTheme, connectionError, triggerBordeaux }}>
      <RouterProvider router={router} />
      {bordeauxConfig.show && (
        <BordeauxTransition 
          onMeetCenter={() => {
            if (bordeauxConfig.onMeetCenter) {
              bordeauxConfig.onMeetCenter();
            }
          }}
          onComplete={() => {
            setBordeauxConfig(prev => ({ ...prev, show: false }));
            if (bordeauxConfig.onComplete) {
              bordeauxConfig.onComplete();
            }
          }}
        />
      )}
    </AuthContext.Provider>
  );
}
