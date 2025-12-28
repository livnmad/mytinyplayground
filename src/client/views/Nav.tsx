import React from 'react';
import './css/nav.css';

const Nav: React.FC = () => (
  <nav className="nav" aria-label="Primary">
    <ul className="pill-menu">
      <li>
        <span
          className="pill p3"
          onClick={() => {
            try {
              window.location.hash = '/home';
            } catch {}
          }}
        >
        Home
        </span>
      </li>
      <li>
        <span
          className="pill p0"
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent('image:new'));
            } catch {}
          }}
        >
          Next
        </span>
      </li>
      <li>
        <span
          className="pill p1"
          onClick={() => {
            try {
              // Request confirmation before clearing
              window.dispatchEvent(new CustomEvent('canvas:request-clear'));
            } catch {}
          }}
        >
          Clear
        </span>
      </li>
    </ul>
  </nav>
);

export default Nav;