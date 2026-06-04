import React from 'react';

export const Starfield: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 w-full h-full -z-10 bg-[#F5EFE6] pointer-events-none"
      style={{ isolation: 'isolate' }}
    />
  );
};
