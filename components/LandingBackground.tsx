
import React, { useMemo, useEffect } from 'react';

export const MouseGlow: React.FC = () => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isDesktop = window.innerWidth >= 1024;
      const zoomFactor = isDesktop ? 0.90 : 1;
      requestAnimationFrame(() => {
        const x = e.clientX / zoomFactor;
        const y = e.clientY / zoomFactor;
        document.documentElement.style.setProperty('--mouse-x', `${x}px`);
        document.documentElement.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  return <div className="mouse-glow" />;
};

export const TechMeteorShower: React.FC = () => {
  const meteors = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${2.5 + Math.random() * 3}s`,
    }));
  }, []);
  return (
    <div className="meteor-container">
      {meteors.map((m) => (
        <div 
          key={m.id} 
          className="tech-meteor"
          style={{
            left: m.left,
            animation: `tech-shoot-up ${m.duration} ease-out ${m.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
};

export const ModernWaves: React.FC = () => {
  return (
    <div className="waves-container">
      <div className="wave-layer animate-wave-slow bob-slow opacity-20">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path className="wave-line" stroke="#D4AF37" d="M0,160 C320,300 420,10 720,160 C1020,310 1120,20 1440,160 C1760,300 1860,10 2160,160 C2460,310 2560,20 2880,160"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-mid bob-mid opacity-10">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path className="wave-line" stroke="#FFFFFF" d="M0,192 C240,120 480,240 720,192 C960,144 1200,240 1440,192 C1680,120 1920,240 2160,192 C2400,144 2640,240 2880,192"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-slow bob-slow opacity-30">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#7A0B3D" fillOpacity="1" d="M0,160 L120,170.7 C240,181,480,203,720,202.7 C960,203,1200,181,1320,170.7 L1440,160 L1560,170.7 C1680,181,1920,203,2160,202.7 C2400,203,2640,181,2760,170.7 L2880,160 V320 H0 Z"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-mid bob-mid opacity-20" style={{ marginBottom: '2px' }}>
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#D4AF37" fillOpacity="1" d="M0,224 L120,213.3 C240,203,480,181,720,181.3 C960,181,1200,203,1320,213.3 L1440,224 L1560,213.3 C1680,203,1920,181,2160,181.3 C2400,203,2640,181,2760,213.3 L2880,224 V320 H0 Z"></path>
        </svg>
      </div>
      <div className="wave-layer animate-wave-fast bob-fast opacity-50">
        <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="wave-svg">
          <path fill="#630330" fillOpacity="1" d="M0,288 L120,277.3 C240,267,480,245,720,245.3 C960,245,1200,267,1320,277.3 L1440,288 L1560,277.3 C1680,267,1920,245,2160,245.3 C2400,245,2640,267,2760,277.3 L2880,288 V320 H0 Z"></path>
        </svg>
      </div>
    </div>
  );
};
