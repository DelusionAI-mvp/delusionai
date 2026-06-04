export interface EmotionalProfile {
  moodBaseline: number;
  moodKeywords: string[];
  communicationStyle: string;
  needs: string;
  traits: string[];
  interests: string[];
  personalityType?: string;
  profileScore?: number;
  activePercent?: number;
  depthPercent?: number;
  matchPower?: number;
  
  // Custom user requested fields
  ageGroup?: string;
  emotionalTags?: string[];
  personalityTraits?: string[];
  supportStyle?: string;
  activityLevel?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  onboarded: boolean;
  status?: 'active' | 'offline';
  lastSeen?: string;
  emotionalProfile?: EmotionalProfile;
  isPremium?: boolean;
  age?: string | string[];
  ageGroup?: string;
  recommendationRefreshNeeded?: boolean;
  lastMayaSyncAt?: string;
  lastMayaInteractionAt?: string;
  createdAt?: string;
  recommendedUids?: string[];
  historicalRecommendedUids?: string[];
  matchRequestCount: number;
  lastMatchRequestAt?: string;
  messagesUsed?: number;
  cooldownEnd?: string;
  userMemorySummary?: string;
  interests?: string[];
  currentSituation?: string[];
  whyJoined?: string[];
  personality?: string[];
  activityMetrics?: {
    totalMayaTime: number; // in minutes
    totalPeerTime: number; // in minutes
    lastActive: string;
    lastDailyResetAt?: string;
  };
  bio?: string;
  location?: string;
  matchScore?: number;
}

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface Connection {
  id: string;
  users: string[];
  status: ConnectionStatus;
  createdAt: any;
  updatedAt: any;
  initiatorId: string;
  receiverId: string;
  removedBy?: string[];
}

export interface Message {
  id?: string;
  text: string;
  senderId: string;
  timestamp: any;
  type: 'text' | 'image' | 'voice';
  mediaUrl?: string;
  duration?: number;
  status?: 'sent' | 'delivered' | 'seen';
}

export interface DirectMessage {
  id: string;
  connectionId: string;
  senderId: string;
  receiverId: string;
  message: string;
  status: 'pending' | 'accepted';
  timestamp: any;
  isRead: boolean;
}

export interface MayaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MayaConversation {
  userId: string;
  messages: MayaMessage[];
  lastUpdated: any;
}
