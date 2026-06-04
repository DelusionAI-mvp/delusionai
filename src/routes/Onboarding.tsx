import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate } from '@tanstack/react-router';
import { EmotionalProfile, UserProfile } from '../types';
import { ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';
import { CinematicConnection } from '../components/CinematicConnection';

const QUESTIONS = [
  {
    id: 'age',
    title: 'How old are you?',
    subtitle: "We'll find companions around your age group.",
    multiple: false,
    options: [
      { label: 'Young Adult (18-24)', value: '18-24' },
      { label: 'Adult (25-30)', value: '25-30' },
      { label: 'Adult (31-35)', value: '31-35' },
      { label: 'Adult (36-40)', value: '36-40' },
      { label: 'Adult (41-45)', value: '41-45' },
      { label: 'Older Adult (46-55)', value: '46-55' },
      { label: 'Senior (56+)', value: '56+' },
    ]
  },
  {
    id: 'current_situation',
    title: "What's life like right now?",
    subtitle: "Tell us a bit about your daily life.",
    multiple: true,
    dependsOn: 'age',
    options: (answers: any) => {
      const age = answers.age;
      if (age === '18-24') {
        return [
          { label: 'Work and Dreams', value: 'career' },
          { label: 'Worry about the Future', value: 'anxiety' },
          { label: 'Feeling lonely sometimes', value: 'loneliness' },
          { label: 'School or First Job', value: 'study_work' },
        ];
      }
      if (age === '25-30' || age === '31-35') {
        return [
          { label: 'Too tired from work', value: 'burnout' },
          { label: 'Stress at work', value: 'work' },
          { label: 'Love and friendships', value: 'relationships' },
          { label: 'Looking for a calm life', value: 'stability' },
        ];
      }
      if (age === '36-40' || age === '41-45') {
        return [
          { label: 'Family life', value: 'family' },
          { label: 'Thinking about my life', value: 'reflection' },
          { label: 'Dealing with stress', value: 'stress' },
          { label: 'Growing in my job', value: 'peak' },
        ];
      }
      if (age === '46-55' || age === '56+') {
        return [
          { label: 'Good health', value: 'health' },
          { label: 'Helping my family', value: 'family' },
          { label: 'Finding what matters', value: 'purpose' },
          { label: 'Feeling lonely', value: 'lonely' },
        ];
      }
      return [
        { label: 'Feeling stressed', value: 'stress' },
        { label: 'Finding what is important', value: 'meaning' },
        { label: 'Easy and calm life', value: 'balance' },
        { label: 'Family and work life', value: 'family_career' },
      ];
    }
  },
  
{
  id: 'personality',
  title: 'How do you talk with people?',
  subtitle: 'Choose what sounds like you.',
  multiple: true,
  options: [
    { label: 'I listen more', value: 'listener' },
    { label: 'I think before talking', value: 'thinker' },
    { label: 'I like helping people', value: 'supporter' },
    { label: 'I talk about my feelings', value: 'sharer' },
  ]
},
{
  id: 'interests',
  title: 'What makes you feel better?',
  subtitle: 'Choose the things you like.',
  multiple: true,
  options: [
    { label: 'Music, drawing, or writing', value: 'arts' },
    { label: 'Going outside', value: 'nature' },
    { label: 'Being alone for some time', value: 'solitude' },
    { label: 'Talking deeply with someone', value: 'talks' },
    { label: 'Exercise or walking', value: 'exercise' },
  ]
},
{
  id: 'why_here',
  title: 'Why are you here?',
  subtitle: 'What do you want here?',
  multiple: true,
  options: [
    { label: 'I want someone to talk to', value: 'expression' },
    { label: 'I want good friends', value: 'connection' },
    { label: 'I want help from AI', value: 'ai_support' },
    { label: 'I want to help others', value: 'altruism' },
  ]
},
{
  id: 'struggles',
  title: 'What is bothering you?',
  subtitle: 'Pick what feels true for you.',
  multiple: true,
  options: [
    { label: 'Problems with family or friends', value: 'relationships' },
    { label: 'Stress from work or school', value: 'work' },
    { label: 'Feeling down', value: 'existential' },
    { label: 'Health issues', value: 'health' },
    { label: 'Feeling lonely', value: 'lonely' },
  ]
},
{
  id: 'comfort',
  title: 'What helps you most when you feel bad?',
  subtitle: 'Choose what comforts you.',
  multiple: true,
  options: [
    { label: 'Talking to someone', value: 'talking' },
    { label: 'Listening to music', value: 'music' },
    { label: 'Being alone quietly', value: 'quiet' },
    { label: 'Going outside', value: 'outside' },
    { label: 'Sleeping or resting', value: 'rest' },
  ]
}
];

export default function Onboarding() {
  const { user, profile, setProfile, triggerBordeaux } = useAuth();
  
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveTask, setSaveTask] = useState<Promise<void> | null>(null);
  const navigate = useNavigate();

  const currentQ = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  // Get options even if they are a function based on previous answers
  const options = typeof currentQ.options === 'function' 
    ? currentQ.options(answers)
    : currentQ.options;

  useEffect(() => {
    if (profile?.onboarded && !isProcessing && window.location.pathname === '/onboarding') {
      navigate({ to: '/dashboard', replace: true });
    }
  }, [profile?.onboarded, isProcessing, navigate]);

  const handleSelect = (value: any) => {
    if (currentQ.multiple) {
      const current = answers[currentQ.id] || [];
      if (current.includes(value)) {
        setAnswers({ ...answers, [currentQ.id]: current.filter((v: any) => v !== value) });
      } else {
        setAnswers({ ...answers, [currentQ.id]: [...current, value] });
      }
    } else {
      setAnswers({ ...answers, [currentQ.id]: value });
    }
  };


  const nextStep = async () => {
    if (isLast) {
      setIsProcessing(true);
      const task = saveProfile();
      setSaveTask(task);
      
      if (triggerBordeaux) {
        triggerBordeaux(
          () => {
            // At 0.9s meet center: covered in velvet, navigate to /dashboard immediately so it is pre-loaded
            navigate({ to: '/dashboard', replace: true });
          },
          async () => {
            // At 1.8s complete: transition peeled away, make sure save is finished
            if (task) {
              try {
                await task;
              } catch (e) {
                console.error("Profile save error during transition:", e);
              }
            }
            setIsProcessing(false);
          },
          true // forceOnMobile: true
        );
      } else {
        await task;
        setIsProcessing(false);
        navigate({ to: '/dashboard', replace: true });
      }
    } else {
      setStep(step + 1);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    // Generate internal profile logic
    const moodValues = Array.isArray(answers.mood) ? answers.mood : [answers.mood || 50];
    const avgMood = moodValues.reduce((a: number, b: number) => a + b, 0) / moodValues.length;

    const emotionalProfile: EmotionalProfile = {
      moodBaseline: avgMood,
      moodKeywords: answers.struggles || [],
      communicationStyle: (answers.personality || []).includes('listener') ? 'listener' : 'balanced',
      needs: Array.isArray(answers.why_here) ? answers.why_here.join(', ') : (answers.why_here || ''),
      traits: answers.personality || [],
      interests: answers.interests || [],
      personalityType: (answers.personality || [])[0] || 'Unknown',
      profileScore: 70 + Math.floor(Math.random() * 25) // Initial baseline
    };

    const userRef = doc(db, 'users', user.uid);
    try {
      const updatedFields = {
        onboarded: true,
        age: answers.age || 'Unknown',
        ageGroup: answers.age || 'Unknown',
        currentSituation: answers.current_situation || [],
        whyJoined: answers.why_here || [],
        interests: answers.interests || [],
        personality: answers.personality || [],
        emotionalProfile,
        recommendationRefreshNeeded: false,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updatedFields);
      console.log("Onboarding successful in Firestore, syncing local state...");
      
      // Sync local state as well
      const localUpdatedProfile: UserProfile = {
        ...(profile || {}),
        ...updatedFields,
        uid: user.uid,
        email: user.email || profile?.email || '',
        displayName: user.displayName || profile?.displayName || 'User',
        photoURL: user.photoURL || profile?.photoURL || '',
        onboarded: true,
        matchRequestCount: profile?.matchRequestCount ?? 0
      };
      setProfile(localUpdatedProfile);
      localStorage.setItem(`delusion_local_profile_${user.uid}`, JSON.stringify(localUpdatedProfile));

      // Prevent redirect race conditions
      sessionStorage.setItem('just_onboarded', 'true');

      // Dispatch Early Access Waitlist Email
      try {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'waitlist_joined',
            recipientEmail: localUpdatedProfile.email,
            recipientName: localUpdatedProfile.displayName
          })
        });
      } catch (mailErr) {
        console.warn("Waitlist mail failed on success save:", mailErr);
      }
    } catch (e) {
      console.warn("Onboarding save failed in Firestore, applying client-side fallback/recovery:", e);
      
      const fallbackFields = {
        onboarded: true,
        age: answers.age || 'Unknown',
        ageGroup: answers.age || 'Unknown',
        currentSituation: answers.current_situation || [],
        whyJoined: answers.why_here || [],
        interests: answers.interests || [],
        personality: answers.personality || [],
        emotionalProfile,
        recommendationRefreshNeeded: false,
        updatedAt: new Date().toISOString()
      };

      const fallbackProfile: UserProfile = {
        ...(profile || {}),
        ...fallbackFields,
        uid: user.uid,
        email: user.email || profile?.email || '',
        displayName: user.displayName || profile?.displayName || 'User',
        photoURL: user.photoURL || profile?.photoURL || '',
        onboarded: true,
        matchRequestCount: profile?.matchRequestCount ?? 0
      };

      setProfile(fallbackProfile);
      localStorage.setItem(`delusion_local_profile_${user.uid}`, JSON.stringify(fallbackProfile));
      
      // Prevent redirect race conditions
      sessionStorage.setItem('just_onboarded', 'true');

      // Dispatch Early Access Waitlist Email
      try {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'waitlist_joined',
            recipientEmail: fallbackProfile.email,
            recipientName: fallbackProfile.displayName
          })
        });
      } catch (mailErr) {
        console.warn("Waitlist mail failed on rollback save:", mailErr);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-bg-base min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div 
          key="survey-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="w-full max-w-3xl space-y-20 flex flex-col justify-center"
        >
            {/* Progress indicators - Sleek CRED line style */}
            <div className="flex gap-4">
              {QUESTIONS.map((_, i) => (
                <div 
                  key={i} 
                  className="h-[2px] flex-1 bg-brand-primary/10 relative"
                >
                  <motion.div 
                    animate={{ width: i <= step ? '100%' : '0%' }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    className={`h-full bg-brand-primary ${i <= step ? 'shadow-[0_0_10px_var(--color-brand-primary)]' : ''}`}
                  />
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8 md:space-y-12"
              >
                <div className="space-y-4 text-center">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-2 md:mb-4"
                  >
                    {user?.providerData[0]?.providerId === 'google.com' && step === 0 ? 'CONNECTING ACCOUNT' : `Step ${step + 1}`}
                  </motion.div>
                  <h1 className="text-3xl sm:text-5xl md:text-7xl font-display font-black tracking-tight uppercase italic text-text-base leading-[0.9]">
                    {user?.providerData[0]?.providerId === 'google.com' && step === 0 ? 'Check your age group' : currentQ.title}
                  </h1>
                  <p className="text-sm md:text-lg text-text-muted font-bold uppercase tracking-[0.2em] px-4">
                    {user?.providerData[0]?.providerId === 'google.com' && step === 0 ? 'We found some details from Google. Please pick the best match.' : currentQ.subtitle}
                  </p>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {options.map((opt: any) => {
                    const isSelected = currentQ.multiple 
                      ? answers[currentQ.id]?.includes(opt.value)
                      : answers[currentQ.id] === opt.value;
                    
                    return (
                      <button 
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        className={`
                          p-6 md:p-10 text-left transition-all duration-500 group relative overflow-hidden
                          ${isSelected 
                            ? 'cred-elevation border-brand-primary !bg-brand-primary/5' 
                            : 'cred-inset hover:border-brand-primary/10'}
                        `}
                      >
                        <div className="relative z-10 flex items-center justify-between">
                          <span className={`text-base md:text-lg font-black uppercase tracking-widest italic transition-colors ${isSelected ? 'text-brand-primary' : 'text-zinc-400 group-hover:text-text-base'}`}>
                            {opt.label}
                          </span>
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-8 h-8 cred-elevation flex items-center justify-center text-brand-primary border-brand-primary/20"
                            >
                              <Check size={18} />
                            </motion.div>
                          )}
                        </div>

                        {isSelected && (
                          <motion.div 
                            layoutId="active-bg"
                            className="absolute inset-0 bg-brand-primary/5 -z-10"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-8 md:gap-12 pt-12">
              <button 
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
                className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-brand-primary transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <ChevronLeft size={20} /> Go Back
              </button>
              
              <button 
                disabled={isProcessing || (currentQ.multiple ? !(answers[currentQ.id]?.length > 0) : !answers[currentQ.id])}
                onClick={nextStep}
                className={`
                  btn-primary w-full sm:w-auto px-16 py-6 flex items-center justify-center gap-4
                  ${(isProcessing || (currentQ.multiple ? !(answers[currentQ.id]?.length > 0) : !answers[currentQ.id])) ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                `}
              >
                {isLast ? (
                  <>
                    <Sparkles size={20} /> Finish
                  </>
                ) : (
                  <>
                    Continue <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
