import React from 'react';
// @ts-ignore
import logoUrl from '../assets/images/delusion-logo.png';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 70 }) => {
  return (
    <div 
      className={`relative overflow-hidden rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Soft background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={logoUrl}
          alt=""
          className="
            w-full h-full
            object-cover
            scale-[2.1]
            opacity-20
            blur-xl
            pointer-events-none
            select-none
            mix-blend-multiply
          "
        />
      </div>

      {/* Main logo */}
      <img
        src={logoUrl}
        alt="DelusionAI Logo"
        className="
          relative z-10
          w-full h-full
          object-cover
          scale-[1.3]
          pointer-events-none
          select-none
          mix-blend-multiply
        "
      />

      {/* Golden circle border */}
      <div className="absolute inset-0 rounded-full border-1 border-brand-accent pointer-events-none z-20" />
    </div>
  );
};
