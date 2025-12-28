import React, { useEffect, useState, PropsWithChildren } from 'react';
import './css/orientation.css';

function isPortrait(): boolean {
  const mq = window.matchMedia('(orientation: portrait)');
  return mq.matches || window.innerHeight > window.innerWidth;
}

function isNarrowPhone(): boolean {
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  return minSide <= 800; // treat typical phones/tablets in portrait as narrow
}

const LandscapeGate: React.FC<PropsWithChildren> = ({ children }) => {
  const [blocked, setBlocked] = useState<boolean>(isPortrait() && isNarrowPhone());

  useEffect(() => {
    const onResize = () => setBlocked(isPortrait() && isNarrowPhone());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  

  if (blocked) {
    return (
      <div className="orientation-block">
        <div className="orientation-block__card">
          <div className="orientation-block__emoji">📱➡️📺</div>
          <h1 className="orientation-block__title">Please rotate your device</h1>
          <p className="orientation-block__text">
            This app is best experienced in landscape on smaller screens.
          </p>
          
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LandscapeGate;
