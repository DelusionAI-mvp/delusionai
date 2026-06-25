import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface BordeauxTransitionProps {
  onMeetCenter: () => void;
  onComplete: () => void;
}

export const BordeauxTransition: React.FC<BordeauxTransitionProps> = ({
  onMeetCenter,
  onComplete,
}) => {
  useEffect(() => {
    // Both lines meet in the center at exactly 0.9s (halfway through 1.8s duration)
    const meetTimer = setTimeout(() => {
      onMeetCenter();
    }, 900);

    // Transition completely exits at 1.8s
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(meetTimer);
      clearTimeout(completeTimer);
    };
  }, [onMeetCenter, onComplete]);

  // Cubic bezier for a smooth, organic velvet ease-in-out motion
  const easeVelvet = [0.76, 0, 0.24, 1] as const;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto w-screen h-screen overflow-hidden">
      {/* Top half bordeaux paint block */}
      <motion.div
        initial={{ height: '0%' }}
        animate={{ height: ['0%', '50.5%', '0%'] }}
        transition={{
          duration: 1.8,
          times: [0, 0.5, 1],
          ease: easeVelvet,
        }}
        className="absolute top-0 left-0 w-full bg-[#5C0120] origin-top flex flex-col justify-end"
      >
        {/* Shimmering Rose-Crimson Leading Line */}
        <div className="w-full h-[4px] relative bg-[#5C0120] shadow-[0_4px_20px_rgba(192,57,90,0.6)]">
          {/* Shimmer Highlight running along the center */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#5C0120] via-[#C0395A] to-[#5C0120]" />
          {/* Subtle center core glow line */}
          <div className="absolute top-[1px] bottom-[1px] left-0 w-full bg-[#ff6a88]/30 blur-[1px]" />
        </div>
      </motion.div>

      {/* Bottom half bordeaux paint block */}
      <motion.div
        initial={{ height: '0%' }}
        animate={{ height: ['0%', '50.5%', '0%'] }}
        transition={{
          duration: 1.8,
          times: [0, 0.5, 1],
          ease: easeVelvet,
        }}
        className="absolute bottom-0 left-0 w-full bg-[#5C0120] origin-bottom flex flex-col justify-start"
      >
        {/* Shimmering Rose-Crimson Leading Line */}
        <div className="w-full h-[4px] relative bg-[#5C0120] shadow-[0_-4px_20px_rgba(192,57,90,0.6)]">
          {/* Shimmer Highlight running along the center */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#5C0120] via-[#C0395A] to-[#5C0120]" />
          {/* Subtle center core glow line */}
          <div className="absolute top-[1px] bottom-[1px] left-0 w-full bg-[#ff6a88]/30 blur-[1px]" />
        </div>
      </motion.div>
    </div>
  );
};
