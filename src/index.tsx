import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './client/App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

// Disable pinch-zoom and double-tap zoom for stability on mobile
(() => {
  const preventMultiTouch = (e: TouchEvent) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  };
  const preventGesture = (e: Event) => { e.preventDefault(); };
  const preventWheelZoom = (e: WheelEvent) => {
    if (e.ctrlKey) e.preventDefault();
  };
  document.addEventListener('touchstart', preventMultiTouch, { passive: false });
  document.addEventListener('touchmove', preventMultiTouch, { passive: false });
  document.addEventListener('gesturestart', preventGesture as EventListener, { passive: false } as any);
  document.addEventListener('gesturechange', preventGesture as EventListener, { passive: false } as any);
  document.addEventListener('gestureend', preventGesture as EventListener, { passive: false } as any);
  document.addEventListener('wheel', preventWheelZoom, { passive: false });
})();
