import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';

interface CinematicConnectionProps {
  isVisible: boolean;
  type?: 'profile' | 'match';
  onComplete?: () => void;
  userPhoto?: string;
  matchPhoto?: string;
  userName?: string;
  matchName?: string;
}

export const CinematicConnection: React.FC<CinematicConnectionProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Reset pill state immediately
    if (pillRef.current) {
      gsap.killTweensOf(pillRef.current);
    }

    const ctx = gsap.context(() => {
      const pill = pillRef.current;
      if (!pill) return;

      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });

      // Starts below the screen, floats to center, holds, then exits to the top
      tl.fromTo(pill,
        {
          y: '100vh',
          opacity: 1,
        },
        {
          y: '0vh',
          opacity: 1,
          duration: 1.6,
          ease: 'power3.out',
        }
      )
      .to(pill, {
        duration: 2.2, // Hold still beautifully in center
      })
      .to(pill, {
        y: '-100vh',
        opacity: 0,
        duration: 1.6,
        ease: 'power3.in',
      });
    });

    return () => {
      ctx.revert();
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F5F0E8] select-none overflow-hidden"
      >
        <div 
          ref={pillRef}
          className="px-10 py-4 shadow-[0_16px_48px_rgba(61,13,28,0.18)]"
          style={{
            backgroundColor: '#3D0D1C',
            borderRadius: '999px',
            border: '1px solid rgba(201, 168, 76, 0.2)',
          }}
        >
          <span 
            className="select-none tracking-[0.06em] block"
            style={{
              fontFamily: 'Georgia, serif',
              color: '#C9A84C',
              fontSize: '1.25rem',
              fontWeight: '500',
              lineHeight: '1',
              textTransform: 'lowercase',
            }}
          >
            connected
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
