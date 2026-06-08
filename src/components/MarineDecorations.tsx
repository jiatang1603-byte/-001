import React from 'react';

export const WavesDivider: React.FC = () => {
  return (
    <div className="relative w-full h-8 overflow-hidden select-none pointer-events-none">
      <div className="absolute inset-0 bg-sky-100/40 opacity-50">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-sky-200">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.3,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V0Z" opacity=".25"></path>
          <path d="M0,0V15.81c13,0,28.66,4.1,42.92,10.25,24.3,10.5,49.1,21.84,77.88,23.3,31.7,1.6,60.6-8.5,88.7-18.4,25.1-8.9,47.8-17.7,73.1-18.2,26.7-.5,51.4,7.4,76.5,14,28.6,7.5,57.1,14.6,89,12.5,29.8-2,55.9-12.7,81.1-23.3,24.2-10.2,46.1-19.1,70.9-18.5,25.7.6,48.1,9.8,71.5,17,29.9,9.2,60.2,16.2,93,12.2,30.3-3.7,56.1-16.7,81-28.7a184.66,184.66,0,0,1,104.3-15.6V0Z" opacity=".5"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
        </svg>
      </div>
    </div>
  );
};

export const FloatingBubble: React.FC<{ size?: number; delay?: number; left: string; duration?: number }> = ({
  size = 12,
  delay = 0,
  left,
  duration = 8
}) => {
  return (
    <div
      className="absolute bottom-[-20px] rounded-full border border-sky-300/40 bg-sky-200/10 backdrop-blur-[1px] select-none pointer-events-none animate-bubble"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: left,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
};

export const SwimmingFish: React.FC<{ color?: string; type?: 'fish' | 'shrimp' | 'squid'; left?: boolean; delay?: number }> = ({
  color = 'text-cyan-400',
  type = 'fish',
  left = false,
  delay = 0
}) => {
  const rotation = left ? 'scale-x-[-1]' : '';
  
  return (
    <div 
      className={`absolute opacity-25 select-none pointer-events-none animate-swim ${rotation}`}
      style={{
        animationDelay: `${delay}s`,
        top: `${30 + Math.random() * 50}%`
      }}
    >
      {type === 'fish' && (
        <svg width="48" height="32" viewBox="0 0 48 32" className={`fill-current ${color}`}>
          <path d="M4,16 C12,4 28,4 36,12 L44,4 L44,28 L36,20 C28,28 12,28 4,16 Z" />
          <circle cx="12" cy="12" r="2" className="fill-white" />
        </svg>
      )}
      
      {type === 'shrimp' && (
        <svg width="36" height="24" viewBox="0 0 36 24" className={`fill-current ${color}`}>
          <path d="M2,16 C6,10 16,4 28,8 C24,10 20,13 18,15 C24,14 30,16 34,22 C26,20 20,20 16,22 C14,18 10,18 6,22 C4,19 3,18 2,16 Z" />
          <path d="M28,8 C30,7 34,4 36,2 M28,8 C32,9 35,8 36,6" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      )}

      {type === 'squid' && (
        <svg width="32" height="40" viewBox="0 0 32 40" className={`fill-current ${color}`}>
          <path d="M16,2 C8,2 4,10 4,18 C4,22 8,24 16,24 C24,24 28,22 28,18 C28,10 24,2 16,2 Z" />
          <path d="M6,24 L4,38 M10,24 L8,38 M14,24 L14,38 M18,24 L20,38 M22,24 L26,38 L28,34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="10" cy="14" r="1.5" className="fill-white" />
          <circle cx="22" cy="14" r="1.5" className="fill-white" />
        </svg>
      )}
    </div>
  );
};

export const OceanBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-50 via-cyan-50/50 to-teal-50/40 select-none pointer-events-none -z-10">
      <FloatingBubble size={16} delay={0} left="5%" duration={12} />
      <FloatingBubble size={8} delay={2} left="15%" duration={16} />
      <FloatingBubble size={24} delay={1} left="35%" duration={10} />
      <FloatingBubble size={12} delay={5} left="65%" duration={14} />
      <FloatingBubble size={18} delay={3} left="85%" duration={11} />
      <FloatingBubble size={10} delay={7} left="92%" duration={15} />
      
      <SwimmingFish type="fish" color="text-sky-300" delay={0} />
      <SwimmingFish type="shrimp" color="text-teal-300" delay={4} left={true} />
      <SwimmingFish type="squid" color="text-cyan-300/80" delay={7} />
      <SwimmingFish type="fish" color="text-emerald-300/70" delay={12} left={true} />
    </div>
  );
};
