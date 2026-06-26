import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Bot, 
  User as UserIcon,
  RefreshCw,
  Users,
  Heart,
  ChevronRight,
  X,
  Check
} from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Logo } from '../components/Logo';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, collection, query, where, getDocs, limit, increment, addDoc, arrayUnion } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { chatWithMaya, analyzeProfile, summarizeMemory } from '../lib/gemini';
import { MayaMessage, MayaConversation, EmotionalProfile, UserProfile, Connection } from '../types';

import { TransactionOverlay } from '../components/TransactionOverlay';
import { AIMatchmakingEngine } from '../lib/aiMatchmakingEngine';
import { createNotification } from '../lib/notifications';
import { CinematicConnection } from '../components/CinematicConnection';
import { MOCK_COMPANIONS } from '../lib/userService';

export default function MayaChat() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messages, setMessages] = useState<MayaMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allRecommendations, setAllRecommendations] = useState<UserProfile[]>([]);
  const [recommendations, setRecommendations] = useState<UserProfile[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [showConnectionDetailModal, setShowConnectionDetailModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showPremiumModalState, setShowPremiumModalState] = useState(false);
  const setShowPremiumModal = (val: boolean) => {
    if (val && profile?.isPremium) return;
    setShowPremiumModalState(val);
  };
  const showPremiumModal = showPremiumModalState;
  
  const [showCooldownModal, setShowCooldownModal] = useState(false);

  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionMatch, setTransitionMatch] = useState<UserProfile | null>(null);
  
  // Premium simulation states
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  // Companion report compilation and dispatch states
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportResult, setReportResult] = useState<{ status: string; message?: string } | null>(null);

  const lastSentTime = profile?.lastReportSentAt ? new Date(profile.lastReportSentAt).getTime() : 0;
  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
  const isReportLocked = profile?.lastReportSentAt ? (Date.now() - lastSentTime < oneWeekInMs) : false;

  const getRemainingDays = () => {
    if (!profile?.lastReportSentAt) return 0;
    const diff = (lastSentTime + oneWeekInMs) - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  const sendCompanionReport = async (forceManual = false) => {
    if (!user || !profile || isSendingReport) return;

    if (isReportLocked) {
      setReportResult({
        status: "error",
        message: `Your companion report is available once a week. Your next report is available in ${getRemainingDays()} days.`
      });
      return;
    }
    
    if (!forceManual) {
      const alreadySent = sessionStorage.getItem(`report_sent_${user.uid}`);
      if (alreadySent) return;
    }

    setIsSendingReport(true);
    setReportResult({ 
      status: "pending", 
      message: "Maya is synthesizing your preferences and chatting patterns into a discovery report..." 
    });

    try {
      console.log("[Companion Report] Building payload and invoking backend report generator...");
      const response = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: user.email || profile.email || "",
          recipientName: profile.displayName || user.displayName || "Companion",
          preferences: {
            currentSituation: profile.currentSituation || [],
            whyJoined: profile.whyJoined || [],
            interests: profile.interests || []
          },
          messages: messages,
          emotionalProfile: profile.emotionalProfile || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const resData = await response.json();
      console.log("[Companion Report] Succeed:", resData);

      if (resData.status === "success") {
        setReportResult({
          status: "success",
          message: `Deep reflection report has been successfully dispatched to ${user.email || profile.email}! (Via ${resData.provider})`
        });
      } else if (resData.status === "mocked") {
        setReportResult({
          status: "success",
          message: "Deep reflection report compiled in backend logs successfully! Provide credentials for email inbox delivery."
        });
      } else {
        throw new Error(resData.error || "Unknown server response");
      }

      // Save in Firestore that the report was dispatched and record the timestamp to enforce the weekly limit
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { 
        reportEmailSent: true,
        lastReportSentAt: new Date().toISOString()
      }).catch(err => {
        console.error("Failed to set reportEmailSent in Firestore user doc:", err);
      });

      sessionStorage.setItem(`report_sent_${user.uid}`, 'true');
    } catch (err: any) {
      console.error("[Companion Report] Error caught:", err);
      setReportResult({
        status: "error",
        message: `Failed to compile deep reflection report: ${err.message || err.toString()}`
      });
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleUpgradeFromMaya = async () => {
    if (!user) return;
    setShowPremiumModal(false);
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
        console.error("Failed to upgrade during simulation:", err);
      } finally {
        setIsProcessingUpgrade(false);
      }
    }, 4200);
  };

  // Custom states to address user instructions
  const [hasSentMessageThisSession, setHasSentMessageThisSession] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);

  // Randomized exchanges (5 to 7 exchanges) before recommendation.
  const [maxExchanges] = useState<number>(() => {
    return Math.floor(Math.random() * 3) + 5; // Generates 5, 6, or 7
  });

  // Exactly 8 exchanges triggers the pause / cooldown trigger
  const exchangesNeeded = 8;

  const [refreshCount, setRefreshCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    const saved = localStorage.getItem('maya_cooldown_end');
    if (saved) {
      const remaining = Math.ceil((new Date(saved).getTime() - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const isNewUser = !profile?.createdAt || 
                    (new Date().getTime() - new Date(profile.createdAt).getTime()) < (24 * 60 * 60 * 1000);

  const now = new Date();
  const userMessagesCount = messages.filter(m => m.role === 'user').length;
  
  // Cooldown is active if user messages are exactly 8 or more, or if we have an active timer (only for non-premium users)
  const isCooldownActive = !profile?.isPremium && (userMessagesCount >= 8 || timeRemaining > 0 || !!(profile?.cooldownEnd && new Date(profile.cooldownEnd) > now));
  
  // Recommendations shown when userMessageCount exceeds the randomized 5-7 threshold OR if cooldown is active
  const isSessionCompleted = (hasSentMessageThisSession && userMessagesCount >= maxExchanges) || isCooldownActive;

  const [cooldownRemainingStr, setCooldownRemainingStr] = useState<string>('');

  useEffect(() => {
    if (!profile?.isPremium && userMessagesCount >= 8 && timeRemaining === 0) {
      const saved = localStorage.getItem('maya_cooldown_end');
      if (!saved) {
        const endTime = new Date(Date.now() + 90 * 60 * 1000).toISOString(); // 90 minutes
        localStorage.setItem('maya_cooldown_end', endTime);
        setTimeRemaining(5400); // 5400 seconds (90 minutes)
        setShowCooldownModal(true);
      }
    }
  }, [userMessagesCount, timeRemaining, profile?.isPremium]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            localStorage.removeItem('maya_cooldown_end');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Automated Backdrop Trigger for report generation once Maya finishes chatting
  useEffect(() => {
    if (isSessionCompleted && messages.length >= 3) {
      if (!isReportLocked) {
        sendCompanionReport(false);
      }
    }
  }, [isSessionCompleted, messages.length, isReportLocked]);

  const handleRefreshRecommendations = () => {
    if (!profile?.isPremium && refreshCount >= 3) {
      setShowPremiumModal(true);
      return;
    }

    setRefreshCount(prev => prev + 1);
    setIsRefreshing(true);

    setTimeout(() => {
      if (allRecommendations.length > 3) {
        const nextIdx = ((refreshCount + 1) * 3) % allRecommendations.length;
        let selected = allRecommendations.slice(nextIdx, nextIdx + 3);
        if (selected.length < 3) {
          selected = [...selected, ...allRecommendations.slice(0, 3 - selected.length)];
        }
        setRecommendations(selected);
      } else if (allRecommendations.length > 0) {
        const shuffled = [...allRecommendations].sort(() => Math.random() - 0.5);
        setRecommendations(shuffled.slice(0, 3));
      }
      setIsRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    if (!profile?.cooldownEnd) {
      setCooldownRemainingStr('');
      return;
    }
    const updateCountdown = () => {
      const diffMs = new Date(profile.cooldownEnd!).getTime() - Date.now();
      if (diffMs <= 0) {
        setCooldownRemainingStr('');
        return;
      }
      const totalMin = Math.ceil(diffMs / (1000 * 60));
      const hours = Math.floor(totalMin / 60);
      const minutes = totalMin % 60;
      setCooldownRemainingStr(`${String(hours).padStart(2, '0')}-${String(minutes).padStart(2, '0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [profile?.cooldownEnd]);

  useEffect(() => {
    if (profile?.cooldownEnd) {
      const remaining = Math.max(0, Math.ceil((new Date(profile.cooldownEnd).getTime() - Date.now()) / 1000));
      if (remaining > 0) {
        setTimeRemaining(remaining);
        localStorage.setItem('maya_cooldown_end', profile.cooldownEnd);
      }
    }
  }, [profile?.cooldownEnd]);

  useEffect(() => {
    if (isCooldownActive) {
      setShowCooldownModal(true);
    } else {
      setShowCooldownModal(false);
    }
  }, [isCooldownActive]);

  const getComebackMessage = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `You have reached your free limit. Come back after ${hours}:${minutes} ${ampm}.`;
  };

  const formatComebackTime = (dateStr?: string) => {
    if (!dateStr) return "";
    return getComebackMessage(dateStr);
  };

  useEffect(() => {
    if (!user) return;
    
    const uids = profile?.recommendedUids || [];
    const historical = profile?.historicalRecommendedUids || [];
    const activeUids = uids.filter(uid => !historical.includes(uid));

    const loadRecommendedProfiles = async () => {
      setIsLoadingRecommendations(true);
      try {
        const queryUids = activeUids.slice(0, 10);
        let resolvedProfiles: UserProfile[] = [];

        if (queryUids.length > 0) {
          const resolved = await Promise.all(queryUids.map(uid => getDoc(doc(db, 'users', uid))));
          resolvedProfiles = resolved.map(d => d.exists() ? d.data() as UserProfile : null).filter((p): p is UserProfile => p !== null);
        }

        // --- FALLBACK TO GUARANTEE MATCHES AT ANY COST ---
        if (resolvedProfiles.length === 0) {
          try {
            const snap = await getDocs(query(collection(db, 'users'), limit(40)));
            resolvedProfiles = snap.docs
              .map(d => d.data() as UserProfile)
              .filter(u => u.uid !== user!.uid && u.displayName);
            
            resolvedProfiles.forEach(u => {
              (u as any).isFallbackOnMount = true;
            });
          } catch (fbErr) {
            console.warn("loadRecommendedProfiles fallback query failed:", fbErr);
          }
        }

        // Absolute Failsafe: if still empty, fetch from MOCK_COMPANIONS
        if (resolvedProfiles.length === 0) {
          resolvedProfiles = [...MOCK_COMPANIONS].filter(u => u.uid !== user!.uid);
        }

        let conns: Connection[] = [];
        try {
          const connsSnap = await getDocs(query(collection(db, 'connections'), where('users', 'array-contains', user.uid)));
          conns = connsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
        } catch (connErr) {
          console.warn("Could not query connections in loadRecommendedProfiles", connErr);
        }

        // Rank the loaded candidates using our authentic AIMatchmakingEngine
        if (profile) {
          resolvedProfiles = AIMatchmakingEngine.rankFirestoreCandidates(
            profile,
            resolvedProfiles,
            conns,
            []
          );
        }

        // Adjust scores if they were fallback
        resolvedProfiles.forEach(u => {
          if ((u as any).isFallbackOnMount) {
            u.matchScore = Math.max(30, Math.min(48, Math.floor((u.matchScore || 0) * 0.45)));
          }
        });

        setAllRecommendations(resolvedProfiles);
        setRecommendations(resolvedProfiles.slice(0, 3));
      } catch (e) {
        console.error("Error loading recommended profiles:", e);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    loadRecommendedProfiles();
  }, [profile?.recommendedUids, profile?.historicalRecommendedUids, user?.uid]);

  const handleModuleFocus = (moduleName: string) => {
    if (moduleName !== activeModule) {
      setActiveModule(moduleName);
      
      // Rotate active 3 recommendations smoothly when cursor moves between main sections
      if (allRecommendations.length > 3) {
        setCycleIndex((prev) => {
          const nextIndex = (prev + 1) % (allRecommendations.length - 2);
          const nextThree = allRecommendations.slice(nextIndex, nextIndex + 3);
          
          if (nextThree.length === 3) {
            setRecommendations(nextThree);
          } else {
            setRecommendations([
              ...nextThree,
              ...allRecommendations.slice(0, 3 - nextThree.length)
            ].slice(0, 3));
          }
          return nextIndex;
        });
      }
    }
  };

  // Synchronized Daily Midnight Reset of Chat & Metrics
  useEffect(() => {
    if (!profile || !user) return;

    const now = new Date();
    const lastResetStr = profile.activityMetrics?.lastDailyResetAt;
    const isNewDay = !lastResetStr || new Date(lastResetStr).toDateString() !== now.toDateString();

    if (isNewDay) {
      const LOCAL_RESET_KEY = `delusion_daily_reset_sync_${user.uid}_${now.toDateString().replace(/\s/g, '_')}`;
      if (!localStorage.getItem(LOCAL_RESET_KEY)) {
        localStorage.setItem(LOCAL_RESET_KEY, 'true');

        const performDailySyncReset = async () => {
          try {
            console.log("Midnight reached! Sync reset initiated...");
            
            // 1. Reset user activity metrics and counters in Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              messagesUsed: 0,
              cooldownEnd: null,
              'activityMetrics.totalMayaTime': 0,
              'activityMetrics.totalPeerTime': 0,
              'activityMetrics.lastDailyResetAt': now.toISOString(),
              'activityMetrics.lastActive': now.toISOString(),
              updatedAt: now.toISOString()
            });

            // 2. Reset Maya conversation to initial welcome message in Firestore
            const convRef = doc(db, 'conversations_maya', user.uid);
            const welcomeMsg: MayaMessage = { 
              role: 'assistant', 
              content: `Hi ${profile?.displayName?.split(' ')[0] || 'there'}, I'm Maya. I am a psychologist-like AI. I'm here to listen to your problems, understand your pain, and suggest the right companion who shares your mindset. How have you been feeling lately?`
            };
            await setDoc(convRef, {
              userId: user.uid,
              messages: [welcomeMsg],
              lastUpdated: now.toISOString()
            }, { merge: true });

            console.log("Daily Midnight synchronization completes smoothly.");
          } catch (err) {
            console.error("Daily sync reset error:", err);
            localStorage.removeItem(LOCAL_RESET_KEY); // allow retry
          }
        };

        performDailySyncReset();
      }
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;

    const convRef = doc(db, 'conversations_maya', user.uid);
    const unsub = onSnapshot(convRef, async (snap) => {
      const autoWelcome: MayaMessage = { 
        role: 'assistant', 
        content: `Hi ${profile?.displayName?.split(' ')[0] || 'there'}, I'm Maya. I am a psychologist-like AI. I'm here to listen to your problems, understand your pain, and suggest the right companion who shares your mindset. How have you been feeling lately?`
      };

      if (snap.exists()) {
        const data = snap.data() as MayaConversation;
        
        // Sleep-based Reset Logic: Reset if returned after a long break (> 5 hours) and it's morning
        // or if it's been more than 18 hours since the last message.
        if (data.lastUpdated) {
          const lastUpdated = new Date(data.lastUpdated);
          const now = new Date();
          const diffHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
          const currentHour = now.getHours();
          
          if ((diffHours >= 5 && currentHour >= 5 && currentHour <= 11) || diffHours > 16) {
            try {
              await updateDoc(convRef, {
                messages: [autoWelcome],
                lastUpdated: new Date().toISOString()
              });
              setMessages([autoWelcome]);

              // Automatically reset user stats and recommendations for a fresh session
              const userRef = doc(db, 'users', user.uid);
              const updates: any = {
                messagesUsed: 0,
                recommendedUids: [],
                updatedAt: new Date().toISOString()
              };
              if (profile?.recommendedUids && profile.recommendedUids.length > 0) {
                updates.historicalRecommendedUids = arrayUnion(...profile.recommendedUids);
              }
              await updateDoc(userRef, updates);
              return;
            } catch (e) {
              console.error("Error during sleep reset:", e);
            }
          }
        }
        
        setMessages(data.messages || []);
      } else {
        try {
          await setDoc(convRef, {
            userId: user.uid,
            messages: [autoWelcome],
            lastUpdated: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `conversations_maya/${user.uid}`);
        }
      }
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, `conversations_maya/${user.uid}`);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // Track time spent with Maya (10m frequency to save quota)
  useEffect(() => {
    if (!user || !profile) return;
    
    const interval = setInterval(async () => {
      try {
        if (!document.hidden && auth.currentUser) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            'activityMetrics.totalMayaTime': increment(10),
            'activityMetrics.lastActive': new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error updating Maya time:", err);
      }
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, [user?.uid]);

  const fetchRecommendations = async (): Promise<number> => {
    if (!user || !profile) return 0;
    
    let potentialUsers: UserProfile[] = [];
    let activeConnsCount = 0;

    setIsLoadingRecommendations(true);
    try {
      let conns: Connection[] = [];
      try {
        const connsSnap = await getDocs(query(collection(db, 'connections'), where('users', 'array-contains', user.uid)));
        conns = connsSnap.docs.map(d => d.data() as Connection);
      } catch (connErr) {
        console.warn("Could not query connections in MayaChat, continuing with activeConns = empty: ", connErr);
      }
      
      const activeConns = conns.filter(c => c.status === 'accepted' && (!c.removedBy || c.removedBy.length === 0));
      activeConnsCount = activeConns.length;

      const historicalRecommendedUids = profile.historicalRecommendedUids || [];
      const connectedUids = conns.map(c => {
        return c.users.find((id: string) => id !== user!.uid);
      }).filter(Boolean) as string[];

      // Targeted query for onboarded users, limited to 40 to save quota
      try {
        const q = query(
          collection(db, 'users'),
          where('onboarded', '==', true),
          limit(40)
        );
        const snap = await getDocs(q);
        
        potentialUsers = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.uid !== user!.uid && u.onboarded && u.displayName && !connectedUids.includes(u.uid) && !historicalRecommendedUids.includes(u.uid));

        // Relaxed Fallback 1: If no fully-onboarded matching unconnected users are found, fetch other registered unconnected users
        if (potentialUsers.length === 0) {
          const qRelaxed = query(
            collection(db, 'users'),
            limit(40)
          );
          const snapRelaxed = await getDocs(qRelaxed);
          potentialUsers = snapRelaxed.docs
            .map(d => d.data() as UserProfile)
            .filter(u => u.uid !== user!.uid && u.displayName && !connectedUids.includes(u.uid) && !historicalRecommendedUids.includes(u.uid));
        }

        // Relaxed Fallback 2: If we still don't have anyone, allow showing other registered unconnected users as recommendations (never show already connected ones)
        if (potentialUsers.length === 0) {
          const qRelaxed2 = query(
            collection(db, 'users'),
            limit(40)
          );
          const snapRelaxed2 = await getDocs(qRelaxed2);
          potentialUsers = snapRelaxed2.docs
            .map(d => d.data() as UserProfile)
            .filter(u => u.uid !== user!.uid && u.displayName && !connectedUids.includes(u.uid) && !historicalRecommendedUids.includes(u.uid));
        }

        // Relaxed Fallback 3 (NEW / SHIFTED UP): If no users match unconnected/unrecommended, search ALL registered users excluding active user
        if (potentialUsers.length === 0) {
          const fallbackSnap = await getDocs(query(collection(db, 'users'), limit(40)));
          potentialUsers = fallbackSnap.docs
            .map(d => d.data() as UserProfile)
            .filter(u => u.uid !== user!.uid && u.displayName);
          
          potentialUsers.forEach(u => {
            (u as any).isFallback = true;
          });
        }

        // Relaxed Fallback 4 (Absolute failsafe): If still empty, use MOCK_COMPANIONS to guarantee matchmaking list is populated
        if (potentialUsers.length === 0) {
          potentialUsers = [...MOCK_COMPANIONS].filter(u => u.uid !== user!.uid);
          potentialUsers.forEach(u => {
            (u as any).isFallback = true;
          });
        }
      } catch (userQueryErr) {
        console.warn("Firestore user query failed due to permissions or database status:", userQueryErr);
        potentialUsers = [];
      }

      // Smart Sorting based on compatibility score formula:
      const getMatchingScore = (p: UserProfile): number => {
        const pEp = p.emotionalProfile;
        
        let score = 50; // Warm, supportive baseline compatibility (minimum 50%)

        // 1. Emotional Similarity (Max +20%)
        const userEmotionalTags = profile.emotionalProfile?.emotionalTags || profile.emotionalProfile?.moodKeywords || [];
        const compEmotionalTags = pEp?.emotionalTags || pEp?.moodKeywords || [];
        if (userEmotionalTags.length > 0 && compEmotionalTags.length > 0) {
          const emotionalOverlap = userEmotionalTags.filter((t: string) => compEmotionalTags.includes(t)).length;
          const maxTags = Math.max(userEmotionalTags.length, 1);
          score += (emotionalOverlap / maxTags) * 20;
        } else {
          score += 5; // Steady base support
        }

        // 2. Shared Interests (Max +15%)
        const userInterests = (profile.interests || profile.emotionalProfile?.interests || []) as string[];
        const compInterests = (p.interests || pEp?.interests || []) as string[];
        if (userInterests.length > 0 && compInterests.length > 0) {
          const interestsOverlap = userInterests.filter((i: string) => compInterests.includes(i)).length;
          const maxInterests = Math.max(userInterests.length, 1);
          score += (interestsOverlap / maxInterests) * 15;
        } else {
          score += 5;
        }

        // 3. Personality & Traits Alignment (Max +10%)
        const userTraits = (profile.emotionalProfile?.traits || []) as string[];
        const compTraits = (pEp?.traits || []) as string[];
        if (userTraits.length > 0 && compTraits.length > 0) {
          const traitsOverlap = userTraits.filter((t: string) => compTraits.includes(t)).length;
          const maxTraits = Math.max(userTraits.length, 1);
          score += (traitsOverlap / maxTraits) * 10;
        } else {
          score += 3;
        }

        // 4. Life Stage / Age Compatibility (Max +25%) - Highly prioritized
        const userAge = profile.age || profile.ageGroup || "";
        const compAge = p.age || p.ageGroup || "";
        if (userAge && compAge && userAge === compAge) {
          score += 25;
        } else {
          score += 4;
        }

        return Math.round(Math.min(99, Math.max(60, score)));
      };

      // Assign calculated scores
      potentialUsers.forEach(u => {
        const rawScore = getMatchingScore(u);
        if ((u as any).isFallback) {
          u.matchScore = Math.max(30, Math.min(48, Math.floor(rawScore * 0.45)));
        } else {
          u.matchScore = rawScore;
        }
      });

      // Sort: Prioritize new users first (joined in the last 15 days or has newer createdAt date), then by matchScore descending
      potentialUsers.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        const isNewA = a.createdAt ? (Date.now() - dateA < 15 * 24 * 60 * 60 * 1000) : false;
        const isNewB = b.createdAt ? (Date.now() - dateB < 15 * 24 * 60 * 60 * 1000) : false;

        if (isNewA && !isNewB) return -1;
        if (!isNewA && isNewB) return 1;

        if (dateA !== dateB) {
          return dateB - dateA;
        }

        return (b.matchScore || 0) - (a.matchScore || 0);
      });

      // Must recommend from database: maximum of 3 profiles and minimum of 1 profile (as long as other users exist)
      const countToTake = Math.min(3, Math.max(1, potentialUsers.length));
      const docs = potentialUsers.slice(0, countToTake);
      
      // AUTO CONNECT LOGIC: Connect with the most similar candidate user if within connection limits
      const isOverLimit = !profile?.isPremium && activeConnsCount >= 2;
      if (potentialUsers.length > 0 && !isOverLimit) {
        const mostSimilar = potentialUsers[0];
        
        try {
          await addDoc(collection(db, 'connections'), {
            users: [user.uid, mostSimilar.uid],
            status: 'accepted',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            initiatorId: user.uid,
            receiverId: mostSimilar.uid
          });

          // Skip email notification as Resend service has been removed
          console.log("Auto connection established with", mostSimilar.displayName);
        } catch (connCreateErr) {
          console.warn("Could not auto-create connections document in MayaChat (probably permission restricted to other's match requests):", connCreateErr);
        }
      }
      
      if (docs.length > 0) {
        setRecommendations(docs);
        const validUids = docs.map(d => d.uid).filter(Boolean);
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            recommendedUids: validUids,
            recommendationRefreshNeeded: false,
            updatedAt: new Date().toISOString()
          });
        } catch (updateUserErr) {
          console.warn("Could not save recommended UIDs to current user profile in Firestore (probably permission restricted):", updateUserErr);
        }
        return validUids.length;
      }
      return 0;
    } catch (err) {
      console.warn("Graceful fallback for fetchRecommendations inside catch block: ", err);
      setRecommendations([]);
      return 0;
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping || !user || !profile) return;

    if (isCooldownActive) {
      setInputText('');
      setShowPremiumModal(true);
      return;
    }

    if (!profile.isPremium && (profile.messagesUsed || 0) >= 8) {
      setInputText('');
      alert("You have reached your limit of 8 exchanges. Please take a temporary pause or upgrade for unlimited!");
      setShowPremiumModal(true);
      return;
    }

    const userMsg: MayaMessage = { role: 'user', content: inputText.trim() };
    const newMessages = [...messages, userMsg];
    
    setInputText('');
    setMessages(newMessages);
    setIsTyping(true);
    setHasSentMessageThisSession(true);

    const userMsgCount = newMessages.filter(m => m.role === 'user').length;
    // Triggers recommendation on meeting randomized threshold between 5 and 7
    // Still recommend for both basic and premium users in the same way (at the threshold)
    const shouldRecommend = (userMsgCount === maxExchanges);
    const isSessionEnded = !profile?.isPremium && userMsgCount > 8;

    try {
      const convRef = doc(db, 'conversations_maya', user.uid);
      const userRef = doc(db, 'users', user.uid);

      if (isSessionEnded) {
        // Maya does NOT reply. The last message is from the user.
        setIsTyping(false);
        try {
          await updateDoc(convRef, {
            messages: newMessages,
            lastUpdated: new Date().toISOString()
          });

          const newMessagesUsed = (profile.messagesUsed || 0) + 1;
          const updateData: any = {
            'activityMetrics.totalMayaTime': increment(1),
            'activityMetrics.lastActive': new Date().toISOString(),
            lastMayaInteractionAt: new Date().toISOString(),
            messagesUsed: newMessagesUsed,
            updatedAt: new Date().toISOString()
          };

          if (newMessagesUsed % 10 === 0) {
            const newSummary = await summarizeMemory(newMessages, profile.userMemorySummary);
            updateData.userMemorySummary = newSummary;
          }

          await updateDoc(userRef, updateData);
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `conversations_maya/${user.uid}`);
        }

        // Analyze and update profile
        setIsAnalyzing(true);
        try {
          const newEmotionalProfile = await analyzeProfile(newMessages, profile.emotionalProfile);
          if (newEmotionalProfile) {
            const userUpdate: any = {
              emotionalProfile: newEmotionalProfile as EmotionalProfile,
              updatedAt: new Date().toISOString()
            };

            const cooldownDuration = 90 * 60 * 1000; // 90 minutes
            userUpdate.cooldownEnd = new Date(Date.now() + cooldownDuration).toISOString();
            // Reset daily messages count
            userUpdate.messagesUsed = 0; 

            if (shouldRecommend) {
              userUpdate.recommendationRefreshNeeded = true;
            }

            await updateDoc(doc(db, 'users', user.uid), userUpdate);
            
            if (shouldRecommend) {
              await fetchRecommendations();
            }

            setShowCooldownModal(true);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        } finally {
          setIsAnalyzing(false);
        }
        return;
      }

      // If session is NOT ended, normal flow: generate response from Maya:
      const contextMessages = newMessages.slice(-10);
      
      const profileDetails = {
        displayName: profile.displayName,
        age: profile.age,
        ageGroup: profile.ageGroup,
        currentSituation: profile.currentSituation,
        whyJoined: profile.whyJoined,
        interests: profile.interests,
        personality: profile.personality,
        isNewUser
      };

      let response = await chatWithMaya(contextMessages, profile.userMemorySummary, profile.emotionalProfile, profileDetails);
      setIsTyping(false);

      response = response.replace('[PROFILE_READY]', '').replace('[UPDATE_PROFILE]', '').trim();

      const assistantMsg: MayaMessage = { role: 'assistant', content: response };
      let finalMessages = [...newMessages, assistantMsg];
      
      try {
        await updateDoc(convRef, {
          messages: finalMessages,
          lastUpdated: new Date().toISOString()
        });

        const newMessagesUsed = (profile.messagesUsed || 0) + 1;
        const updateData: any = {
          'activityMetrics.totalMayaTime': increment(1),
          'activityMetrics.lastActive': new Date().toISOString(),
          lastMayaInteractionAt: new Date().toISOString(),
          messagesUsed: newMessagesUsed,
          updatedAt: new Date().toISOString()
        };

        if (newMessagesUsed % 10 === 0) {
          const newSummary = await summarizeMemory(finalMessages, profile.userMemorySummary);
          updateData.userMemorySummary = newSummary;
        }

        await updateDoc(userRef, updateData);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `conversations_maya/${user.uid}`);
      }

      // Analyze and update profile every time after chat with Maya
      setIsTyping(false);
      setIsAnalyzing(true);
      try {
        const newEmotionalProfile = await analyzeProfile(finalMessages, profile.emotionalProfile);
        if (newEmotionalProfile) {
          const userUpdate: any = {
            emotionalProfile: newEmotionalProfile as EmotionalProfile,
            updatedAt: new Date().toISOString()
          };

          if (profile?.isPremium && shouldRecommend) {
            userUpdate.recommendationRefreshNeeded = true;
          }

          await updateDoc(doc(db, 'users', user.uid), userUpdate);

          if (profile?.isPremium && shouldRecommend) {
            await fetchRecommendations();
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err: any) {
      console.error("Maya Error:", err);
      let userFriendlyMessage = "I'm having a little trouble connecting right now. Please try again in a moment.";
      const errorMsgText = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));

      if (errorMsgText.includes('API key') || errorMsgText.includes('503')) {
        userFriendlyMessage = "My AI core is not configured correctly. Please check the environment configuration.";
      } else if (errorMsgText.includes('quota') || errorMsgText.includes('429')) {
        userFriendlyMessage = "I've been quite busy listening to many souls today and I need a tiny moment to rest my mind. I'll be back fully refreshed very soon. Thank you for your patience.";
      } else if (errorMsgText.includes('unexpected pattern')) {
         userFriendlyMessage = "There was a glitch in the neural link (pattern mismatch). Let's try sending that again.";
      } else if (errorMsgText) {
        userFriendlyMessage = `Connection issue: ${errorMsgText.slice(0, 100)}${errorMsgText.length > 100 ? '...' : ''}`;
      }

      const errorMsg: MayaMessage = { role: 'assistant', content: userFriendlyMessage };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    if (!user || isRefreshing) return;
    if (isCooldownActive) {
      alert(`Chatbot is currently cooling down. Cooldown remaining: ${cooldownRemainingStr}. Choose Premium for unlimited chat!`);
      return;
    }
    setIsRefreshing(true);
    try {
      const convRef = doc(db, 'conversations_maya', user.uid);
      const manualWelcomeMsg = { 
        role: 'assistant', 
        content: `Hi ${profile?.displayName?.split(' ')[0] || 'there'}, I'm Maya. I am a psychologist-like AI. I'm here to listen to your problems, understand your pain, and suggest the right companion who shares your mindset. How have you been feeling lately?`
      } as MayaMessage;
      await updateDoc(convRef, {
        messages: [manualWelcomeMsg],
        lastUpdated: new Date().toISOString()
      });
      setMessages([manualWelcomeMsg]);

      // Move current recommendations to historical and reset
      const userRef = doc(db, 'users', user.uid);
      const updates: any = {
        messagesUsed: isCooldownActive ? (profile?.messagesUsed || 6) : 0,
        recommendedUids: [],
        updatedAt: new Date().toISOString()
      };
      if (profile?.recommendedUids && profile.recommendedUids.length > 0) {
        updates.historicalRecommendedUids = arrayUnion(...profile.recommendedUids);
      }
      await updateDoc(userRef, updates);
    } catch (err) {
      console.error("Error clearing chat:", err);
      handleFirestoreError(err, OperationType.UPDATE, `conversations_maya/${user.uid}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user || !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base">
        <Logo className="animate-pulse text-brand-primary" size={60} />
        <p className="mt-8 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-brand-primary animate-pulse">Synchronizing Chatbot...</p>
      </div>
    );
  }

  return (
    <div id="mayachat-view-container" className="flex-1 flex flex-col h-[calc(100vh-12rem)] sm:h-[calc(100vh-14rem)] md:h-[calc(100vh-8rem)] overflow-hidden bg-transparent">
      <header 
        onMouseEnter={() => handleModuleFocus('header')} 
        className="bg-bg-base/70 backdrop-blur-md border-b border-brand-primary/10 px-4 sm:px-8 md:px-16 py-4 sm:py-6 md:py-8 flex items-center justify-between z-40"
      >
        <div className="flex items-center gap-4 sm:gap-8">
          <Link to="/dashboard" className="w-10 h-10 sm:w-12 sm:h-12 cred-inset flex items-center justify-center text-brand-primary/60 hover:text-brand-primary transition-all">
            <ArrowLeft size={18} className="sm:size-[20px]" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 cred-elevation flex items-center justify-center text-brand-primary relative">
              <Logo size={32} className="text-brand-primary sm:size-[40px]" />
              <div className="absolute inset-0 bg-brand-primary/10 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-text-base uppercase tracking-tighter italic">Maya</h2>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[7px] sm:text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] sm:tracking-[0.4em]">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_var(--color-brand-primary)]"></span>
                AI Support
                {isCooldownActive && cooldownRemainingStr && (
                  <span className="text-brand-accent ml-2 font-mono normal-case tracking-normal">
                    (Cooldown: {cooldownRemainingStr})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {!profile?.isPremium ? (
            <button
              type="button"
              onClick={() => sendCompanionReport(true)}
              disabled={isSendingReport || userMessagesCount === 0}
              title={userMessagesCount === 0 ? "Send a message to Maya first to compile your report" : "Compile & Email Companion Discovery Report"}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-black text-[8px] sm:text-[9.5px] uppercase tracking-wider transition-all duration-300 border cursor-pointer select-none
                ${userMessagesCount === 0
                  ? 'opacity-30 cursor-not-allowed border-brand-primary/5 text-text-muted bg-transparent'
                  : isSendingReport
                    ? 'border-brand-primary/30 text-brand-primary bg-brand-primary/5 animate-pulse'
                    : reportResult?.status === 'success'
                      ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/[0.04]'
                      : 'border-brand-primary/10 text-brand-primary/80 bg-brand-primary/[0.02] hover:bg-brand-primary/10 hover:border-brand-primary/30 hover:text-brand-primary'
                }`}
            >
              <Sparkles size={11} className={isSendingReport ? "animate-spin text-brand-primary" : "text-brand-primary"} />
              <span>
                {userMessagesCount === 0
                  ? "Chat with Maya to Unlock"
                  : isSendingReport 
                    ? "Compiling..." 
                    : reportResult?.status === "success" 
                      ? "Report Dispatched" 
                      : "Email My Report"
                }
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-brand-accent/20 bg-brand-accent/[0.03] text-brand-accent animate-fade-in max-w-[200px] sm:max-w-xs truncate">
              <Sparkles size={11} className={isSendingReport ? "animate-spin text-brand-accent" : "text-brand-accent animate-pulse"} />
              <span className="font-mono text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider truncate">
                {isSendingReport 
                  ? "Compiling report..." 
                  : reportResult?.status === "success" 
                    ? `Sent: ${user?.email || profile?.email || ''}` 
                    : `Active: ${user?.email || profile?.email || ''}`
                }
              </span>
            </div>
          )}

          <button 
            onClick={clearChat}
            title={isRefreshing ? "Resetting..." : "Restart Conversation"}
            className={`w-10 h-10 sm:w-12 sm:h-12 cred-inset flex items-center justify-center transition-all ${isRefreshing ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-primary/60 hover:text-brand-primary'}`}
          >
            <RefreshCw size={16} className={`sm:size-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div 
        ref={scrollRef}
        onMouseEnter={() => handleModuleFocus('conversation')}
        className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-10 pb-24 md:pb-20">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  id={`maya-msg-${i}`}
                  className={`
                    max-w-[85%] md:max-w-[70%] p-4 py-3 sm:p-6 md:p-7 transition-all duration-500 relative break-words
                    ${msg.role === 'user' 
                      ? 'bg-brand-primary text-white font-bold tracking-wide text-sm sm:text-base rounded-[16px] sm:rounded-[24px] rounded-tr-none shadow-[4px_4px_15px_rgba(128,0,32,0.1)]' 
                      : 'cred-elevation text-text-base text-sm sm:text-base font-medium leading-relaxed rounded-[16px] sm:rounded-[24px] rounded-tl-none border-l-4 border-l-brand-primary whitespace-pre-wrap'}
                  `}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {false ? (
              isLoadingRecommendations ? (
                <div className="flex items-center gap-3 justify-center py-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
                  <span className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] animate-pulse">
                    Searching database soul matches...
                  </span>
                </div>
              ) : recommendations.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-6 sm:pt-10 max-w-xl text-left"
                  onMouseEnter={() => handleModuleFocus('recommendations')}
                >
                  <div className="flex items-center justify-between gap-4 w-full border-b border-brand-primary/10 pb-3">
                    <div className="flex items-center gap-2 text-brand-primary/80">
                      <Sparkles size={16} className="text-brand-primary animate-pulse" />
                      <h3 className="font-sans font-light tracking-[0.1em] text-xs sm:text-sm text-brand-primary uppercase">Handpicked Matches</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshRecommendations}
                      disabled={isRefreshing}
                      className="flex items-center gap-1.5 px-3 py-1 bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/25 hover:border-brand-primary text-[10px] font-sans font-light tracking-wide text-brand-primary uppercase rounded-full transition-all disabled:opacity-40 cursor-pointer active:scale-95"
                    >
                      <RefreshCw size={10} className={`${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh ({3 - refreshCount} left)
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    {recommendations.slice(0, 3).map((peer, idx) => {
                      const matchPercent = (peer as any).matchScore || (98 - idx * 4);
                      return (
                        <div
                          key={peer.uid}
                          className="cred-elevation p-3 sm:p-4 text-center space-y-3 relative border-t-2 border-t-brand-primary/50 hover:border-t-brand-primary bg-bg-card rounded-2xl group transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-brand-primary/10 flex items-center justify-center bg-bg-base flex-shrink-0 mx-auto">
                              {peer.photoURL ? (
                                <img src={peer.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <UserIcon size={16} className="text-brand-primary/40" />
                              )}
                            </div>
                            <div>
                              <p className="font-sans font-light text-xs sm:text-sm text-text-base truncate">
                                {peer.displayName?.split(' ')[0]}
                              </p>
                              <p className="text-[10px] text-brand-primary font-sans font-light uppercase tracking-wide mt-0.5">
                                {matchPercent}% Match
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-1.5 pt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                sessionStorage.setItem('viewProfileUid', peer.uid);
                                navigate({ to: '/dashboard' });
                              }}
                              className="cred-inset px-2 py-1 text-[10px] font-sans font-light uppercase tracking-wide text-text-muted hover:text-brand-primary hover:border-brand-primary/20 transition-all cursor-pointer rounded-lg bg-transparent border border-transparent"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!user) return;
                                // Trigger transition!
                                setTransitionMatch(peer);
                                setTransitionVisible(true);

                                // Connect logic
                                try {
                                  await addDoc(collection(db, 'connections'), {
                                    users: [user.uid, peer.uid],
                                    status: 'pending',
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                    initiatorId: user.uid,
                                    receiverId: peer.uid
                                  });
                                  
                                  await createNotification(peer.uid, {
                                    text: `${profile?.displayName || 'Someone'} sent you a connection request!`,
                                    type: 'request',
                                    senderId: user.uid,
                                    senderName: profile?.displayName || 'Anonymous',
                                    connectionId: ''
                                  });
                                } catch (err) {
                                  console.error("Direct connection error in chatbot", err);
                                }
                              }}
                              className="btn-primary w-6 h-6 rounded-lg flex items-center justify-center p-0 flex-shrink-0 cursor-pointer"
                              title="Connect"
                            >
                              <Check size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[8px] sm:text-[9.5px] text-text-muted text-center font-bold uppercase tracking-[0.18em] animate-pulse">
                    🖱️ Hover/move cursor to cycle choices • Click to view in Match circle
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="cred-inset p-8 text-center text-text-muted font-normal uppercase tracking-widest text-[11px] max-w-xl mt-6 rounded-2xl"
                >
                  No match found.
                </motion.div>
              )
            ) : null}
          </AnimatePresence>

          {/* isAnalyzing progress block removed based on user request */}

          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="cred-inset px-6 py-3 sm:px-8 sm:py-4 flex items-center gap-4 border border-brand-primary/20">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce"></div>
                </div>
                <span className="text-[8px] sm:text-[9px] font-black text-brand-primary uppercase tracking-[0.4em]">Maya is typing...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div 
        onMouseEnter={() => handleModuleFocus('input')} 
        className="bg-bg-base/70 backdrop-blur-md p-3 sm:p-8 md:p-12 border-t border-black/5 z-40 pb-10 sm:pb-12 md:pb-16"
      >
        {isCooldownActive ? (
          <div className="max-w-4xl mx-auto text-center p-6 border-2 border-brand-primary/20 bg-brand-primary/5 rounded-[24px] sm:rounded-[32px] space-y-4">
            <h3 className="font-display font-black text-lg sm:text-xl text-brand-primary uppercase italic tracking-wider">Evaluation Cooldown Active</h3>
            <p className="text-xs sm:text-sm text-text-base font-medium max-w-xl mx-auto leading-relaxed">
              We temporarily pause longer conversations to protect your emotional space. Maya has finished processing your situation and highly encourages you to take some time to rest and reflect.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary/10 text-brand-primary font-mono font-black uppercase tracking-widest rounded-full text-xs">
              <span>Time Remaining:</span>
              <span className="text-brand-primary animate-pulse">
                {timeRemaining > 0 
                  ? `${String(Math.floor(timeRemaining / 3600)).padStart(2, '0')}:${String(Math.floor((timeRemaining % 3600) / 60)).padStart(2, '0')}:${String(timeRemaining % 60).padStart(2, '0')}` 
                  : "01:30:00"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 text-emerald-500 text-left max-w-lg mx-auto space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#FFFBF0] bg-brand-primary/20 rounded-md px-2 py-0.5 w-fit">
                <Sparkles size={10} className="animate-pulse" />
                <span>Oasis Reflection Report Sent</span>
              </div>
              <p className="text-[11px] leading-relaxed text-text-muted">
                A personalized comforting paragraph summarizing your condition has been automatically prepared and emailed to you at: <strong className="text-[#FFFBF0]">{user?.email || profile?.email || ''}</strong>. Check your inbox to read Maya's deep reflection!
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-3">
              <Link to="/dashboard" className="btn-secondary px-8 py-3 text-xs font-bold uppercase tracking-widest w-full sm:w-auto border border-brand-primary/10">
                Back to Dashboard
              </Link>
              <button 
                onClick={() => setShowCooldownModal(true)}
                className="btn-primary px-8 py-3 text-xs font-bold uppercase tracking-widest w-full sm:w-auto"
              >
                Check Cooldown &amp; Email Report
              </button>
              <button 
                onClick={() => setShowPremiumModal(true)}
                className="text-[10px] font-black uppercase tracking-wider text-brand-primary hover:underline hover:text-brand-accent transition-all cursor-pointer"
              >
                Bypass Cooldown (Premium)
              </button>
            </div>
            <p className="text-[10px] text-text-muted">
              Tip: A peaceful break helps clear your thoughts and refresh your mind.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {reportResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-between gap-4 transition-all duration-300
                  ${reportResult.status === 'success' 
                    ? 'bg-emerald-550/[0.03] border-emerald-500/20 text-emerald-500' 
                    : reportResult.status === 'error'
                      ? 'bg-brand-accent/5 border-brand-accent/20 text-text-muted'
                      : 'bg-brand-primary/5 border-brand-primary/15 text-brand-primary animate-pulse'
                  }`}
              >
                <div id="companion-report-status-info" className="flex items-center gap-2.5">
                  <Sparkles size={14} className={isSendingReport ? "animate-spin text-brand-primary" : "text-brand-primary"} />
                  <span className="leading-relaxed">{reportResult.message}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setReportResult(null)}
                  className="text-[9px] font-black uppercase text-text-muted hover:text-text-base transition-colors pointer-events-auto cursor-pointer"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            <form 
              onSubmit={handleSend}
              className="relative group w-full animate-fade-in"
            >
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isCooldownActive ? "Chat is locked during cooldown..." : "Type your message here..."}
              disabled={isTyping || isCooldownActive}
              className="input-base pl-6 sm:pl-10 pr-12 sm:pr-20 py-3.5 sm:py-6 text-xs sm:text-sm"
            />

            <button 
              type="submit"
              disabled={!inputText.trim() || isTyping || isCooldownActive}
              className="absolute right-1.5 top-1.5 sm:right-3 sm:top-3 w-9 h-9 sm:w-12 sm:h-12 btn-primary flex items-center justify-center disabled:opacity-20 active:scale-95 p-0"
            >
              {isTyping ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} className="sm:size-[16px]" />}
            </button>
          </form>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCooldownModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bg-base/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="cred-elevation max-w-lg w-full p-8 md:p-12 space-y-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
              
              <div className="w-16 h-16 cred-inset flex items-center justify-center mx-auto text-brand-primary relative">
                <Logo size={32} className="text-brand-primary" />
                <div className="absolute inset-0 bg-brand-primary/10 rounded-full animate-pulse"></div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl md:text-2xl font-display font-black uppercase tracking-tight italic text-text-base leading-tight">Evaluation Cooldown</h2>
                <p className="text-text-muted font-bold uppercase tracking-[0.12em] text-[10px] leading-loose">
                  You have reached your daily conversational exchange threshold. Maya has completed your emotional mapping and encourages you to take a mindful rest.
                </p>
                
                {/* Dynamically countdown from 90:00 minutes */}
                <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
                  <div className="text-[10px] text-text-muted font-black uppercase tracking-wider mb-1">Mindful Pause Timer</div>
                  <div className="text-xl font-mono font-black text-brand-primary tracking-widest animate-pulse">
                    {timeRemaining > 0 
                      ? `${String(Math.floor(timeRemaining / 3600)).padStart(2, '0')}:${String(Math.floor((timeRemaining % 3600) / 60)).padStart(2, '0')}:${String(timeRemaining % 60).padStart(2, '0')}`
                      : "01:30:00"}
                  </div>
                </div>

                {!profile?.isPremium && (
                  <div className={`mt-4 p-4 rounded-xl border text-left space-y-2 relative overflow-hidden transition-all duration-300
                    ${reportResult?.status === 'success' 
                      ? 'border-emerald-555/25 bg-emerald-500/[0.03] text-emerald-500' 
                      : reportResult?.status === 'error'
                        ? 'border-brand-accent/20 bg-brand-accent/[0.03] text-text-muted'
                        : isReportLocked
                          ? 'border-brand-primary/10 bg-brand-primary/5 text-text-muted'
                          : 'border-brand-primary/15 bg-brand-primary/[0.03] text-brand-primary animate-pulse'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className={isSendingReport ? "animate-spin text-brand-accent" : "animate-pulse text-brand-accent"} />
                      <span className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-accent">Oasis Reflection Report</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-text-muted uppercase tracking-wider">
                      {isSendingReport 
                        ? "Maya is generating your reflection report now..." 
                        : reportResult?.status === 'success'
                          ? `Your reflection report has been successfully dispatched to your email: ${user.email || profile.email}`
                          : reportResult?.status === 'error'
                            ? `Failed to send report to email: ${reportResult.message || 'unknown error'}`
                            : isReportLocked
                              ? `Your companion report is available once a week. Your next report will be available in ${getRemainingDays()} days.`
                              : `A personalized paragraph summarizing your condition has been emailed to: ${user.email || profile.email}`
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Side-by-side buttons: Close & OK and Email My Report */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCooldownModal(false)}
                  className="btn-secondary flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-brand-primary/10 hover:border-brand-primary/30 transition-colors cursor-pointer"
                >
                  Close (OK)
                </button>
                <button
                  type="button"
                  onClick={() => sendCompanionReport(true)}
                  disabled={isSendingReport || userMessagesCount === 0 || (isReportLocked && reportResult?.status !== 'success')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-1.5 cursor-pointer select-none
                    ${userMessagesCount === 0
                      ? 'opacity-30 cursor-not-allowed border-brand-primary/5 text-text-muted bg-transparent'
                      : isSendingReport
                        ? 'border-brand-primary/30 text-brand-primary bg-brand-primary/5 animate-pulse animate-duration-1000'
                        : isReportLocked && reportResult?.status !== 'success'
                          ? 'opacity-50 cursor-not-allowed border-brand-primary/10 text-text-muted bg-transparent'
                          : reportResult?.status === 'success'
                            ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/[0.04]'
                            : 'btn-primary border-transparent'
                    }`}
                >
                  <Sparkles size={12} className={isSendingReport ? "animate-spin text-brand-primary" : ""} />
                  <span>
                    {userMessagesCount === 0
                      ? "Chat with Maya to Unlock"
                      : isSendingReport 
                        ? "Mailing..." 
                        : reportResult?.status === "success" 
                          ? "Report Sent" 
                          : isReportLocked
                            ? `Locked (${getRemainingDays()}d)`
                            : "Email My Report"
                    }
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bg-base/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="cred-elevation max-w-lg w-full p-8 md:p-12 space-y-8 text-center"
            >
              <div className="w-16 h-16 cred-inset flex items-center justify-center mx-auto text-brand-primary relative">
                <Logo size={32} className="text-brand-primary" />
                <div className="absolute inset-0 bg-brand-primary/10 rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight italic text-text-base leading-tight">Unlock DelusionAI Premium</h2>
                <p className="text-text-muted font-bold uppercase tracking-[0.12em] text-[10px] leading-loose">
                  {isCooldownActive 
                    ? getComebackMessage(profile?.cooldownEnd)
                    : "You can find and connect with mindset matches and bypass daily chat limits. Upgrade to Premium for ₹299/month!"}
                </p>
                <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl text-[10px] text-text-muted font-black uppercase tracking-wider space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span>✨ Unlimited mindful connections</span>
                    <span className="text-brand-primary">Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💬 No 5-hour chat cooldowns</span>
                    <span className="text-brand-primary">Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💞 Real-time emotional sync</span>
                    <span className="text-brand-primary">Yes</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleUpgradeFromMaya}
                  className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  Upgrade to Premium for ₹299/month
                </button>
                <button 
                  onClick={() => setShowPremiumModal(false)}
                  className="btn-secondary w-full py-3 text-[10px] font-black uppercase tracking-widest border border-brand-primary/10 hover:border-brand-primary/30 transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConnectionDetailModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-bg-base/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="cred-elevation max-w-4xl w-full p-6 sm:p-10 space-y-6 sm:space-y-8 text-center bg-bg-card rounded-[2rem]"
            >
              <div className="flex justify-between items-center pb-4 border-b border-brand-primary/10 text-left">
                <div className="flex items-center gap-3">
                  <Sparkles size={18} className="text-brand-primary" />
                  <h2 className="text-xs sm:text-sm font-sans font-light tracking-[0.1em] uppercase text-brand-primary">Maya's Curated Connections</h2>
                </div>
                <button 
                  onClick={() => setShowConnectionDetailModal(false)}
                  className="w-10 h-10 cred-inset flex items-center justify-center text-text-muted hover:text-text-base transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="font-sans font-light text-sm text-text-muted leading-[1.8] text-center">
                These suggestions have extremely compatible psychological baseline perspectives mapped over your emotional needs to offer genuine support.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {[...recommendations].sort((a,b) => {
                  const sA = (a as any).matchScore || 90;
                  const sB = (b as any).matchScore || 90;
                  return sB - sA;
                }).map((peer, idx) => {
                  const matchPercent = (peer as any).matchScore || (96 - idx * 4);
                  return (
                    <div key={peer.uid} className="cred-inset p-5 flex flex-col justify-between space-y-6 bg-bg-base/50">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-brand-primary/10 flex items-center justify-center bg-bg-base">
                            {peer.photoURL ? (
                              <img src={peer.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon size={20} className="text-brand-primary/40" />
                            )}
                          </div>
                          <div>
                            <p className="font-sans font-light text-base text-text-base">{peer.displayName}</p>
                            <span className="text-xs font-sans font-light tracking-wide text-brand-primary uppercase">
                              {matchPercent}% Match
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(peer.emotionalProfile?.moodKeywords || []).slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-0.5 border border-brand-primary/10 rounded-full text-[10px] font-sans font-light text-text-muted bg-white/5">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <p className="font-sans font-light text-xs text-zinc-550 leading-relaxed pt-2">
                          "{peer.emotionalProfile?.needs || "Seeking a friendly connect."}"
                        </p>

                        {(peer as any).psychologicalInsight && (
                          <div className="bg-brand-primary/[0.02] border border-brand-primary/5 rounded-xl p-3 space-y-1">
                            <span className="text-[10px] font-sans font-light tracking-widest text-brand-primary block uppercase">Maya's Compatibility Insight</span>
                            <p className="text-zinc-500 font-sans font-light text-xs leading-relaxed">
                              {(peer as any).psychologicalInsight}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await updateDoc(doc(db, 'users', user.uid), {
                                historicalRecommendedUids: arrayUnion(peer.uid)
                              });
                            } catch (err) {
                              console.error("Error updating historicalRecommendedUids:", err);
                            }
                            setShowConnectionDetailModal(false);
                            navigate({ to: '/dashboard' });
                          }}
                          className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest">Detail</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (!user) return;
                            // Trigger transition!
                            setTransitionMatch(peer);
                            setTransitionVisible(true);
                            setShowConnectionDetailModal(false);

                            // Connect logic
                            try {
                              await addDoc(collection(db, 'connections'), {
                                users: [user.uid, peer.uid],
                                status: 'pending',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                initiatorId: user.uid,
                                receiverId: peer.uid
                              });
                              
                              // Send notifications
                              await createNotification(peer.uid, {
                                text: `${profile?.displayName || 'Someone'} sent you a connection request!`,
                                type: 'request',
                                senderId: user.uid,
                                senderName: profile?.displayName || 'Anonymous',
                                connectionId: ''
                              });
                            } catch (err) {
                              console.error("Direct connect in connection details failed:", err);
                            }
                          }}
                          className="btn-primary w-12 h-12 flex items-center justify-center p-0 rounded-xl"
                          title="Connect"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
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

      <TransactionOverlay 
        isVisible={isProcessingUpgrade} 
        type="premium_upgrade"
      />
    </div>
  );
}
