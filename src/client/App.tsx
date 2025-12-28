import React, { useEffect, useState } from 'react';
import Main from './views/Main';
import Home from './views/Home';
import Memory from './views/Memory';
import LandscapeGate from './views/LandscapeGate';
import './views/css/app.css';

type Route = 'home' | 'paint' | 'memory';

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>('home');

  // Simple hash-based routing without extra deps
  useEffect(() => {
    const parse = () => {
      const h = window.location.hash.replace('#', '') || '/home';
      if (h.startsWith('/paint')) setRoute('paint');
      else if (h.startsWith('/memory')) setRoute('memory');
      else setRoute('home');
    };
    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  const content = route === 'paint' ? <Main /> : route === 'memory' ? <Memory /> : <Home />;
  return <LandscapeGate>{content}</LandscapeGate>;
};

export default App;