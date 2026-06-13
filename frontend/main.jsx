import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../assets/css/style.css';

createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
