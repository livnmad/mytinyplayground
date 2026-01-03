import React from 'react';
import './css/home.css';

const Home: React.FC = () => {
  const go = (path: string) => {
    try {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
  };

  return (
    <div className="home">
      <div className="home-title">My Tiny Playground</div>
      <p className="home-subtitle">Small hands, big smiles. <span className="home-subaccent">Paint, match, and play!</span></p>
      <div className="home-grid" aria-label="Game choices">
        <button className="home-card paint-card" onClick={() => go('/paint')} title="Paint">
          <div className="icon" aria-hidden>🎨</div>
          <div className="label">Paint</div>
        </button>
        <button className="home-card memory-card" onClick={() => go('/memory')} title="Memory">
          <div className="icon" aria-hidden>🧠</div>
          <div className="label">Memory</div>
        </button>
      </div>
    </div>
  );
};

export default Home;
