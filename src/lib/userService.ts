import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile } from '../types';

export const MOCK_COMPANIONS: UserProfile[] = [
  {
    uid: "peer_id_aarav",
    email: "aarav@delusion.ai",
    displayName: "Aarav Sharma",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    onboarded: true,
    status: "active",
    lastSeen: new Date().toISOString(),
    isPremium: false,
    age: "25-30",
    ageGroup: "25-30",
    bio: "Recovering from high-functioning burnout. Believes in slow conversations, deep empathy, and healing.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    matchRequestCount: 0,
    interests: ["Mindfulness", "Reading", "Coffee", "Nature Walks", "Acoustic Music"],
    currentSituation: ["Too tired from work", "Looking for a calm life"],
    whyJoined: ["Finding true digital friends", "Venting without judgement"],
    personality: ["Quiet", "Thoughtful", "Patient", "Empathetic Listener"],
    emotionalProfile: {
      moodBaseline: 65,
      moodKeywords: ["burnout", "work_stress", "anxiety"],
      communicationStyle: "gentle and patient",
      needs: "Venting after long hours, sharing peaceful moments",
      traits: ["Patient", "Empathetic Listener", "Thoughtful"],
      interests: ["Mindfulness", "Reading", "Quiet Walks"],
      personalityType: "Empathetic Listener",
      profileScore: 88,
      activePercent: 70,
      depthPercent: 95,
      matchPower: 90
    }
  },
  {
    uid: "peer_id_kabir",
    email: "kabir@delusion.ai",
    displayName: "Kabir Mehta",
    photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    onboarded: true,
    status: "active",
    lastSeen: new Date().toISOString(),
    isPremium: false,
    age: "18-24",
    ageGroup: "18-24",
    bio: "Seeking quiet connections in a noisy world. Often found stargazing or scribbling poetry.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    matchRequestCount: 0,
    interests: ["Creativity", "Stargazing", "Art", "Writing", "Indie Music"],
    currentSituation: ["Feeling lonely sometimes", "Worry about the future"],
    whyJoined: ["Venting without judgement", "Finding like-minded souls"],
    personality: ["Introverted", "Creative", "Dreamer", "Deep Thinker"],
    emotionalProfile: {
      moodBaseline: 58,
      moodKeywords: ["loneliness", "future_anxiety", "creative_block"],
      communicationStyle: "deep and expressive",
      needs: "Intimate late-night chats and gentle support",
      traits: ["Introverted", "Creative", "Dreamer"],
      interests: ["Art", "Stargazing", "Indie Music"],
      personalityType: "Quiet Supporter",
      profileScore: 82,
      activePercent: 65,
      depthPercent: 90,
      matchPower: 85
    }
  },
  {
    uid: "peer_id_diya",
    email: "diya@delusion.ai",
    displayName: "Diya Iyer",
    photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    onboarded: true,
    status: "active",
    lastSeen: new Date().toISOString(),
    isPremium: false,
    age: "18-24",
    ageGroup: "18-24",
    bio: "Overcoming social anxiety step-by-step. Loves pet cats, gardening, and peaceful tea sessions.",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    matchRequestCount: 0,
    interests: ["Gardening", "Tea Appreciation", "Animals", "Painting", "Lo-fi Beats"],
    currentSituation: ["Worry about the future", "Feeling lonely sometimes"],
    whyJoined: ["Venting without judgement", "Finding a comfortable circle"],
    personality: ["Sensitive", "Warm", "Gentle", "Quiet Supporter"],
    emotionalProfile: {
      moodBaseline: 72,
      moodKeywords: ["social_anxiety", "overthinking", "sensitive_soul"],
      communicationStyle: "soft and encouraging",
      needs: "Slow paced, pressure-free validation and supportive companionship",
      traits: ["Sensitive", "Warm", "Gentle"],
      interests: ["Tea Appreciation", "Painting", "Cats"],
      personalityType: "Quiet Supporter",
      profileScore: 84,
      activePercent: 80,
      depthPercent: 88,
      matchPower: 86
    }
  },
  {
    uid: "peer_id_ananya",
    email: "ananya@delusion.ai",
    displayName: "Ananya Roy",
    photoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
    onboarded: true,
    status: "active",
    lastSeen: new Date().toISOString(),
    isPremium: false,
    age: "18-24",
    ageGroup: "18-24",
    bio: "College student finding her voice. Passionate about ambient lighting, coding, and psychological thrillers.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    matchRequestCount: 0,
    interests: ["Psychology", "Technology", "Ambient Aesthetics", "Cinema", "Lo-fi Beats"],
    currentSituation: ["Study stress", "Worry about the future"],
    whyJoined: [" Vibe checking and sharing perspectives", "Venting study blues"],
    personality: ["Analytical", "Warm", "Inquisitive", "Attentive"],
    emotionalProfile: {
      moodBaseline: 68,
      moodKeywords: ["study_blues", "anxiety", "academic_fatigue"],
      communicationStyle: "intellectual but warm",
      needs: "Vibrant and thoughtful dialogue",
      traits: ["Analytical", "Warm", "Inquisitive"],
      interests: ["Psychology", "Technology", "Lo-fi Beats"],
      personalityType: "Quiet Supporter",
      profileScore: 80,
      activePercent: 85,
      depthPercent: 82,
      matchPower: 81
    }
  },
  {
    uid: "peer_id_meera",
    email: "meera@delusion.ai",
    displayName: "Meera Nair",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    onboarded: true,
    status: "active",
    lastSeen: new Date().toISOString(),
    isPremium: false,
    age: "31-35",
    ageGroup: "31-35",
    bio: "Embracing maternal reflection, yoga, and journaling. Striving to stay true to my mental wellness.",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    matchRequestCount: 0,
    interests: ["Yoga", "Journaling", "Wellness", "Baking", "Self-reflection"],
    currentSituation: ["Family life", "Thinking about my life"],
    whyJoined: ["Deeper conversation on wellness", "Sharing calming perspectives"],
    personality: ["Calm", "Mature", "Observant", "Wise Companion"],
    emotionalProfile: {
      moodBaseline: 78,
      moodKeywords: ["family_exhaustion", "reflection", "mindful_balance"],
      communicationStyle: "reflective and mentoring",
      needs: "Calm, grounding chats and mutual life reflections",
      traits: ["Calm", "Mature", "Observant"],
      interests: ["Yoga", "Journaling", "Wellness"],
      personalityType: "Quiet Supporter",
      profileScore: 92,
      activePercent: 60,
      depthPercent: 98,
      matchPower: 92
    }
  },
  {
    uid: "peer_id_rohan",
    email: "rohan@delusion.ai",
    displayName: "Rohan Verma",
    photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
    onboarded: true,
    status: "active",
    lastSeen: new Date().toISOString(),
    isPremium: false,
    age: "25-30",
    ageGroup: "25-30",
    bio: "Seeking positive reinforcement and good storytelling. Hikes on weekends, loves sketching faces.",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    matchRequestCount: 0,
    interests: ["Sketching", "Hiking", "Storytelling", "Standup Comedy", "Mindfulness"],
    currentSituation: ["Looking for a calm life", "Love and friendships"],
    whyJoined: ["Finding deep support circles", "Vibe-match validation"],
    personality: ["Encouraging", "Humorous", "Gentle", "Attentive Supporter"],
    emotionalProfile: {
      moodBaseline: 71,
      moodKeywords: ["friendship_search", "creativity_spark", "wellness"],
      communicationStyle: "optimistic and conversational",
      needs: "Lively, supportive validation and positive wellness feedback",
      traits: ["Encouraging", "Humorous", "Gentle"],
      interests: ["Sketching", "Hiking", "Mindfulness"],
      personalityType: "Quiet Supporter",
      profileScore: 86,
      activePercent: 78,
      depthPercent: 86,
      matchPower: 85
    }
  }
];

export async function bootstrapPeersInDatabase() {
  try {
    for (const companion of MOCK_COMPANIONS) {
      const peerDocRef = doc(db, 'users', companion.uid);
      const snap = await getDoc(peerDocRef);
      if (!snap.exists()) {
        await setDoc(peerDocRef, companion);
        console.log(`Bootstrapped peer profile: ${companion.displayName}`);
      }
    }
  } catch (error) {
    console.warn("Bootstrap database user companion synchronization failed (this is expected if Firestore is still provisioning or under access quotas):", error);
  }
}

const profileCache: Record<string, UserProfile> = {};

// Initialize cache with mock companion profiles so they load instantly without Firestore checks
MOCK_COMPANIONS.forEach(comp => {
  profileCache[comp.uid] = comp;
});

const pendingPromises: Record<string, Promise<UserProfile | null> | undefined> = {};

/**
 * Fetches a user profile with memory caching.
 * Prevents redundant calls in the same session.
 */
export async function getCachedProfile(uid: string): Promise<UserProfile | null> {
  if (profileCache[uid]) return profileCache[uid];
  
  if (pendingPromises[uid]) return pendingPromises[uid];

  pendingPromises[uid] = (async () => {
    try {
      // Robustly wait for the Firebase auth state to resolve, preventing
      // unauthenticated hits on refresh or page routing transitions.
      let currentUser = auth.currentUser;
      if (!currentUser) {
        currentUser = await new Promise<any>((resolve) => {
          const unsub = auth.onAuthStateChanged((user) => {
            unsub();
            resolve(user);
          });
          setTimeout(() => {
            unsub();
            resolve(auth.currentUser);
          }, 1500); // 1.5s maximum fallback timeout
        });
      }

      if (!currentUser) {
        console.warn(`Bypassing getCachedProfile for UID: ${uid} because the auth session is unauthenticated.`);
        return null;
      }

      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        profileCache[uid] = data;
        return data;
      }
      return null;
    } catch (e) {
      console.error(`Error fetching profile for ${uid}:`, e);
      return null;
    } finally {
      delete pendingPromises[uid];
    }
  })();

  return pendingPromises[uid];
}

/**
 * Subscribes to a user profile with shared memory state.
 * Only one listener per UID across the whole app.
 */
export function subscribeToProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  // If we already have a value, call back immediately
  if (profileCache[uid]) {
    callback(profileCache[uid]);
  }
  
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      profileCache[uid] = data;
      callback(data);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn(`Profile subscription error for ${uid}:`, err);
    callback(null);
  });
}
