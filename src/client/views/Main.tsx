import React from 'react';
import './css/main.css';
import Header from './Header';
import Body from './Body';

const Main: React.FC = () => (
  <div className='main-container'>
    <Header />
    <Body />
  </div>
);

export default Main;