import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { useNavigate, useParams, Link } from '@tanstack/react-router';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { getCachedProfile } from '../lib/userService';
import { Message, UserProfile, Connection } from '../types';
import { createNotification } from '../lib/notifications';
import { 
  Send, 
  ArrowLeft, 
  User as UserIcon, 
  Mic, 
  ImageIcon, 
  MoreVertical,
  Heart,
  Smile,
  ShieldCheck,
  X,
  Check,
  CheckCheck,
  Trash2,
  Pause,
  Play,
  Trash,
  Disc
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { NeuralBlueprint } from '../components/NeuralBlueprint';
import { Logo } from '../components/Logo';

// Voice message option completely restored as per user request to provide WhatsApp-style media exchange with audio.
const VoiceMessagePlayer = ({ mediaUrl, duration, isMine }: { mediaUrl: string; duration?: number; isMine: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (!duration && audio.duration && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [mediaUrl, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error("Audio play error", err));
      setIsPlaying(true);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const playButtonBg = isMine ? "bg-white/20 hover:bg-white/30 text-white" : "bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary";
  const progressBg = isMine ? "bg-white/20" : "bg-brand-primary/10";
  const progressBarColor = isMine ? "bg-white" : "bg-brand-primary";
  const timeColor = isMine ? "text-white/60" : "text-brand-primary/60";
  const iconFill = isMine ? "white" : "currentColor";

  return (
    <div className="flex items-center gap-3 py-2 min-w-[200px] sm:min-w-[240px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all transform active:scale-95 flex-shrink-0 ${playButtonBg}`}
      >
        {isPlaying ? <Pause size={14} fill={iconFill} /> : <Play size={14} className="ml-0.5" fill={iconFill} />}
      </button>
      
      <div className="flex-1 space-y-1">
        <div className={`h-1.5 w-full rounded-full overflow-hidden relative ${progressBg}`}>
          <div 
            className={`absolute h-full rounded-full left-0 top-0 transition-all duration-100 ${progressBarColor}`}
            style={{ width: `${totalDuration ? (currentTime / totalDuration) * 100 : 0}%` }}
          />
        </div>
        <div className={`flex justify-between items-center text-[9px] uppercase tracking-widest font-black ${timeColor}`}>
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default function PeerChat() {
  const { connectionId } = useParams({ from: '/chat/$connectionId' });
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  const isOtherUserRemoved = connection?.removedBy?.includes(otherUser?.uid || '') || false;
  const amIRemoved = connection?.removedBy?.includes(user?.uid || '') || false;

  // Periodic tick to auto-update relative "last seen" text dynamically
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Voice recording states & handlers
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size < 1000) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (!base64Audio || !user || !connectionId) return;

          try {
            await addDoc(collection(db, 'connections', connectionId, 'messages'), {
              text: '',
              senderId: user.uid,
              timestamp: new Date().toISOString(),
              type: 'voice',
              mediaUrl: base64Audio,
              duration: recordingDuration || 1,
              status: otherUser?.status === 'active' ? 'delivered' : 'sent'
            });

            if (otherUser?.uid) {
              await createNotification(otherUser.uid, {
                text: `${profile?.displayName || 'Someone'} sent you a voice note!`,
                type: 'message',
                senderId: user.uid,
                senderName: profile?.displayName || 'Anonymous',
                connectionId: connectionId
              });
            }

            await updateDoc(doc(db, 'connections', connectionId), {
              updatedAt: new Date().toISOString()
            });
          } catch (err) {
            console.error("Error sending voice message:", err);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      setIsRecording(true);
      setRecordingDuration(0);
      mediaRecorder.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to access microphone:", err);
      setMicError("Permission denied");
      setIsRecording(false);
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn("MediaRecorder stop warning:", err);
      }
      
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn("MediaRecorder stream tracks stop warning:", err);
        }
      }
      
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingDuration(0);
      audioChunksRef.current = [];
    }
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

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
      
      return `LAST SEEN ${format(lastActiveDate, 'dd MMM')}`.toUpperCase();
    } catch (e) {
      return 'OFFLINE';
    }
  };

  // Media Attachment states
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1500000) {
      alert("Image size is too large. Please select an image under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl || !user || !connectionId) return;

      try {
        await addDoc(collection(db, 'connections', connectionId, 'messages'), {
          text: '',
          senderId: user.uid,
          timestamp: new Date().toISOString(),
          type: 'image',
          mediaUrl: dataUrl,
          status: otherUser?.status === 'active' ? 'delivered' : 'sent'
        });

        if (otherUser?.uid) {
          await createNotification(otherUser.uid, {
            text: `${profile?.displayName || 'Someone'} sent you an image!`,
            type: 'message',
            senderId: user.uid,
            senderName: profile?.displayName || 'Anonymous',
            connectionId: connectionId
          });
        }
        
        await updateDoc(doc(db, 'connections', connectionId), {
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error sending image message:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDisconnect = async () => {
    if (!otherUser || !user || !connectionId) return;
    
    try {
      const connRef = doc(db, 'connections', connectionId);
      
      // Create persistent in-app notification in Firestore for the other user to announce friend removal
      await createNotification(otherUser.uid, {
        text: `${profile?.displayName || 'Someone'} removed you from their friend circle`,
        type: 'reject',
        senderId: user.uid,
        senderName: profile?.displayName || 'Anonymous'
      });

      // If the other person already removed this link, we can delete the record entirely
      if (connection?.removedBy?.includes(otherUser.uid)) {
        await deleteDoc(connRef);
      } else {
        await updateDoc(connRef, {
          removedBy: arrayUnion(user.uid),
          updatedAt: new Date().toISOString()
        });
      }
      navigate({ to: '/dashboard' });
    } catch (error: any) {
      console.error("Error removing connection:", error);
      alert(`Disconnection failed: ${error.message}.`);
    }
  };

  const handlePermanentDelete = async () => {
    if (!connectionId) return;
    if (!window.confirm("DELETE CHAT: This will remove all messages for both of you. You can't undo this. Continue?")) return;
    
    try {
      await deleteDoc(doc(db, 'connections', connectionId));
      navigate({ to: '/dashboard' });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (amIRemoved) {
      navigate({ to: '/dashboard' });
    }
  }, [amIRemoved, navigate]);

  useEffect(() => {
    if (!connectionId || !user) return;

    let unsubUser: (() => void) | null = null;

    // Listen to Connection & Other User
    const connRef = doc(db, 'connections', connectionId);
    const unsubConn = onSnapshot(connRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Connection;
        setConnection(data);
        const otherId = data.users.find(uid => uid !== user.uid);
        if (otherId && !unsubUser) {
          unsubUser = onSnapshot(doc(db, 'users', otherId), (userSnap) => {
            if (userSnap.exists()) {
              setOtherUser(userSnap.data() as UserProfile);
            }
          }, (err) => {
            if (auth.currentUser) {
              handleFirestoreError(err, OperationType.GET, `users/${otherId}`);
            }
          });
        }
      }
    }, (err) => {
      if (auth.currentUser) {
        handleFirestoreError(err, OperationType.GET, `connections/${connectionId}`);
      }
    });

    // Listen to messages & mark as seen
    const q = query(
      collection(db, 'connections', connectionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubMsgs = onSnapshot(q, (snap) => {
      const newMessages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(newMessages);

      // Mark unread messages from other user as seen
      snap.docs.forEach(async (d) => {
        const msg = d.data() as Message;
        if (msg.senderId !== user.uid && msg.status !== 'seen') {
          try {
            await updateDoc(doc(db, 'connections', connectionId, 'messages', d.id), {
              status: 'seen'
            });
          } catch (e) {
            // Ignore background marker errors to prevent spam
          }
        }
      });
    }, (err) => {
      if (auth.currentUser) {
        handleFirestoreError(err, OperationType.GET, `connections/${connectionId}/messages`);
      }
    });

    return () => {
      unsubConn();
      unsubMsgs();
      if (unsubUser) {
        (unsubUser as () => void)();
      }
    };
  }, [connectionId, user]);

  // Track time spent with friends (10m frequency to save quota)
  useEffect(() => {
    if (!user || !profile || !connectionId) return;

    const interval = setInterval(async () => {
      try {
        if (!document.hidden && auth.currentUser) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            'activityMetrics.totalPeerTime': increment(10),
            'activityMetrics.lastActive': new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error updating peer time:", err);
      }
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, [user, profile, connectionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || !connectionId) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, 'connections', connectionId, 'messages'), {
        text,
        senderId: user.uid,
        timestamp: new Date().toISOString(),
        type: 'text',
        status: otherUser?.status === 'active' ? 'delivered' : 'sent'
      });

      if (otherUser?.uid) {
        await createNotification(otherUser.uid, {
          text: `${profile?.displayName || 'Someone'}: "${text.length > 30 ? text.slice(0, 30) + '...' : text}"`,
          type: 'message',
          senderId: user.uid,
          senderName: profile?.displayName || 'Anonymous',
          connectionId: connectionId
        });
      }

      // Update activity metrics
      if (profile) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          'activityMetrics.totalPeerTime': increment(1),
          'activityMetrics.lastActive': new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `connections/${connectionId}/messages`);
    }
  };

  if (!user || !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base">
        <Logo className="animate-pulse text-brand-primary" size={60} />
        <p className="mt-8 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-brand-primary animate-pulse">Synchronizing Chat...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-12rem)] sm:h-[calc(100vh-14rem)] md:h-[calc(100vh-8rem)] overflow-hidden bg-transparent relative">
      <AnimatePresence>
        {showProfile && otherUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] overflow-y-auto bg-bg-base/95 backdrop-blur-2xl p-4 sm:p-6 md:p-12 flex items-start justify-center"
          >
            <div className="max-w-5xl w-full space-y-8 sm:space-y-12 py-12 sm:py-20 relative mb-12 sm:mb-16">
              <button 
                onClick={() => setShowProfile(false)}
                className="fixed top-4 right-4 sm:top-6 sm:right-6 md:top-12 md:right-12 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 cred-elevation flex items-center justify-center bg-bg-card text-text-muted hover:text-brand-primary transition-all z-[110]"
              >
                <X size={20} className="sm:size-[24px]" />
              </button>

            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-12 text-center md:text-left pt-6 md:pt-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 cred-inset p-2 rounded-full overflow-hidden">
                <div className="w-full h-full cred-elevation rounded-full flex items-center justify-center overflow-hidden border-2 border-brand-primary/10">
                  {otherUser.photoURL ? <img src={otherUser.photoURL} className="w-full h-full object-cover" alt="" /> : <UserIcon size={40} className="sm:size-[48px] md:size-[64px] text-brand-primary/20" />}
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4 max-w-full">
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter break-words max-w-full">{otherUser.displayName}</h2>
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 cred-inset bg-black/5">
                    <div className={`w-2 h-2 rounded-full ${isOnlineFlag ? 'bg-green-500 animate-pulse shadow-[0_0_8px_var(--color-green-500)]' : 'bg-zinc-500'}`}></div>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-muted">{isOnlineFlag ? 'Online' : 'Offline'}</span>
                  </div>
                  {otherUser.isPremium && <span className="px-4 py-2 cred-elevation bg-brand-primary text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest italic tracking-[0.2em]">Premium</span>}
                </div>
              </div>
            </div>

            <NeuralBlueprint profile={otherUser} isMe={false} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              <div className="cred-inset p-6 md:p-8 space-y-4 bg-black/5">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-muted">About</p>
                <p className="text-xs md:text-sm font-bold opacity-80 leading-relaxed italic uppercase">{otherUser.bio || 'No bio available yet.'}</p>
              </div>
              <div className="cred-inset p-6 md:p-8 space-y-4 bg-black/5">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-muted">Age</p>
                <p className="text-xs md:text-sm font-bold opacity-80 leading-relaxed italic uppercase">{otherUser.age || 'Unknown'}</p>
              </div>
              <div className="cred-inset p-6 md:p-8 space-y-4 bg-black/5">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-muted">Location</p>
                <p className="text-xs md:text-sm font-bold opacity-80 leading-relaxed italic uppercase">{otherUser.location || 'Unknown'}</p>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-bg-base/70 backdrop-blur-md border-b border-brand-primary/10 px-4 sm:px-8 md:px-16 py-4 sm:py-6 md:py-8 flex items-center justify-between z-40">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link to="/dashboard" className="w-10 h-10 sm:w-12 sm:h-12 cred-inset flex items-center justify-center text-brand-primary/60 hover:text-brand-primary transition-all">
            <ArrowLeft size={18} className="sm:size-[20px]" />
          </Link>
          <div 
            className="flex items-center gap-3 sm:gap-6 cursor-pointer group"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 cred-elevation flex items-center justify-center overflow-hidden">
                {otherUser?.photoURL && !isOtherUserRemoved ? <img src={otherUser.photoURL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /> : <UserIcon size={24} className="text-brand-primary/20" />}
              </div>
              {!isOtherUserRemoved && isOnlineFlag && (
                <div id="chat-active-indicator" className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white animate-pulse z-20 shadow-[0_2px_8px_rgba(34,197,94,0.4)]"></div>
              )}
            </div>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-text-base uppercase tracking-tighter italic group-hover:text-brand-primary transition-colors">
                {isOtherUserRemoved ? 'Removed User' : (otherUser?.displayName?.split(' ')[0] || 'Loading...')}
              </h2>
              <div className="flex items-center gap-1 sm:gap-2 text-[7px] sm:text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] sm:tracking-[0.4em]">
                {getPresenceText()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="w-10 h-10 sm:w-12 sm:h-12 cred-inset flex items-center justify-center text-brand-primary/60 hover:text-brand-primary transition-all"
          >
            <MoreVertical size={18} className="sm:size-[20px]" />
          </button>

          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-14 md:top-16 right-0 w-56 md:w-64 cred-elevation p-3 md:p-4 z-50 space-y-1 md:space-y-2"
              >
                <button 
                  onClick={() => { setShowProfile(true); setShowOptions(false); }}
                  className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-brand-primary/10 text-brand-primary transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest text-left"
                >
                  <UserIcon size={14} className="md:size-[16px]" />
                  View Profile
                </button>
                {!isOtherUserRemoved && (
                  <button 
                    onClick={() => { setIsDisconnecting(true); setShowOptions(false); }}
                    className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-red-600/10 text-red-500 transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest text-left"
                  >
                    <X size={14} className="md:size-[16px]" />
                    Remove Friend
                  </button>
                )}
                {isOtherUserRemoved && (
                  <button 
                    onClick={handlePermanentDelete}
                    className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-black hover:text-white transition-colors text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-left border-t border-black/5"
                  >
                    <Trash2 size={12} />
                    Delete Chat
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Disconnect Modal */}
      <AnimatePresence>
        {isDisconnecting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bg-base/90 backdrop-blur-3xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md cred-elevation p-8 md:p-12 bg-bg-card border-t-4 border-t-red-600 space-y-8 md:space-y-10"
            >
              <div className="space-y-4">
                <h3 className="text-3xl md:text-4xl font-display font-black uppercase italic tracking-tighter text-red-600">REMOVE FRIEND?</h3>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-text-muted leading-relaxed italic">
                  Are you sure you want to remove {otherUser?.displayName}? This will delete your connected status but you can still see past messages unless you delete the chat.
                </p>
              </div>
              
              <div className="flex gap-4">
                 <button 
                   onClick={() => setIsDisconnecting(false)}
                   className="flex-1 btn-secondary py-4 md:py-5 text-[9px] md:text-[10px]"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={handleDisconnect}
                   className="flex-1 bg-red-600 text-white font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] italic py-4 md:py-5 hover:bg-red-700 transition-all"
                 >
                   REMOVE
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-10 pb-24 md:pb-20">
          <div className="flex flex-col items-center justify-center py-10 opacity-30">
            <div className="w-12 h-[1px] bg-brand-primary mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-brand-primary">SECURE CONNECTION</p>
            <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-text-muted">
              {connection?.createdAt ? format(new Date(connection.createdAt), 'dd MMMM yyyy').toUpperCase() : 'ESTABLISHING...'}
            </div>
          </div>


          <AnimatePresence initial={false}>
            {messages.reduce((acc: any[], msg, i) => {
              const date = format(new Date(msg.timestamp), 'yyyy-MM-dd');
              const prevDate = i > 0 ? format(new Date(messages[i-1].timestamp), 'yyyy-MM-dd') : null;
              
              if (date !== prevDate) {
                acc.push(
                  <div key={`date-${date}`} className="flex justify-center my-10 md:my-16 opacity-30">
                    <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-text-muted bg-bg-card px-6 py-2 rounded-full border border-black/5">
                      {format(new Date(msg.timestamp), 'MMMM d, yyyy').toUpperCase()}
                    </div>
                  </div>
                );
              }

              const isMine = msg.senderId === user?.uid;
              acc.push(
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    id={`peer-msg-${msg.id}`}
                    className={`
                      max-w-[85%] md:max-w-[70%] p-3.5 py-3 sm:p-5 md:p-6 md:py-5 transition-all duration-500 relative break-words
                      ${isMine 
                        ? 'bg-brand-primary text-white font-semibold tracking-wide text-xs sm:text-sm rounded-[16px] sm:rounded-[24px] rounded-tr-none shadow-[4px_4px_15px_rgba(128,0,32,0.1)]' 
                        : 'cred-elevation text-text-base text-xs sm:text-sm md:text-base font-medium leading-relaxed rounded-[16px] sm:rounded-[24px] rounded-tl-none border-l-4 border-l-brand-primary'}
                    `}
                  >
                    {msg.type === 'voice' && msg.mediaUrl ? (
                      <VoiceMessagePlayer mediaUrl={msg.mediaUrl} duration={msg.duration} isMine={isMine} />
                    ) : msg.type === 'image' && msg.mediaUrl ? (
                      <div className="rounded-xl overflow-hidden mt-1.5 max-w-full border border-black/5 bg-black/5">
                        <img src={msg.mediaUrl} alt="Shared attachment" className="w-full h-auto object-cover max-h-72 select-none hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}

                    {msg.timestamp && (
                      <div className={`text-[8px] sm:text-[9px] font-bold mt-2 sm:mt-3 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 justify-end ${isMine ? 'text-white/50' : 'text-brand-primary/50'}`}>
                        {format(new Date(msg.timestamp), 'HH:mm')}
                        {isMine && (
                          <span className="flex">
                            {msg.status === 'seen' ? (
                              <CheckCheck size={12} className="text-blue-400 font-bold drop-shadow-[0_0_4px_rgba(59,130,246,0.8)] animate-[pulse_1s_infinite_alternate]" />
                            ) : (
                              <Check size={11} className="opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
              return acc;
            }, [])}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-bg-base/70 backdrop-blur-md p-3 sm:p-8 md:p-12 border-t border-black/5 z-40 pb-10 sm:pb-12 md:pb-16">
        {micError && (
          <div className="max-w-4xl mx-auto mb-6 p-5 sm:p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-600 flex flex-col md:flex-row gap-5 relative animate-fadeIn shadow-[0_4px_32px_rgba(239,68,68,0.12)]">
            <div className="p-3 rounded-2xl bg-red-500/10 shrink-0 text-red-600 self-start">
              <Mic size={22} className="animate-pulse" />
            </div>
            <div className="flex-1 text-[11px] sm:text-xs leading-relaxed pr-6 space-y-3">
              <div>
                <span className="font-black block uppercase tracking-wider mb-1 text-red-700 text-xs">Microphone Access Restricted</span>
                <p className="font-semibold text-text-base">
                  Your browser blocked microphone access, or mic permission was previously denied. Because this application runs in an embedded workspace iframe, some browsers block hardware recording features until allowed.
                </p>
              </div>
              <div className="space-y-2 font-bold text-text-muted">
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] shrink-0 font-black mt-0.5">1</span>
                  <span>Click the <strong className="text-brand-primary">Lock Icon 🔒</strong> in your browser's address bar to toggle Microphone to <strong>"Allow"</strong>.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] shrink-0 font-black mt-0.5">2</span>
                  <span>Or open the application directly in a **dedicated browser tab** to grant native microphone access with no security sandboxing:</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-brand-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                >
                  Open in New Tab ↗
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url).then(() => {
                      const btn = document.getElementById('mic-copy-btn');
                      if (btn) {
                        const originalText = btn.innerText;
                        btn.innerText = "COPIED URL!";
                        btn.classList.add('bg-green-600', 'text-white');
                        setTimeout(() => {
                          btn.innerText = originalText;
                          btn.classList.remove('bg-green-600', 'text-white');
                        }, 2000);
                      }
                    });
                  }}
                  id="mic-copy-btn"
                  className="px-4 py-2.5 bg-brand-primary/10 text-brand-primary text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary/20 transition-all"
                >
                  Copy App Link
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMicError(null);
                    setTimeout(() => {
                      startRecording();
                    }, 200);
                  }}
                  className="px-4 py-2.5 bg-red-600/10 text-red-600 hover:bg-red-600/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Re-test Microphone
                </button>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setMicError(null)} 
              className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-red-600/60 hover:text-red-600 transition-colors"
              title="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Hidden input for image uploads */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageChange} 
        />

        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-6">
          {isRecording ? (
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 bg-red-500/5 border-2 border-red-500/20 rounded-[24px] sm:rounded-[32px] px-6 py-4 sm:py-5 animate-pulse shadow-[0_4px_24px_rgba(239,68,68,0.06)]">
              <div className="flex items-center flex-wrap gap-3 sm:gap-4">
                {/* Immersive Pulsing Recorder Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/20">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                  <span className="text-red-600 font-extrabold uppercase tracking-widest text-[9px] font-mono">REC</span>
                </div>

                {/* Classic Tape Recorder Spinning Cassette Visualizer */}
                <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900 border border-red-600/30 rounded-xl relative overflow-hidden shrink-0">
                  <div className="flex items-center gap-2 text-white">
                    <Disc size={18} className="animate-spin text-red-500" style={{ animationDuration: '3s' }} />
                    <div className="w-6 h-1 bg-red-500/30 rounded relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-1/2 bg-red-500 animate-pulse"></div>
                    </div>
                    <Disc size={18} className="animate-spin text-red-500" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                {/* Animated Equalizer Waveform Symbol */}
                <div className="flex items-center gap-[3px] h-6 px-3 bg-red-500/5 rounded-lg border border-red-500/10 min-w-[70px] justify-center">
                  <span className="w-[3px] h-3.5 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-[3px] h-4.5 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.3s' }}></span>
                  <span className="w-[3px] h-2.5 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.5s' }}></span>
                  <span className="w-[3px] h-5 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-[3px] h-3 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.4s' }}></span>
                  <span className="w-[3px] h-5.5 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.6s' }}></span>
                  <span className="w-[3px] h-2 bg-red-500 rounded-full animate-soundwave" style={{ animationDelay: '0.15s' }}></span>
                </div>

                {/* Status message details */}
                <div className="flex flex-col">
                  <span className="text-red-700 text-[10px] sm:text-xs font-black uppercase tracking-wider">Capturing Live Input</span>
                  <span className="text-text-muted text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider font-mono">
                    Elapsed: {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 border border-red-500/10 cursor-pointer"
                  title="Cancel Recording"
                >
                  <Trash size={14} />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAndSend}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-red-500/20 cursor-pointer animate-pulse"
                  title="Send Voice Message"
                >
                  <Send size={11} />
                  <span>Send Voice</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <form 
                onSubmit={handleSend}
                className="flex-1 relative group"
              >
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message here..."
                  className="input-base pl-6 sm:pl-10 pr-12 sm:pr-20 py-3.5 sm:py-6 text-xs sm:text-sm"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-1.5 top-1.5 sm:right-3 sm:top-3 w-9 h-9 sm:w-12 sm:h-12 btn-primary flex items-center justify-center p-0 disabled:opacity-20 active:scale-95"
                >
                  <Send size={14} className="sm:size-[16px]" />
                </button>
              </form>

              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-12 h-12 shrink-0 cred-inset items-center justify-center text-brand-primary/60 hover:text-brand-primary hover:bg-brand-primary/5 transition-all"
                title="Attach Image"
              >
                <ImageIcon size={18} />
              </button>

              <button 
                type="button"
                onClick={startRecording}
                className="flex w-12 h-12 shrink-0 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-full items-center justify-center transition-all animate-fadeIn"
                title="Record Voice Message"
              >
                <Mic size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
