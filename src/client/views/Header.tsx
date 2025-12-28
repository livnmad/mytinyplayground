import React from 'react';
import Nav from './Nav';
import './css/header.css';

const Header: React.FC = () => {
  const text = 'My Tiny Playground';
  let letterIndex = 0;
  const nodes = text.split('').map((ch, i) => {
    if (ch === ' ') {
      return (
        <span key={`space-${i}`} className="space">
          {' '}
        </span>
      );
    }
    const cased = letterIndex % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase();
    const colorClass = `c${letterIndex % 6}`;
    letterIndex += 1;
    return (
      <span key={`char-${i}`} className={`letter ${colorClass}`}>
        {cased}
      </span>
    );
  });

  return (
    <div className="header">
      <Nav />
    </div>
  );
};

export default Header;