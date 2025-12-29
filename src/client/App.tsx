import React, { useEffect, useState } from 'react';
import Main from './views/Main';
import Home from './views/Home';
import Memory from './views/Memory';
import LandscapeGate from './views/LandscapeGate';
import './views/css/app.css';

type Route = 'home' | 'paint' | 'memory';

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>('home');

  // Simple pathname-based routing using History API
  useEffect(() => {
    const parse = () => {
      const p = window.location.pathname || '/home';
      if (p.startsWith('/paint')) setRoute('paint');
      else if (p.startsWith('/memory')) setRoute('memory');
      else setRoute('home');
    };
    parse();
    window.addEventListener('popstate', parse);
    return () => window.removeEventListener('popstate', parse);
  }, []);

  const content = route === 'paint' ? <Main /> : route === 'memory' ? <Memory /> : <Home />;
  return <LandscapeGate>{content}</LandscapeGate>;
};

export default App;