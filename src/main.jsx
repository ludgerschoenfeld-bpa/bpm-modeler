import React from 'react';
import { createRoot } from 'react-dom/client';
import { configurePlugins } from './plugins/configure.js';
import App from './App.jsx';
import './style.css';
// Compose plugins before any screen resolves a business port.
configurePlugins();
createRoot(document.getElementById('root')).render(<App />);
